#!/usr/bin/env python3
"""Crop per-color photos from Achim/Alveron sell sheets into images/achim/.

Merges CODE|COLOR keys into assets/achim-image-map.json. Does not overwrite
families that already have unique website photos unless those colors currently
share one image or still use images/logo.png.

Source PDFs (not committed):
  uploads/Achim_Price_Book_-_Window_-_Baruch_8-27-26_*.pdf
  uploads/Achim_Price_Book_-_Baruch_8-27-26_*.pdf
  uploads/Alveron_Click-Lock_Planks_-_Spec_Sheet*.pdf
"""
from __future__ import annotations

import csv
import json
import re
from collections import defaultdict
from pathlib import Path

import pymupdf
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "assets" / "products.csv"
MAP_PATH = ROOT / "assets" / "achim-image-map.json"
IMG_DIR = ROOT / "images" / "achim"
UPLOADS = Path("/home/ubuntu/.cursor/projects/workspace/uploads")

WINDOW_PDF = next(UPLOADS.glob("Achim_Price_Book_-_Window_*.pdf"))
FLOOR_PDF = next(
    p for p in UPLOADS.glob("Achim_Price_Book_-_Baruch_*.pdf") if "Window" not in p.name
)
ALVERON_PDF = next(UPLOADS.glob("Alveron_Click-Lock_Planks*.pdf"))

ZOOM = 3.0
SKIP_LABEL = re.compile(
    r"(click here|case pack|size cost|side view|top open|header|"
    r"recyclable|in stock|closed|open$|page \d+|achim logo|shown in)",
    re.I,
)

# Families whose colors currently share one photo (or logo). Extract these.
NEED_COLOR_PHOTOS = {
    "ACH-BLIND-SUNDOWN",
    "ACH-BLIND-MORNINGSTAR",
    "ACH-BLIND-MADERA",
    "ACH-BLIND-LUNA",
    "ACH-BLIND-HORIZON",
    "ACH-BLIND-MONACO",
    "ACH-SHADE-GLIDENGO",
    "ACH-SHADE-HONEYCOMB",
    "ACH-SHADE-TDBU-CELL",
    "ACH-SHADE-CELESTIAL",
    "ACH-SHADE-ROMAN-BO",
    "ACH-SHADE-ROLLER-LF",
    "ACH-SHADE-ROLLER-RD",
    "ACH-NEXUS-CARPET-50",
    "ACH-TIVOLI2-PLANK",
    "ALV-CLICK-PLANK",
    "ACH-RETRO-TILE",
    "ACH-TIVOLI-TILE",
    "ACH-PALAZZO-TILE",
}


def slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", str(text or "").lower()).strip("-")
    return s or "x"


def load_catalog_colors() -> dict[str, set[str]]:
    by: dict[str, set[str]] = defaultdict(set)
    with CSV_PATH.open(newline="") as f:
        for row in csv.DictReader(f):
            code = (row.get("Code") or "").strip()
            color = (row.get("Color") or "").strip()
            if color and (code.startswith("ACH-") or code.startswith("ALV-")):
                by[code].add(color)
    return by


def colors_needing_photos() -> dict[str, set[str]]:
    """Colors whose current CSV image is the logo or is shared with another color."""
    by_color: dict[str, dict[str, str]] = defaultdict(dict)
    with CSV_PATH.open(newline="") as f:
        for row in csv.DictReader(f):
            code = (row.get("Code") or "").strip()
            color = (row.get("Color") or "").strip()
            if not color or not (code.startswith("ACH-") or code.startswith("ALV-")):
                continue
            by_color[code].setdefault(color, (row.get("Image") or "").strip())
    need: dict[str, set[str]] = defaultdict(set)
    for code, cmap in by_color.items():
        counts: dict[str, int] = defaultdict(int)
        for img in cmap.values():
            counts[img] += 1
        for color, img in cmap.items():
            if (not img) or "logo.png" in img or counts[img] > 1:
                need[code].add(color)
    return need


