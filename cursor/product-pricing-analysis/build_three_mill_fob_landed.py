#!/usr/bin/env python3
"""Nine-column Palconn / Tommur / Zhenpeng FOB + landed vs APBS sell. Internal."""

from __future__ import annotations

import csv
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE / "palconn"))
from build_palconn_quote_compare import (  # noqa: E402
    CBM_40,
    DUTY,
    OCEAN,
    QUOTE_10,
    QUOTE_8,
    ZHENPENG,
    canon_size,
    load_quote,
    num,
    ocean_per_unit,
)

FACTORY = ROOT / "cursor" / "product-pricing-analysis" / "Factory_Order_PVC_PEX_45HQ.csv"
SITE = ROOT / "assets" / "products.csv"
OUT_XLSX = ROOT / "cursor" / "product-pricing-analysis" / "Three_Mill_FOB_Landed.xlsx"
OUT_CSV = ROOT / "cursor" / "product-pricing-analysis" / "Three_Mill_FOB_Landed.csv"

CBM_45HQ = 86.0
# Zhenpeng REV pallet 2.3 CBM / 55,100 pcs riding a Tommur 45'HQ at $10k.
ZHEN_OCEAN_PC = OCEAN * 2.3 / CBM_45HQ / 55_100

HEADER = PatternFill("solid", fgColor="C00000")
WHITE = Font(bold=True, color="FFFFFF", name="Calibri", size=11)
GREEN = PatternFill("solid", fgColor="C6EFCE")
WRAP = Alignment(wrap_text=True, vertical="center")
THIN = Border(
    left=Side(style="thin", color="B0B0B0"),
    right=Side(style="thin", color="B0B0B0"),
    top=Side(style="thin", color="B0B0B0"),
    bottom=Side(style="thin", color="B0B0B0"),
)

# Exact nine columns the buyer asked for.
COLS = [
    ("item", "APBS item", 48),
    ("size", "Size", 18),
    ("pal_fob", "Palconn FOB", 14),
    ("tom_fob", "Tommur FOB", 14),
    ("zhen_fob", "Zhenpeng FOB", 14),
    ("pal_landed", "Palconn est landed", 18),
    ("tom_landed", "Tommur DDP / est landed", 22),
    ("zhen_landed", "Zhenpeng est landed", 18),
    ("apbs_sell", "APBS selling price", 16),
]


def fmt_size(raw) -> str:
    s = str(raw or "").strip()
    if not s:
        return ""
    if '"' in s or "″" in s:
        return s.replace("″", '"')
    c = canon_size(s)
    if not c:
        return s
    if "x" in c:
        return '" x '.join(c.split("x")) + '"'
    return c + '"'


def item_label(code, desc, unit=None) -> str:
    code = (code or "").strip()
    desc = (desc or "").strip()
    extra = ""
    dlow = desc.lower()
    if unit == "20 ft stick" or "20 ft stick" in dlow:
        extra = " (20 ft stick)"
    elif "100 ft coil" in dlow:
        extra = " (100 ft coil)"
    if code and desc:
        base = f"{code} — {desc}"
    else:
        base = code or desc
    if extra and extra.strip(" ()") not in dlow:
        return base + extra
    return base


def palconn_landed(row) -> float | None:
    fob = row.get("fob")
    if fob is None:
        return None
    ocean = ocean_per_unit(row) or 0.0
    return round(fob * DUTY + ocean, 4)


def load_tommur() -> dict:
    out = {}
    with FACTORY.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            code = (r.get("APBS_Code") or "").strip()
            size = canon_size(r.get("Size") or "")
            if not code:
                continue
            desc = (r.get("Description") or "").strip()
            rec = {
                "code": code,
                "desc": desc,
                "size_raw": r.get("Size"),
                "unit": (r.get("Unit") or "").strip(),
                "fob": num(r.get("FOB_USD")),
                "ddp": num(r.get("DDP_USD")),
                "est": num(r.get("Est_Landed_45HQ_USD")),
            }
            rec["landed"] = rec["ddp"] if rec["ddp"] is not None else rec["est"]
            k = (code, size)
            prev = out.get(k)
            if prev is None:
                out[k] = rec
                continue
            # Prefer the row that has FOB; keep DDP/est from either.
            if rec["fob"] is not None and prev["fob"] is None:
                rec["ddp"] = rec["ddp"] if rec["ddp"] is not None else prev["ddp"]
                rec["est"] = rec["est"] if rec["est"] is not None else prev["est"]
                rec["landed"] = rec["ddp"] if rec["ddp"] is not None else rec["est"]
                out[k] = rec
            else:
                if prev["fob"] is None and rec["fob"] is not None:
                    prev["fob"] = rec["fob"]
                if prev["ddp"] is None:
                    prev["ddp"] = rec["ddp"]
                if prev["est"] is None:
                    prev["est"] = rec["est"]
                prev["landed"] = prev["ddp"] if prev["ddp"] is not None else prev["est"]
    return out


