#!/usr/bin/env python3
"""Build Palconn full RFQ (mill SEND) + internal compare workbook.

Mill-facing file has only Palconn-facing sheets. Internal prices stay in COMPARE.
"""

from __future__ import annotations

import csv
from collections import Counter
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parents[3]
CSV_PATH = ROOT / "assets" / "products.csv"
FACTORY = ROOT / "cursor" / "product-pricing-analysis" / "Factory_Order_PVC_PEX_45HQ.csv"
OUT_DIR = Path(__file__).resolve().parent
SEND_XLSX = OUT_DIR / "Palconn_Full_Catalog_RFQ_SEND.xlsx"
COMPARE_XLSX = OUT_DIR / "Palconn_Full_Catalog_RFQ_COMPARE.xlsx"
LINES_CSV = OUT_DIR / "Palconn_Full_Catalog_RFQ_lines.csv"

YELLOW = PatternFill("solid", fgColor="FFF2CC")
HEADER = PatternFill("solid", fgColor="C00000")
WHITE_FONT = Font(bold=True, color="FFFFFF", name="Calibri", size=11)
THIN = Border(
    left=Side(style="thin", color="B0B0B0"),
    right=Side(style="thin", color="B0B0B0"),
    top=Side(style="thin", color="B0B0B0"),
    bottom=Side(style="thin", color="B0B0B0"),
)
WRAP = Alignment(wrap_text=True, vertical="center")

# Palconn 2026 NA catalog pages (image catalog; leave blank-FOB if they do not mold it).
PALCONN_DWV = {
    ("PVC-CAPSOC", "1-1/2"): "p.39–40 cap",
    ("PVC-CAPSOC", "2"): "p.39–40 cap",
    ("PVC-CAPSOC", "3"): "p.39–40 cap",
    ("PVC-CAPSOC", "4"): "p.39–40 cap",
    ("PVC-CPLNG", "1-1/2"): "p.40 coupling",
    ("PVC-CPLNG", "2"): "p.40 coupling",
    ("PVC-CPLNG", "3"): "p.40 coupling",
    ("PVC-CPLNG", "4"): "p.40 coupling",
    ("PVC-1/8HH", "1-1/2"): "p.40 45° elbow",
    ("PVC-1/8HH", "2"): "p.40 45° elbow",
    ("PVC-1/8HH", "3"): "p.40 45° elbow",
    ("PVC-1/8HH", "4"): "p.40 45° elbow",
    ("PVC-1/4HH", "1-1/2"): "p.40 90° elbow",
    ("PVC-1/4HH", "2"): "p.40 90° elbow",
    ("PVC-1/4HH", "3"): "p.40 90° elbow",
    ("PVC-1/4HH", "4"): "p.40 90° elbow",
    ("PVC-1/16HH", "1-1/2"): "p.40 bend (confirm 22.5° / 1/16)",
    ("PVC-1/16HH", "2"): "p.40 bend (confirm 22.5° / 1/16)",
    ("PVC-1/16HH", "3"): "p.40 bend (confirm 22.5° / 1/16)",
    ("PVC-BUSHINGHS", "2x1-1/2"): "p.40 reducing bushing",
    ("PVC-BUSHINGHS", "3x2"): "p.40 reducing bushing",
    ("PVC-BUSHINGHS", "4x3"): "p.40 reducing bushing",
    ("PVC-MADPTR", "1-1/2"): "p.39 male adapter",
    ("PVC-MADPTR", "2"): "p.39 male adapter",
    ("PVC-SANTEE", "1-1/2"): "p.41 tee",
    ("PVC-SANTEE", "2"): "p.41 tee",
    ("PVC-SANTEE", "3"): "p.41 tee",
    ("PVC-SANTEE", "4"): "p.41 tee",
    ("PVC-SANTEERED", "3x2"): "p.41 reducing tee",
    ("PVC-SANTEERED", "3x3x2"): "p.41 reducing tee",
    ("PVC-WYEHUB", "1-1/2"): "p.41 Y tee",
    ("PVC-WYEHUB", "2"): "p.41 Y tee",
    ("PVC-WYEHUB", "3"): "p.41 Y tee",
    ("PVC-WYEHUB", "4"): "p.41 Y tee",
    ("PVC-CLEANTEE", "2"): "p.41 test tee w/ CO plug",
    ("PVC-CLEANTEE", "3"): "p.41 test tee w/ CO plug",
    ("PVC-CLEANTEE", "4"): "p.41 test tee w/ CO plug",
    ("PVC-1/4LOWHEEL", "3x3x2"): "p.41 90 low heel (confirm 3x3x2)",
    ("PVC-WYEDBL", "3x3x2x2"): "p.42 double wye (confirm reducing)",
    ("PVC-PTRAP", "1-1/2"): "p.42 P-trap",
    ("PVC-PTRAP", "2"): "p.42 P-trap",
    ("PVC-PTRAP", "3"): "p.42 P-trap",
}