def load_map() -> dict:
    raw = json.loads(MAP_PATH.read_text())
    if not isinstance(raw, dict):
        return {"images": {}, "unmatched": []}
    raw.setdefault("images", {})
    raw.setdefault("unmatched", [])
    return raw


def page_images(page) -> list[tuple[float, float, float, float]]:
    boxes = []
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 1:
            continue
        x0, y0, x1, y1 = b["bbox"]
        w, h = x1 - x0, y1 - y0
        if w < 40 or h < 40:
            continue
        if w < 42 and h < 42 and x0 < 50 and y0 < 50:
            continue
        boxes.append((x0, y0, x1, y1))
    # Drop images fully contained in a larger one (nested XObject).
    keep = []
    for i, a in enumerate(boxes):
        ax0, ay0, ax1, ay1 = a
        contained = False
        for j, b in enumerate(boxes):
            if i == j:
                continue
            bx0, by0, bx1, by1 = b
            if ax0 >= bx0 - 2 and ay0 >= by0 - 2 and ax1 <= bx1 + 2 and ay1 <= by1 + 2:
                if (bx1 - bx0) * (by1 - by0) > (ax1 - ax0) * (ay1 - ay0) + 10:
                    contained = True
                    break
        if not contained:
            keep.append(a)
    return keep


def page_spans(page) -> list[tuple[tuple[float, float, float, float], str]]:
    out = []
    for b in page.get_text("dict")["blocks"]:
        if b.get("type") != 0:
            continue
        for line in b.get("lines", []):
            for span in line.get("spans", []):
                t = " ".join(str(span.get("text") or "").split())
                if t:
                    out.append((tuple(span["bbox"]), t))
    return out


def split_color_hits(text: str, colors: list[str]) -> list[tuple[str, int, int]]:
    """Find catalog color names in a text run, longest-first so 'Dove Grey' wins over 'Grey'."""
    ordered = sorted(colors, key=len, reverse=True)
    hits: list[tuple[str, int, int]] = []
    used = [False] * len(text)
    low = text.lower()
    for color in ordered:
        cl = color.lower()
        start = 0
        while True:
            i = low.find(cl, start)
            if i < 0:
                break
            j = i + len(cl)
            if not any(used[i:j]) and (i == 0 or not low[i - 1].isalnum()) and (
                j == len(low) or not low[j].isalnum()
            ):
                hits.append((color, i, j))
                for k in range(i, j):
                    used[k] = True
            start = i + 1
    # Pattern tiles: "#601" is enough even when the name wraps to the next line.
    for m in re.finditer(r"#(\d{3})", text):
        num = m.group(1)
        for color in colors:
            if color == f"#{num}" or color.startswith(f"#{num} "):
                i, j = m.start(), m.end()
                if not any(used[i:j]):
                    hits.append((color, i, j))
                    for k in range(i, j):
                        used[k] = True
                break
    hits.sort(key=lambda h: h[1])
    return hits


def span_subset_bbox(bbox, text: str, i: int, j: int) -> tuple[float, float, float, float]:
    x0, y0, x1, y1 = bbox
    n = max(len(text), 1)
    w = x1 - x0
    return (x0 + w * i / n, y0, x0 + w * j / n, y1)


def dist_label_image(lb, ib) -> float:
    lx0, ly0, lx1, ly1 = lb
    ix0, iy0, ix1, iy1 = ib
    lcx, lcy = (lx0 + lx1) / 2, (ly0 + ly1) / 2
    # Distance to rectangle (0 if label center is inside / just under the image).
    cx = min(max(lcx, ix0), ix1)
    cy = min(max(lcy, iy0), iy1)
    dx, dy = lcx - cx, lcy - cy
    d = (dx * dx + dy * dy) ** 0.5
    # Prefer horizontally aligned (caption under or over the photo).
    overlap = min(lx1, ix1) - max(lx0, ix0)
    if overlap > 8:
        d *= 0.45
    # Small bonus if the label sits just below or just above.
    if lx0 < ix1 and lx1 > ix0:
        if 0 <= ly0 - iy1 <= 40 or 0 <= iy0 - ly1 <= 40:
            d *= 0.6
    return d