def load_site() -> dict:
    prices = {}
    meta = {}
    with SITE.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            code = (r.get("Code") or "").strip()
            size = canon_size(r.get("Size") or "")
            if not code:
                continue
            p = num(r.get("Price"))
            prices[(code, size)] = p
            meta[(code, size)] = {
                "desc": (r.get("Description") or "").strip(),
                "material": (r.get("Material") or "").strip(),
            }
    return prices, meta


def palconn_map() -> dict:
    """10 Sep wins; 8 Sep fills DWV (and any other) FOB she later omitted."""
    m = {}
    for src, recs in (("8", load_quote(QUOTE_8)), ("10", load_quote(QUOTE_10))):
        for r in recs:
            code = (r.get("code") or "").strip()
            size = canon_size(r.get("size"))
            desc = r.get("desc") or ""
            variant = ""
            if "100 ft coil" in str(desc).lower():
                variant = "coil"
            elif "20 ft stick" in str(desc).lower() or r.get("unit") == "20 ft stick":
                variant = "stick"
            k = (code, size, variant)
            if src == "8" and k in m and m[k].get("fob") is not None:
                continue
            if src == "10" or r.get("fob") is not None or k not in m:
                row = dict(r)
                row["_variant"] = variant
                m[k] = row
    return m


def zhen_landed(fob: float | None) -> float | None:
    if fob is None:
        return None
    return round(fob * DUTY + ZHEN_OCEAN_PC, 4)


def family_of(code: str, pal_family: str | None) -> str:
    if pal_family:
        return pal_family
    if code.startswith("PEX-F1807") or code in ("PEX-WMBOX", "PEX-WMBOX-WHA", "PEX-ICEBOX"):
        return "PEX F1807 / boxes"
    if code.startswith("PEX"):
        return "PEX"
    if code.startswith("PVC-PIPE"):
        return "PVC pipe"
    if code.startswith("CPVC"):
        return "CPVC"
    return "PVC DWV"


def build_rows() -> list[dict]:
    pal = palconn_map()
    tom = load_tommur()
    site, site_meta = load_site()

    pal_sizes = {(c, s) for (c, s, _v) in pal}
    keys = set(pal.keys())
    for code, size in list(tom) + list(ZHENPENG):
        if (code, size) not in pal_sizes:
            keys.add((code, size, ""))
    for code, size in site:
        if not (code.startswith(("PVC-", "PEX-", "CPVC-")) or code == "PEX-B PIPE"):
            continue
        if (code, size) not in pal_sizes:
            keys.add((code, size, ""))

    rows = []
    for code, size, variant in sorted(keys, key=lambda x: (x[0], x[1], x[2])):
        pr = pal.get((code, size, variant))
        if pr is None and variant == "":
            pr = pal.get((code, size, "stick")) or pal.get((code, size, "coil"))
        tr = tom.get((code, size), {})
        sell = site.get((code, size))
        meta = site_meta.get((code, size), {})

        pal_fob = pr.get("fob") if pr else None
        pal_l = palconn_landed(pr) if pr else None
        tom_fob = tr.get("fob")
        tom_l = tr.get("landed")
        zhen_fob = ZHENPENG.get((code, size))
        zhen_l = zhen_landed(zhen_fob)

        if all(v is None for v in (pal_fob, tom_fob, zhen_fob, pal_l, tom_l, zhen_l, sell)):
            continue
        # Skip site-only copper/etc. already filtered; skip site-only with no mill.
        if pal_fob is None and tom_fob is None and zhen_fob is None and pal_l is None and tom_l is None:
            continue

        desc = (
            (pr or {}).get("desc")
            or tr.get("desc")
            or meta.get("desc")
            or ""
        )
        unit = (pr or {}).get("unit") or tr.get("unit")
        size_disp = fmt_size((pr or {}).get("size") or tr.get("size_raw") or size)
        item = item_label(code, desc, unit)

        rows.append(
            {
                "family": family_of(code, (pr or {}).get("family")),
                "code": code,
                "item": item,
                "size": size_disp,
                "pal_fob": pal_fob,
                "tom_fob": tom_fob,
                "zhen_fob": zhen_fob,
                "pal_landed": pal_l,
                "tom_landed": tom_l,
                "zhen_landed": zhen_l,
                "apbs_sell": sell,
            }
        )

    # Stable: family, code, size, item (stick before coil)
    order = {
        "PEX-B pipe": 0,
        "PEX": 1,
        "PEX F2159 PPSU": 2,
        "PEX F1807 brass": 3,
        "PEX F1807 / boxes": 3,
        "PEX outlet boxes": 4,
        "PVC Sch40 pipe": 5,
        "PVC foam-core pipe": 6,
        "PVC pipe": 5,
        "PVC DWV fittings": 7,
        "PVC DWV": 7,
        "CPVC": 8,
    }
    rows.sort(key=lambda r: (order.get(r["family"], 9), r["code"], r["size"], r["item"]))
    return rows


