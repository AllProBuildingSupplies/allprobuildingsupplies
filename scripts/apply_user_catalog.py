#!/usr/bin/env python3
"""Apply Baruch's edited products.csv to assets/products.csv.

Strips $ from Price, hyphenates spaces in Codes, drops duplicate Tear Down
shades, fills missing plumbing images. Does not invent prices.
"""
from __future__ import annotations

import csv
import io
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/home/ubuntu/.cursor/projects/workspace/uploads/products_fffd.csv")
OUT = ROOT / "assets" / "products.csv"

HEADERS = [
    "Material",
    "Code",
    "Description",
    "Size",
    "Color",
    "Pack",
    "Qty",
    "Price",
    "Image",
    "main_category",
    "sub_category",
    "sub_sub_category",
    "sub_sub_sub_category",
    "Tommur-Code",
    "Lesso-Code",
]

IMAGE_BY_CODE = {
    "PEX-CPLNG": "images/PEXCplng.png",
    "PEX-F1807-RING": "images/PEXCrimpRing.png",
    "PEX-ELBOW": "images/PEXElbow.png",
    "PEX-PLUG": "images/PEXPlug.png",
    "PEX-REDUCER": "images/PEXReducer.png",
    "PEX-REDTEE": "images/PEXRedTee.png",
    "PEX-TEE": "images/PEXTee.png",
    "PEX-B-PIPE-ST-RED": "images/PEX-B-ST-RED.png",
    "PEX-B-PIPE-ST-BLUE": "images/PEX-B-ST-BLUE.png",
    "PEX-B-PIPE-RL-RED": "images/PEX-B-RED.png",
    "PEX-B-PIPE-RL-BLUE": "images/PEX-B-BLUE.png",
    "PVC-1/4LOWHEEL": "images/PVC-LowHeel.png",
}


def clean_price(raw: str) -> str:
    s = str(raw or "").replace("\xa0", " ").replace("$", "").replace(",", "").strip()
    if s == "":
        return ""
    try:
        v = float(s)
    except ValueError:
        return s
    if v == 0:
        return "0"
    t = f"{v:.4f}".rstrip("0").rstrip(".")
    return t


def clean_code(raw: str) -> str:
    return " ".join(str(raw or "").split()).replace(" ", "-")


def clean_text(raw: str) -> str:
    return str(raw or "").replace("\xa0", " ").strip()


def image_for(code: str, current: str) -> str:
    if (current or "").strip():
        if code.startswith("PEX-B-PIPE-"):
            return IMAGE_BY_CODE.get(code, current.strip())
        if code in ("PEX-ELBOW", "PEX-REDUCER"):
            return IMAGE_BY_CODE[code]
        return current.strip()
    return IMAGE_BY_CODE.get(code, "")


def main() -> None:
    text = SRC.read_bytes().decode("cp1252")
    rows = list(csv.DictReader(io.StringIO(text)))
    out: list[dict] = []
    seen: set[tuple[str, str, str]] = set()
    for r in rows:
        code = clean_code(r.get("Code") or "")
        size = clean_text(r.get("Size") or "")
        color = clean_text(r.get("Color") or "")
        key = (code, size, color)
        if key in seen:
            continue
        seen.add(key)
        rec = {h: clean_text(r.get(h) or "") for h in HEADERS}
        rec["Code"] = code
        rec["Size"] = size
        rec["Color"] = color
        rec["Price"] = clean_price(r.get("Price") or "")
        rec["Image"] = image_for(code, rec["Image"])
        rec["Description"] = clean_text(r.get("Description") or "")
        out.append(rec)

    missing = [r for r in out if not r["Image"]]
    if missing:
        raise SystemExit(
            "missing images: " + ", ".join(f"{r['Code']} {r['Size']}" for r in missing)
        )
    spaced = [r["Code"] for r in out if " " in r["Code"]]
    if spaced:
        raise SystemExit("codes still have spaces: " + ", ".join(sorted(set(spaced))))
    dollar = [r["Price"] for r in out if "$" in r["Price"]]
    if dollar:
        raise SystemExit("prices still have $")

    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS, lineterminator="\n")
        w.writeheader()
        w.writerows(out)

    tear = [r for r in out if r["Code"] in ("ACH-SHADE-TEAR-LF", "ACH-SHADE-TEAR-RD")]
    print(f"wrote {OUT.relative_to(ROOT)}: {len(out)} rows (from {len(rows)})")
    print(f"  Tear Down unique: {len(tear)}")
    print(f"  Price 0: {sum(1 for r in out if r['Price'] == '0')}")
    print(f"  Price blank: {sum(1 for r in out if r['Price'] == '')}")
    print(f"  PEX codes: {sorted({r['Code'] for r in out if r['Code'].startswith('PEX-')})}")


if __name__ == "__main__":
    main()