def save_clip(page, bbox, dest: Path) -> None:
    rect = pymupdf.Rect(*bbox)
    rect = rect & page.rect
    if rect.width < 8 or rect.height < 8:
        raise ValueError("clip too small")
    pix = page.get_pixmap(matrix=pymupdf.Matrix(ZOOM, ZOOM), clip=rect, alpha=False)
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".png")
    pix.save(str(tmp))
    im = Image.open(tmp).convert("RGB")
    im.thumbnail((900, 900))
    im.save(dest, "JPEG", quality=82, optimize=True, progressive=True)
    tmp.unlink(missing_ok=True)


def dest_for(code: str, color: str) -> Path:
    return IMG_DIR / f"pdf-{slug(code)}-{slug(color)}.jpg"


def record(mapping: dict, code: str, color: str, rel: str, note: str) -> None:
    mapping[f"{code}|{color}"] = {
        "file": rel,
        "source": "pdf",
        "note": note,
    }


def assign_nearest(
    page,
    code: str,
    colors: list[str],
    mapping: dict,
    *,
    max_dist: float = 210,
    min_h: float = 70,
    allow_swatch_fallback: bool = False,
    extra_aliases: dict[str, str] | None = None,
) -> list[str]:
    images = [b for b in page_images(page) if (b[3] - b[1]) >= min_h or (b[2] - b[0]) >= 90]
    aliases = extra_aliases or {}
    search_names = list(colors) + list(aliases.keys())
    labels: list[tuple[str, tuple[float, float, float, float]]] = []
    for bbox, text in page_spans(page):
        if SKIP_LABEL.search(text) and not re.search(r"linen\s*[–-]\s*(white|ivory)", text, re.I):
            continue
        for color, i, j in split_color_hits(text, search_names):
            color = aliases.get(color, color)
            if color not in colors:
                continue
            labels.append((color, span_subset_bbox(bbox, text, i, j)))
    # One label per color — closest to any unused image.
    claimed_img: set[int] = set()
    claimed_color: set[str] = set()
    found = []
    # Greedy: smallest distance first.
    pairs = []
    for color, lb in labels:
        for idx, ib in enumerate(images):
            d = dist_label_image(lb, ib)
            if d <= max_dist:
                pairs.append((d, color, idx, lb, ib))
    pairs.sort(key=lambda t: t[0])
    for d, color, idx, lb, ib in pairs:
        if color in claimed_color or idx in claimed_img:
            continue
        dest = dest_for(code, color)
        save_clip(page, ib, dest)
        rel = f"images/achim/{dest.name}"
        record(mapping, code, color, rel, f"dist={d:.1f}")
        claimed_color.add(color)
        claimed_img.add(idx)
        found.append(color)
    if allow_swatch_fallback:
        for color, lb in labels:
            if color in claimed_color:
                continue
            x0, y0, x1, y1 = lb
            cx = (x0 + x1) / 2
            side = max(48.0, (x1 - x0) * 1.6)
            sw = (cx - side / 2, y0 - side - 6, cx + side / 2, y0 - 4)
            dest = dest_for(code, color)
            try:
                save_clip(page, sw, dest)
            except ValueError:
                continue
            rel = f"images/achim/{dest.name}"
            record(mapping, code, color, rel, "swatch-above-label")
            claimed_color.add(color)
            found.append(color)
    return found