def cheapest(vals):
    nums = [v for v in vals if isinstance(v, (int, float))]
    if not nums:
        return None
    return min(nums)


def write_xlsx(rows):
    wb = Workbook()
    ws = wb.active
    ws.title = "Three mills"
    for i, (_, title, width) in enumerate(COLS, 1):
        c = ws.cell(1, i, title)
        c.fill = HEADER
        c.font = WHITE
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        ws.column_dimensions[get_column_letter(i)].width = width
    ws.row_dimensions[1].height = 32
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = f"A1:{get_column_letter(len(COLS))}{len(rows)+1}"

    for ri, row in enumerate(rows, 2):
        fob_min = cheapest([row["pal_fob"], row["tom_fob"], row["zhen_fob"]])
        for ci, (k, _, _) in enumerate(COLS, 1):
            v = row.get(k)
            cell = ws.cell(ri, ci, v)
            cell.alignment = WRAP
            cell.border = THIN
            cell.font = Font(name="Calibri", size=10)
            if k in (
                "pal_fob",
                "tom_fob",
                "zhen_fob",
                "pal_landed",
                "tom_landed",
                "zhen_landed",
                "apbs_sell",
            ) and isinstance(v, (int, float)):
                cell.number_format = "0.00" if abs(v) >= 1 else "0.0000"
                if k.endswith("_fob") and fob_min is not None and abs(v - fob_min) < 1e-9:
                    cell.fill = GREEN
        ws.row_dimensions[ri].height = 22

    notes = wb.create_sheet("Notes")
    lines = [
        "INTERNAL — do not forward to any mill.",
        "",
        "Nine columns: APBS item, Size, Palconn/Tommur/Zhenpeng FOB, Palconn/Tommur/Zhenpeng DDP or est landed, APBS selling price.",
        "Blank = that mill did not quote this SKU (or no site price).",
        "Green = lowest FOB among mills that quoted that row. Landed is not highlighted: Tommur DDP is mill DDP (often near FOB); Palconn/Zhenpeng are US est landed (FOB × 1.43 + $10k ocean).",
        "",
        "Palconn FOB = 10 Sep sheet; 8 Sep FOB kept on DWV she dropped off the 10 Sep return.",
        "Palconn est landed = FOB × 1.43 + $10,000 / 67.7 CBM × CBM per selling unit.",
        "Tommur FOB = Factory_Order_PVC_PEX_45HQ yellow FOB. Tommur landed = mill DDP if present, else Est_Landed_45HQ ($10k/45HQ).",
        "Zhenpeng FOB = 5 Sep 2026 REV PI. Est landed = FOB × 1.43 + $10,000 × 2.3 CBM / 86 CBM / 55,100 pcs (pallet on a 45'HQ).",
        "APBS selling price = assets/products.csv Price. PVC 1½\" solid on the site looks $/ft; Palconn/Tommur pipe rows are 20 ft sticks.",
        "PEX 1¼ / 1½ / 2\" stay on Tommur rows for the record — do not restock. Palconn and Zhenpeng are ½ / ¾ / 1\" only.",
        "",
        f"Ocean constants: $10,000 / 40ft ({CBM_40} CBM) and same $10,000 / 45HQ ({CBM_45HQ} CBM). Duty stack 1.43.",
        "Rebuild: python3 cursor/product-pricing-analysis/build_three_mill_fob_landed.py",
    ]
    notes["A1"] = "Three-mill FOB / landed"
    notes["A1"].font = Font(bold=True, size=14, name="Calibri")
    for i, line in enumerate(lines, 3):
        notes.cell(i, 1, line).font = Font(name="Calibri", size=11)
    notes.column_dimensions["A"].width = 140
    wb.save(OUT_XLSX)


def main():
    rows = build_rows()
    write_xlsx(rows)
    with OUT_CSV.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=[k for k, _, _ in COLS], extrasaction="ignore")
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k, _, _ in COLS})
    n = len(rows)
    pal = sum(1 for r in rows if r["pal_fob"] is not None)
    tom = sum(1 for r in rows if r["tom_fob"] is not None)
    zhen = sum(1 for r in rows if r["zhen_fob"] is not None)
    sell = sum(1 for r in rows if r["apbs_sell"] is not None)
    print(f"wrote {OUT_XLSX.name}: {n} rows (Palconn FOB {pal}, Tommur FOB {tom}, Zhenpeng FOB {zhen}, site {sell})")
    for needle in ("PEX-ELBOW", "PEX-B PIPE", "PVC-PIPE-SOLID", "PVC-1/4HH"):
        hits = [r for r in rows if r["code"] == needle]
        for r in hits[:6]:
            print(
                f"  {r['item'][:50]:50} {r['size']:12} "
                f"P {r['pal_fob']} T {r['tom_fob']} Z {r['zhen_fob']} | "
                f"Pl {r['pal_landed']} Tl {r['tom_landed']} Zl {r['zhen_landed']} | sell {r['apbs_sell']}"
            )


if __name__ == "__main__":
    main()