PEX_OVERSIZE = {"1-1/4", "1-1/2", "2"}

ZHENPENG = {
    ("PEX-ELBOW", "1/2"): 0.167,
    ("PEX-ELBOW", "3/4"): 0.342,
    ("PEX-ELBOW", "1"): 0.574,
    ("PEX-CPLNG", "1/2"): 0.104,
    ("PEX-CPLNG", "3/4"): 0.201,
    ("PEX-CPLNG", "1"): 0.427,
    ("PEX-TEE", "1/2"): 0.230,
    ("PEX-TEE", "3/4"): 0.474,
    ("PEX-TEE", "1"): 0.910,
    ("PEX-REDTEE", "3/4x3/4x1/2"): 0.441,
}


def canon_size(raw: str) -> str:
    s = (raw or "").replace('"', "").replace("″", "").replace("''", "")
    s = s.replace("×", "x").replace("X", "x")
    s = s.replace(" ", "")
    return s


def fmt_size(size: str) -> str:
    size = canon_size(size)
    if "x" in size:
        return '" x '.join(size.split("x")) + '"'
    return size + '"'


def load_site():
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_factory():
    fob, ddp = {}, {}
    if not FACTORY.exists():
        return fob, ddp
    with FACTORY.open(newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            code = (r.get("APBS_Code") or "").strip()
            size = canon_size(r.get("Size") or "")
            key = (code, size)
            try:
                fob_n = float(r["FOB_USD"]) if r.get("FOB_USD") not in ("", None) else None
            except ValueError:
                fob_n = None
            try:
                ddp_n = float(r["DDP_USD"]) if r.get("DDP_USD") not in ("", None) else None
            except ValueError:
                ddp_n = None
            if fob_n is not None:
                fob[key] = fob_n
            if ddp_n is not None:
                ddp[key] = ddp_n
    return fob, ddp


def add_row(bucket, **kw):
    bucket.append(kw)


def site_matches(row, code, size):
    if (row["Code"] or "").strip() != code:
        return False
    sz = canon_size(row["Size"])
    want = canon_size(size)
    if sz == want:
        return True
    # CPVC pipe is listed as 1/2" x 1.73" (CTS OD). Match nominal only.
    if sz.startswith(want + "x"):
        if want == "1" and sz.startswith("1-"):
            return False
        return True
    return False


def price_of(site, code, size):
    for r in site:
        if site_matches(r, code, size):
            try:
                return float(r["Price"] or 0) or None
            except ValueError:
                return None
    return None


def on_site(site, code, size):
    return any(site_matches(r, code, size) for r in site)


def build_rows():
    site = load_site()
    factory_fob, factory_ddp = load_factory()
    rows = []

    def push(**kw):
        code, size = kw["code"], canon_size(kw["size"])
        kw.setdefault("site_price", price_of(site, code, size))
        kw.setdefault("our_fob", factory_fob.get((code, size)))
        kw.setdefault("our_ddp", factory_ddp.get((code, size)))
        kw.setdefault("zhenpeng", ZHENPENG.get((code, size)))
        if "status" not in kw:
            kw["status"] = "On site" if on_site(site, code, size) else "New — we want to stock"
        add_row(rows, **kw)

    # --- PEX-B pipe (½ / ¾ / 1" only). Site lists per ft; 100 ft coil is the listed pack. ---
    pipe_packs = [
        ("10 ft stick", "ft", "New pack — we want to stock", "10 ft straight length, ASTM F876/F877 PEX-B CTS"),
        ("20 ft stick", "ft", "New pack — we want to stock", "20 ft straight length, ASTM F876/F877 PEX-B CTS"),
        ("100 ft coil", "ft", "On site — listed per ft", "100 ft coil, ASTM F876/F877 PEX-B CTS"),
        ("300 ft coil", "ft", "New pack — we want to stock", "300 ft coil, ASTM F876/F877 PEX-B CTS"),
        ("500 ft coil", "ft", "New pack — we want to stock", "500 ft coil, ASTM F876/F877 PEX-B CTS"),
    ]
    for size in ("1/2", "3/4", "1"):
        for pack, unit, status, spec in pipe_packs:
            if size == "1" and pack.startswith("500"):
                continue
            push(
                family="PEX-B pipe",
                spec="ASTM F876/F877 PEX-B CTS, NSF-pw / cUPC",
                catalog="p.4",
                code="PEX-B PIPE",
                desc=f"PEX-B potable pipe, {pack}",
                size=fmt_size(size),
                unit=unit,
                status=status,
                mill_note="Quote white, red, and blue separately (FOB each color). CTS, not metric OD.",
            )

    ppsu = [
        ("PEX-ELBOW", "90 elbow F2159 PPSU crimp", "1/2", "p.13"),
        ("PEX-ELBOW", "90 elbow F2159 PPSU crimp", "3/4", "p.13"),
        ("PEX-ELBOW", "90 elbow F2159 PPSU crimp", "1", "p.13"),
        ("PEX-CPLNG", "Coupling F2159 PPSU crimp", "1/2", "p.13"),
        ("PEX-CPLNG", "Coupling F2159 PPSU crimp", "3/4", "p.13"),
        ("PEX-CPLNG", "Coupling F2159 PPSU crimp", "1", "p.13"),
        ("PEX-TEE", "Tee F2159 PPSU crimp", "1/2", "p.13"),
        ("PEX-TEE", "Tee F2159 PPSU crimp", "3/4", "p.13"),
        ("PEX-TEE", "Tee F2159 PPSU crimp", "1", "p.13"),
        ("PEX-REDUCER", "Reducing coupling F2159 PPSU", "3/4x1/2", "p.13"),
        ("PEX-REDUCER", "Reducing coupling F2159 PPSU", "1x1/2", "p.13"),
        ("PEX-REDUCER", "Reducing coupling F2159 PPSU", "1x3/4", "p.13"),
        ("PEX-REDTEE", "Reducing tee F2159 PPSU", "3/4x3/4x1/2", "p.13"),
        ("PEX-REDTEE", "Reducing tee F2159 PPSU", "1x1x3/4", "p.13"),
        ("PEX-REDTEE", "Reducing tee F2159 PPSU", "1x1x1/2", "p.13"),
        ("PEX-PLUG", "Plug F2159 PPSU", "1/2", "p.13"),
        ("PEX-PLUG", "Plug F2159 PPSU", "3/4", "p.13"),
        ("PEX-PLUG", "Plug F2159 PPSU", "1", "p.13"),
        ("PEX-MADPTR", "Male adapter PEX x MIPT F2159 PPSU", "1/2", "p.14"),
        ("PEX-MADPTR", "Male adapter PEX x MIPT F2159 PPSU", "3/4", "p.14"),
        ("PEX-MADPTR", "Male adapter PEX x MIPT F2159 PPSU", "1", "p.14"),
        ("PEX-FADPTR", "Female swivel adapter PEX x FIPT F2159 PPSU", "1/2", "p.14"),
        ("PEX-FADPTR", "Female swivel adapter PEX x FIPT F2159 PPSU", "3/4", "p.14"),
        ("PEX-FADPTR", "Female swivel adapter PEX x FIPT F2159 PPSU", "1", "p.14"),
        ("PEX-DE90", "Drop-ear / male elbow PEX x MPT F2159 PPSU", "1/2", "p.14"),
        ("PEX-DE90", "Drop-ear / male elbow PEX x MPT F2159 PPSU", "3/4", "p.14"),
    ]
    for code, desc, size, page in ppsu:
        push(
            family="PEX F2159 PPSU",
            spec="ASTM F2159, NSF/ANSI 61, cUPC",
            catalog=page,
            code=code,
            desc=desc,
            size=fmt_size(size),
            unit="pc",
            mill_note="PPSU crimp (copper-ring / pinch-clamp).",
        )

    brass = [
        ("PEX-F1807-CPLNG", "Coupling F1807 brass crimp", "1/2"),
        ("PEX-F1807-CPLNG", "Coupling F1807 brass crimp", "3/4"),
        ("PEX-F1807-CPLNG", "Coupling F1807 brass crimp", "1"),
        ("PEX-F1807-ELBOW", "90 elbow F1807 brass crimp", "1/2"),
        ("PEX-F1807-ELBOW", "90 elbow F1807 brass crimp", "3/4"),
        ("PEX-F1807-ELBOW", "90 elbow F1807 brass crimp", "1"),
        ("PEX-F1807-TEE", "Tee F1807 brass crimp", "1/2"),
        ("PEX-F1807-TEE", "Tee F1807 brass crimp", "3/4"),
        ("PEX-F1807-TEE", "Tee F1807 brass crimp", "1"),
        ("PEX-F1807-PLUG", "Plug F1807 brass crimp", "1/2"),
        ("PEX-F1807-PLUG", "Plug F1807 brass crimp", "3/4"),
        ("PEX-F1807-PLUG", "Plug F1807 brass crimp", "1"),
        ("PEX-F1807-REDCPL", "Reducing coupling F1807 brass", "3/4x1/2"),
        ("PEX-F1807-REDCPL", "Reducing coupling F1807 brass", "1x3/4"),
        ("PEX-F1807-REDCPL", "Reducing coupling F1807 brass", "1x1/2"),
        ("PEX-F1807-REDTEE", "Reducing tee F1807 brass", "3/4x3/4x1/2"),
        ("PEX-F1807-REDTEE", "Reducing tee F1807 brass", "1x1x3/4"),
        ("PEX-F1807-REDTEE", "Reducing tee F1807 brass", "1x1x1/2"),
        ("PEX-F1807-MADPTR", "PEX x MIPT adapter F1807 brass", "1/2"),
        ("PEX-F1807-MADPTR", "PEX x MIPT adapter F1807 brass", "3/4"),
        ("PEX-F1807-MADPTR", "PEX x MIPT adapter F1807 brass", "1"),
        ("PEX-F1807-FADPTR", "PEX x FIPT adapter F1807 brass", "1/2"),
        ("PEX-F1807-FADPTR", "PEX x FIPT adapter F1807 brass", "3/4"),
        ("PEX-F1807-FADPTR", "PEX x FIPT adapter F1807 brass", "1"),
        ("PEX-F1807-DE90", "Drop-ear 90 FPT F1807 brass", "1/2"),
        ("PEX-F1807-DE90", "Drop-ear 90 FPT F1807 brass", "3/4"),
        ("PEX-F1807-RING", "Copper crimp ring", "1/2"),
        ("PEX-F1807-RING", "Copper crimp ring", "3/4"),
        ("PEX-F1807-RING", "Copper crimp ring", "1"),
        ("PEX-F1807-CLAMP", "Stainless steel pinch clamp", "1/2"),
        ("PEX-F1807-CLAMP", "Stainless steel pinch clamp", "3/4"),
        ("PEX-F1807-CLAMP", "Stainless steel pinch clamp", "1"),
        ("PEX-F1807-VALVE", "PEX x PEX ball valve F1807", "1/2"),
        ("PEX-F1807-VALVE", "PEX x PEX ball valve F1807", "3/4"),
        ("PEX-F1807-VALVE", "PEX x PEX ball valve F1807", "1"),
    ]
    for code, desc, size in brass:
        if "RING" in code or "CLAMP" in code:
            cat = "p.8"
        elif "VALVE" in code:
            cat = "p.11"
        else:
            cat = "p.6–8"
        push(
            family="PEX F1807 brass",
            spec="ASTM F1807 lead-free brass, NSF/ANSI 61 + 372, cUPC",
            catalog=cat,
            code=code,
            desc=desc,
            size=fmt_size(size),
            unit="pc",
            mill_note="Lead-free brass. Do not quote DZR / non-potable.",
        )

    for code, desc, spec in (
        ("PEX-WMBOX", "Washing machine outlet box 1/2 F1807, no WHA", "1/2 F1807 PEX, lead-free"),
        (
            "PEX-WMBOX-WHA",
            "Washing machine outlet box 1/2 F1807 with water-hammer arrestors",
            "1/2 F1807 PEX, lead-free, with WHA",
        ),
        ("PEX-ICEBOX", "Ice maker outlet box 1/2 F1807", "1/2 F1807 PEX, lead-free"),
    ):
        push(
            family="PEX outlet boxes",
            spec=spec,
            catalog="p.30",
            code=code,
            desc=desc,
            size='1/2"',
            unit="pc",
            mill_note="",
        )

    # --- PVC Sch40 solid pipe (all sizes on the site; Palconn lists ½–16") ---
    for r in site:
        if r["Code"] != "PVC-PIPE-SOLID":
            continue
        size = canon_size(r["Size"])
        try:
            site_price = float(r["Price"] or 0) or None
        except ValueError:
            site_price = None
        push(
            family="PVC Sch40 pipe",
            spec="ASTM D1785 Sch 40 solid PVC, NSF-pw, 20 ft sticks (also quote 10 ft)",
            catalog="p.32",
            code="PVC-PIPE-SOLID",
            desc="ASTM D1785 Sch 40 PVC solid pipe",
            size=fmt_size(size),
            unit="ft",
            mill_note="Plain end. Quote USD per foot, 20 ft length. NSF-pw in Palconn name.",
            site_price=site_price,
        )

    for r in site:
        if r["Code"] != "PVC-PIPE-FOAM":
            continue
        size = canon_size(r["Size"])
        try:
            site_price = float(r["Price"] or 0) or None
        except ValueError:
            site_price = None
        push(
            family="PVC foam-core pipe",
            spec="ASTM F891 foam-core DWV pipe, 20 ft sticks",
            catalog="Quote if you extrude ASTM F891",
            code="PVC-PIPE-FOAM",
            desc="ASTM F891 PVC foam-core DWV pipe",
            size=fmt_size(size),
            unit="20 ft stick",
            mill_note="Leave FOB blank if you do not extrude F891. Qty is 20 ft lengths, not meters.",
            site_price=site_price,
        )

    for r in site:
        if (r["Material"] or "") != "PVC":
            continue
        code = r["Code"]
        if code in ("PVC-PIPE-SOLID", "PVC-PIPE-FOAM"):
            continue
        size = canon_size(r["Size"])
        page = PALCONN_DWV.get((code, size), "Quote if you manufacture ASTM D2665")
        try:
            site_price = float(r["Price"] or 0) or None
        except ValueError:
            site_price = None
        push(
            family="PVC DWV fittings",
            spec="ASTM D2665 PVC DWV, NSF-dwv, hub x hub unless noted",
            catalog=page,
            code=code,
            desc=r["Description"],
            size=(r["Size"] or "").replace("''", '"'),
            unit="pc",
            mill_note="White DWV. Leave FOB blank if you do not mold this pattern/size.",
            site_price=site_price,
        )

    # CPVC D2846 SDR-11 CTS — Palconn catalog does not list it; NJ potable, quote if extruded.
    for size in ("1/2", "3/4", "1", "1-1/4", "1-1/2", "2"):
        push(
            family="CPVC SDR-11 (if manufactured)",
            spec="ASTM D2846 SDR-11 CTS, NSF-pw / UPC",
            catalog="Not in 2026 NA catalog — quote only if you extrude D2846 CTS",
            code="CPVC-PIPE-SDR11",
            desc="CPVC ASTM D2846 SDR-11 pipe, 10 ft or 20 ft",
            size=fmt_size(size),
            unit="ft",
            mill_note="Do not quote Sch 80 CPVC or IPS F441. SDR-11 CTS only. Cream / yellow stripe is the US look.",
        )

    cpvc_fit = [
        ("CPVC-ELBOW", "90 elbow CTS D2846 (socket)"),
        ("CPVC-CPLNG", "Coupling CTS D2846 (socket)"),
        ("CPVC-TEE", "Tee CTS D2846 (socket)"),
        ("CPVC-MADPTR", "Male adapter CTS D2846 (MPT x socket)"),
        ("CPVC-FADPTR", "Female adapter CTS D2846 (FPT x socket)"),
        ("CPVC-UNION", "Union CTS D2846"),
    ]
    for size in ("1/2", "3/4", "1", "1-1/4", "1-1/2", "2"):
        for code, desc in cpvc_fit:
            push(
                family="CPVC D2846 fittings (if manufactured)",
                spec="ASTM D2846 CTS fittings for SDR-11 pipe, NSF-pw",
                catalog="Not in 2026 NA catalog — quote only if you mold D2846 CTS",
                code=code,
                desc=desc,
                size=fmt_size(size),
                unit="pc",
                mill_note="Sockets must fit SDR-11 CTS, not Sch 80 IPS. Leave FOB blank if you do not mold CPVC.",
            )

    return rows, site


def site_inventory(site, rfq_keys):
    """Every plumbing SKU on the live site, with whether it is on the Palconn RFQ."""
    out = []
    for r in site:
        mat = (r["Material"] or "").strip()
        if mat not in ("PVC", "PEX", "CPVC"):
            continue
        code = (r["Code"] or "").strip()
        size = canon_size(r["Size"])
        try:
            price = float(r["Price"] or 0) or None
        except ValueError:
            price = None
        on_rfq = (code, size) in rfq_keys or any(
            k[0] == code and (k[1] == size or size.startswith(k[1] + "x")) for k in rfq_keys
        )
        pex_parts = size.split("x")
        if mat == "PEX" and any(p in PEX_OVERSIZE for p in pex_parts):
            on_rfq = False
            reason = "On site — do not restock over 1 inch; not sent to Palconn"
        elif code == "CPVC-PIPE-SCH80":
            on_rfq = False
            reason = "On site — Sch 80 is the wrong CPVC for NJ potable; not sent"
        elif code == "CPVC-PIPE-SDR13.5":
            on_rfq = False
            reason = "On site — thinner wall than NJ SDR-11; not sent"
        elif on_rfq:
            reason = "On Palconn RFQ"
        else:
            reason = "On site — Palconn does not list this line; not sent"
        out.append(
            {
                "material": mat,
                "code": code,
                "desc": r["Description"],
                "size": r["Size"],
                "price": price,
                "on_rfq": "Yes" if on_rfq else "No",
                "reason": reason,
            }
        )
    return out


SEND_HEADERS = [
    "Line",
    "Family",
    "APBS_Code",
    "Description",
    "Size",
    "Spec",
    "Unit",
    "On_APBS_site",
    "Palconn_catalog",
    "FOB_USD",
    "MOQ",
    "Pcs_or_ft_per_carton",
    "Cartons_per_pallet",
    "CBM_per_carton",
    "GW_kg_per_carton",
    "Lead_time_days",
    "NSF_cUPC_listing",
    "Notes_from_Palconn",
]


def style_header(ws, headers):
    for col, h in enumerate(headers, 1):
        c = ws.cell(1, col, h)
        c.fill = HEADER
        c.font = WHITE_FONT
        c.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
    ws.row_dimensions[1].height = 32
    ws.freeze_panes = "A2"


def write_send(rows):
    wb = Workbook()
    cover = wb.active
    cover.title = "Read_me"
    cover["A1"] = "All Pro Building Supplies LLC — Palconn RFQ"
    cover["A1"].font = Font(bold=True, size=18, color="C00000")
    cover.merge_cells("A3:B24")
    cover["A3"] = "\n".join(
        [
            "Please complete the Quote sheet. Yellow cells are for Palconn.",
            "",
            "Incoterms: FOB Ningbo or Shanghai (Qingdao is also acceptable). USD. Not EXW. Not DDP.",
            "We arrange ocean to Newark / Elizabeth, NJ, USA, then 1600 Livingston Ave, North Brunswick, NJ 08902.",
            "",
            "Quote every line you manufacture. If you do not make that pattern or size, leave FOB blank.",
            "Every quoted line needs MOQ (pieces, feet, or 20 ft sticks), carton pack, CBM, and gross weight.",
            "",
            "PEX pipe must be PEX-B, ASTM F876 / F877, CTS (not metric OD), NSF-pw / cUPC in Palconn’s name.",
            "We buy ½\", ¾\", and 1\" PEX only. Please do not quote 1¼\", 1½\", or 2\" PEX.",
            "F1807 brass must be lead-free, NSF/ANSI 61 and 372.",
            "F2159 PPSU must be NSF/ANSI 61.",
            "PVC Sch 40 pipe: ASTM D1785, NSF-pw. DWV fittings: ASTM D2665, NSF-dwv, white.",
            "Foam-core pipe: ASTM F891, 20 ft sticks — quote only if you extrude it.",
            "CPVC: ASTM D2846 SDR-11 CTS only — quote only if you extrude / mold it. Do not quote CPVC Sch 80.",
            "",
            "Please do not quote on this sheet: EVOH / oxygen-barrier PEX, PEX-AL-PEX, radiant manifolds,",
            "push-fit fittings, tools, gas pipe, conduit, PVC Sch 80, or CPVC Sch 80.",
            "",
            "Samples: DHL to 1600 Livingston Ave, North Brunswick, NJ 08902, USA.",
            "",
            "Baruch Grossman, Founder & Owner, All Pro Building Supplies LLC",
            "+1 732-734-1123 · info@allprobuildingsupplies.com",
        ]
    )
    cover["A3"].alignment = Alignment(wrap_text=True, vertical="top")
    cover.row_dimensions[3].height = 380
    cover.column_dimensions["A"].width = 110
    cover.column_dimensions["B"].width = 20

    counts = Counter(r["family"] for r in rows)
    cover["A26"] = "Quote sheet line count"
    cover["A26"].font = Font(bold=True)
    i = 27
    for fam, n in counts.items():
        cover[f"A{i}"] = fam
        cover[f"B{i}"] = n
        i += 1
    cover[f"A{i}"] = "Total"
    cover[f"B{i}"] = len(rows)
    cover[f"A{i}"].font = Font(bold=True)

    ws = wb.create_sheet("Quote", 1)
    style_header(ws, SEND_HEADERS)
    widths = [8, 36, 22, 52, 22, 48, 14, 28, 42, 12, 12, 18, 16, 14, 16, 14, 18, 40]
    for idx, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(idx)].width = w

    yellow_cols = list(range(10, 19))
    for i, r in enumerate(rows, 2):
        vals = [
            i - 1,
            r["family"],
            r["code"],
            r["desc"],
            r["size"],
            r["spec"],
            r["unit"],
            r["status"],
            r["catalog"],
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            None,
            r["mill_note"],
        ]
        for col, v in enumerate(vals, 1):
            cell = ws.cell(i, col, v)
            cell.border = THIN
            cell.alignment = WRAP
            if col in yellow_cols:
                cell.fill = YELLOW
        ws.row_dimensions[i].height = 28

    last = len(rows) + 1
    ws.auto_filter.ref = f"A1:R{last}"
    dv = DataValidation(type="decimal", operator="greaterThan", formula1="0", allow_blank=True)
    dv.add(f"J2:J{last}")
    dv.add(f"K2:K{last}")
    ws.add_data_validation(dv)

    sign = wb.create_sheet("Sign-off")
    sign["A1"] = "Buyer"
    sign["A1"].font = Font(bold=True, size=14, color="C00000")
    for i, line in enumerate(
        [
            "All Pro Building Supplies LLC",
            "Baruch Grossman, Founder & Owner",
            "1600 Livingston Ave, North Brunswick, NJ 08902, USA",
            "+1 732-734-1123",
            "info@allprobuildingsupplies.com",
            "",
            "Please return this workbook with yellow cells completed, or an equivalent quote spreadsheet.",
        ],
        3,
    ):
        sign[f"A{i}"] = line
    sign.column_dimensions["A"].width = 80

    wb.save(SEND_XLSX)