def extract_window(mapping: dict, catalog: dict[str, set[str]]) -> None:
    doc = pymupdf.open(WINDOW_PDF)

    def put(page, code, color, bbox, note):
        dest = dest_for(code, color)
        save_clip(page, bbox, dest)
        record(mapping, code, color, f"images/achim/{dest.name}", note)

    # p2 vinyl roller — White hero + Ivory linen swatch only (other colors are not pictured).
    p = doc[1]
    put(p, "ACH-SHADE-ROLLER-LF", "White", (18, 84, 369, 515), "roller-hero-white")
    put(p, "ACH-SHADE-ROLLER-LF", "Ivory", (560, 134, 678, 245), "roller-linen-ivory")
    for color in ("White", "Ivory"):
        src = mapping.get("ACH-SHADE-ROLLER-LF|" + color)
        if src:
            mapping["ACH-SHADE-ROLLER-RD|" + color] = dict(src)
    mapping.pop("ACH-SHADE-ROLLER-LF|Black", None)

    # p5 Horizon / Monaco. White = left lifestyle; Alabaster = the beige chip between photos.
    p = doc[4]
    put(p, "ACH-BLIND-HORIZON", "White", (32, 240, 314, 523), "horizon-left")
    put(p, "ACH-BLIND-HORIZON", "Alabaster", (310, 400, 388, 458), "horizon-alabaster-chip")
    put(p, "ACH-BLIND-MONACO", "White", (405, 240, 687, 522), "monaco-right")

    # Morningstar page 7 (64" drop) — five separate product shots. Do not use nearest-image:
    # the Grey caption sits inside the White photo's bbox and would swap them.
    p = doc[6]
    put(p, "ACH-BLIND-MORNINGSTAR", "Woodtone", (485, 124, 592, 292), "ms-woodtone")
    put(p, "ACH-BLIND-MORNINGSTAR", "Alabaster", (602, 125, 706, 293), "ms-alabaster")
    put(p, "ACH-BLIND-MORNINGSTAR", "White", (481, 340, 535, 493), "ms-white")
    put(p, "ACH-BLIND-MORNINGSTAR", "Black", (601, 323, 707, 491), "ms-black")
    put(p, "ACH-BLIND-MORNINGSTAR", "Grey", (548, 278, 645, 406), "ms-grey")

    # Sundown p9
    assign_nearest(
        doc[8],
        "ACH-BLIND-SUNDOWN",
        sorted(catalog.get("ACH-BLIND-SUNDOWN", [])),
        mapping,
        max_dist=200,
        min_h=110,
    )

    # Luna p10
    assign_nearest(
        doc[9],
        "ACH-BLIND-LUNA",
        sorted(catalog.get("ACH-BLIND-LUNA", [])),
        mapping,
        max_dist=200,
        min_h=140,
    )

    # Madera p11 — three product shots left-to-right: Grey, Mahogany, White.
    p = doc[10]
    shots = [b for b in page_images(p) if 90 < (b[2] - b[0]) < 140 and (b[3] - b[1]) > 140]
    shots.sort(key=lambda b: b[0])
    madera_order = ["Grey", "Mahogany", "White"]
    if len(shots) >= 3:
        for color, box in zip(madera_order, shots[:3]):
            dest = dest_for("ACH-BLIND-MADERA", color)
            save_clip(p, box, dest)
            record(mapping, "ACH-BLIND-MADERA", color, f"images/achim/{dest.name}", "madera-ltr")
    else:
        assign_nearest(p, "ACH-BLIND-MADERA", madera_order, mapping, max_dist=240, min_h=140)

    # Honeycomb p12
    assign_nearest(
        doc[11],
        "ACH-SHADE-HONEYCOMB",
        sorted(catalog.get("ACH-SHADE-HONEYCOMB", [])),
        mapping,
        max_dist=200,
        min_h=110,
    )

    # TDBU p13
    assign_nearest(
        doc[12],
        "ACH-SHADE-TDBU-CELL",
        sorted(catalog.get("ACH-SHADE-TDBU-CELL", [])),
        mapping,
        max_dist=220,
        min_h=70,
    )

    # Celestial p14
    assign_nearest(
        doc[13],
        "ACH-SHADE-CELESTIAL",
        sorted(catalog.get("ACH-SHADE-CELESTIAL", [])),
        mapping,
        max_dist=200,
        min_h=70,
    )

    # Glide n Go p15
    assign_nearest(
        doc[14],
        "ACH-SHADE-GLIDENGO",
        sorted(catalog.get("ACH-SHADE-GLIDENGO", [])),
        mapping,
        max_dist=220,
        min_h=140,
    )

    # Roman p17 — allow the large White hero.
    assign_nearest(
        doc[16],
        "ACH-SHADE-ROMAN-BO",
        sorted(catalog.get("ACH-SHADE-ROMAN-BO", [])),
        mapping,
        max_dist=240,
        min_h=200,
    )


def extract_floor(mapping: dict, catalog: dict[str, set[str]], need: dict[str, set[str]]) -> None:
    doc = pymupdf.open(FLOOR_PDF)

    want = missing_colors("ACH-TIVOLI-TILE", catalog, mapping, need)
    if want:
        assign_nearest(doc[1], "ACH-TIVOLI-TILE", want, mapping, max_dist=160, min_h=50)

    want = missing_colors("ACH-RETRO-TILE", catalog, mapping, need)
    if want:
        for pi in range(2, 7):
            still = missing_colors("ACH-RETRO-TILE", catalog, mapping, need)
            if not still:
                break
            assign_nearest(doc[pi], "ACH-RETRO-TILE", still, mapping, max_dist=150, min_h=50)

    want = missing_colors("ACH-PALAZZO-TILE", catalog, mapping, need)
    if want:
        assign_nearest(doc[7], "ACH-PALAZZO-TILE", want, mapping, max_dist=160, min_h=60)

    # Tivoli II — the 6 colorways are the wide, short plank strips, not the QR / package banner.
    p = doc[9]
    tivoli2_strips = {
        "3 Plank Maple": (119, 356, 349, 392),
        "Medium Oak": (121, 415, 351, 451),
        "Redwood": (117, 479, 347, 515),
        "Silver Spruce": (366, 356, 596, 393),
        "Mahogany": (367, 415, 597, 451),
        "Silverton": (367, 477, 597, 513),
    }
    for color in missing_colors("ACH-TIVOLI2-PLANK", catalog, mapping, need):
        box = tivoli2_strips.get(color)
        if not box:
            continue
        dest = dest_for("ACH-TIVOLI2-PLANK", color)
        save_clip(p, box, dest)
        record(mapping, "ACH-TIVOLI2-PLANK", color, f"images/achim/{dest.name}", "tivoli2-strip")

    assign_nearest(
        doc[11],
        "ACH-NEXUS-CARPET-50",
        sorted(need.get("ACH-NEXUS-CARPET-50") or catalog.get("ACH-NEXUS-CARPET-50", [])),
        mapping,
        max_dist=200,
        min_h=90,
    )


def extract_alveron(mapping: dict, catalog: dict[str, set[str]]) -> None:
    doc = pymupdf.open(ALVERON_PDF)
    p = doc[0]
    colors = [
        "Natural Drift",
        "Canyon Hickory",
        "Whiskey Oak",
        "Cashmere Oak",
        "Heritage Mahogany",
        "Seaside Linen",
    ]
    chips = [b for b in page_images(p) if 100 < (b[2] - b[0]) < 140 and 30 < (b[3] - b[1]) < 55]
    chips.sort(key=lambda b: (round(b[1] / 10), b[0]))
    if len(chips) >= 6:
        for color, box in zip(colors, chips[:6]):
            dest = dest_for("ALV-CLICK-PLANK", color)
            save_clip(p, box, dest)
            record(mapping, "ALV-CLICK-PLANK", color, f"images/achim/{dest.name}", "alveron-chip")
        return
    assign_nearest(p, "ALV-CLICK-PLANK", colors, mapping, max_dist=80, min_h=30, allow_swatch_fallback=True)


def missing_colors(code: str, catalog: dict[str, set[str]], mapping: dict, need: dict[str, set[str]] | None = None) -> list[str]:
    wanted = need.get(code, catalog.get(code, set())) if need is not None else catalog.get(code, set())
    have = set()
    for k, meta in mapping.items():
        if not str(k).startswith(code + "|"):
            continue
        if not (isinstance(meta, dict) and meta.get("file") and "logo" not in meta.get("file", "")):
            continue
        rest = str(k).split("|", 1)[1]
        have.add(rest)
    return sorted(c for c in wanted if c not in have and f"{code}|{c}" not in mapping)