def write_compare(rows, inventory):
    wb = Workbook()
    ws = wb.active
    ws.title = "Compare_internal"
    headers = SEND_HEADERS[:9] + [
        "Site_sell_USD",
        "Our_current_FOB_USD",
        "Our_Tommur_DDP_USD",
        "Zhenpeng_PPSU_FOB_USD",
        "Palconn_FOB_when_back",
    ]
    style_header(ws, headers)
    for i, r in enumerate(rows, 2):
        vals = [
            i - 1,
            r["family"],
            r["code"],
            r["desc"],
            r["size"],
            r["spec"],
            r["unit"],
            r["status"],
            r["catalog"],
            r.get("site_price"),
            r.get("our_fob"),
            r.get("our_ddp"),
            r.get("zhenpeng"),
            None,
        ]
        for col, v in enumerate(vals, 1):
            cell = ws.cell(i, col, v)
            cell.border = THIN
            cell.alignment = WRAP
        ws.row_dimensions[i].height = 22
    widths = [8, 36, 20, 50, 20, 42, 14, 28, 36, 14, 18, 18, 20, 20]
    for idx, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(idx)].width = w

    inv = wb.create_sheet("Site_plumbing")
    inv_headers = [
        "Material",
        "APBS_Code",
        "Description",
        "Size",
        "Site_sell_USD",
        "On_Palconn_RFQ",
        "Note",
    ]
    style_header(inv, inv_headers)
    for i, r in enumerate(inventory, 2):
        vals = [r["material"], r["code"], r["desc"], r["size"], r["price"], r["on_rfq"], r["reason"]]
        for col, v in enumerate(vals, 1):
            cell = inv.cell(i, col, v)
            cell.border = THIN
            cell.alignment = WRAP
    for idx, w in enumerate([12, 22, 48, 22, 14, 16, 56], 1):
        inv.column_dimensions[get_column_letter(idx)].width = w
    inv.auto_filter.ref = f"A1:G{len(inventory)+1}"

    note = wb.create_sheet("Notes")
    note["A1"] = (
        "Internal only. Do not send to Palconn. Site_sell is the website list. "
        "Our_current_FOB is Tommur/factory-order where we have a yellow FOB. "
        "Our_Tommur_DDP is the factory-order DDP column (not comparable 1:1 to Palconn FOB). "
        "Zhenpeng_PPSU_FOB is the 5 Sep 2026 REV PI. "
        "PEX 1-1/4 / 1-1/2 / 2, CPVC Sch 80, and CPVC SDR-13.5 stay off the SEND sheet. "
        "Do not PO Palconn until this quote is back and landed vs Tommur / Zhenpeng."
    )
    note["A1"].alignment = Alignment(wrap_text=True)
    note.column_dimensions["A"].width = 110
    note.row_dimensions[1].height = 80
    wb.save(COMPARE_XLSX)


def write_lines_csv(rows):
    fields = [
        "line",
        "family",
        "code",
        "desc",
        "size",
        "spec",
        "unit",
        "status",
        "catalog",
        "mill_note",
    ]
    with LINES_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for i, r in enumerate(rows, 1):
            w.writerow(
                {
                    "line": i,
                    "family": r["family"],
                    "code": r["code"],
                    "desc": r["desc"],
                    "size": r["size"],
                    "spec": r["spec"],
                    "unit": r["unit"],
                    "status": r["status"],
                    "catalog": r["catalog"],
                    "mill_note": r["mill_note"],
                }
            )


def main():
    rows, site = build_rows()
    rfq_keys = {(r["code"], canon_size(r["size"])) for r in rows}
    inventory = site_inventory(site, rfq_keys)
    write_send(rows)
    write_compare(rows, inventory)
    write_lines_csv(rows)
    c = Counter(r["family"] for r in rows)
    print(f"rows={len(rows)}")
    for k, n in c.items():
        print(f"  {k}: {n}")
    print("site plumbing SKUs", len(inventory))
    on = sum(1 for r in inventory if r["on_rfq"] == "Yes")
    off = sum(1 for r in inventory if r["on_rfq"] == "No")
    print(f"site on RFQ={on}  site not sent={off}")
    print("wrote", SEND_XLSX)
    print("wrote", COMPARE_XLSX)
    print("wrote", LINES_CSV)


if __name__ == "__main__":
    main()