def fill_from_website(mapping: dict, catalog: dict[str, set[str]], need: dict[str, set[str]]) -> None:
    """Add CODE|COLOR from achimhomedecor.com when the sell sheet had no crop."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "fetch_achim_images", ROOT / "scripts" / "fetch_achim_images.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    xml_bytes = mod.fetch(mod.SITEMAP_URL)
    products = mod.parse_sitemap(xml_bytes)

    aliases = {
        "grey": ["grey", "gray"],
        "dove grey": ["dove-grey", "dove-gray"],
        "3 plank maple": ["maple", "3-plank", "3-plank-maple"],
        "carerra": ["carera", "carrera"],
        "swirls-toffee": ["swirls-toffee"],
        "villa-toffee": ["villa-toffee"],
        "medium oak": ["medium-oak", "hazel-ash"],
        "redwood": ["redwood", "rustic-oak"],
    }

    for code in NEED_COLOR_PHOTOS:
        wanted = need.get(code) or catalog.get(code, set())
        for color in sorted(wanted):
            key = f"{code}|{color}"
            meta = mapping.get(key)
            if isinstance(meta, dict) and meta.get("file") and "logo" not in meta.get("file", ""):
                continue
            needles = [mod.hyph(color)]
            needles += aliases.get(color.lower(), [])
            m = re.match(r"^#(\d+)\s+(.*)$", color)
            if m:
                needles.append(m.group(1))
                needles.append(mod.hyph(m.group(2)))
            best = None
            best_score = 0
            for p in products:
                if not mod.family_match(code, p["slug"], ""):
                    continue
                slug = p["slug"]
                score = 0
                for n in needles:
                    if n and n in slug:
                        score = max(score, 20 + min(len(n), 20))
                if score > best_score:
                    best_score = score
                    best = p
            if not best or best_score < 20:
                continue
            mid = mod.media_id(best["image"])
            dest = IMG_DIR / f"{mid}.jpg"
            rel = f"images/achim/{dest.name}"
            if not (dest.exists() and dest.stat().st_size > 2000):
                try:
                    raw = mod.fetch(mod.cdn_small(best["image"]))
                    mod.save_jpeg(raw, dest)
                except Exception:
                    continue
            mapping[key] = {
                "slug": best["slug"],
                "source": best["image"],
                "page": best["loc"],
                "file": rel,
                "note": "website-color",
            }


def main() -> None:
    catalog = load_catalog_colors()
    need = colors_needing_photos()
    data = load_map()
    images: dict = data["images"]
    before = set(images)

    extract_window(images, catalog)
    extract_alveron(images, catalog)
    extract_floor(images, catalog, need)

    try:
        fill_from_website(images, catalog, need)
    except Exception as exc:  # noqa: BLE001
        print("website fill skipped:", exc)

    data["images"] = images
    MAP_PATH.write_text(json.dumps(data, indent=2) + "\n")
    added = [k for k in images if k not in before or images[k].get("source") == "pdf" or images[k].get("note") in ("pdf", "website-color", "alveron-chip", "madera-ltr", "horizon-left", "monaco-right", "swatch-above-label") or str(images[k].get("note", "")).startswith("dist=")]
    pdf_keys = [k for k, v in images.items() if isinstance(v, dict) and (v.get("source") == "pdf" or str(v.get("note", "")).startswith("dist=") or v.get("note") in ("alveron-chip", "madera-ltr", "horizon-left", "monaco-right", "swatch-above-label"))]
    print(f"PDF/color keys written: {len(pdf_keys)}")
    for k in sorted(pdf_keys):
        print(f"  {k:42} {images[k].get('file')}  ({images[k].get('note')})")


if __name__ == "__main__":
    main()
