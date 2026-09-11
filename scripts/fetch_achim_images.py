#!/usr/bin/env python3
"""Match Achim catalog rows to product photos on achimhomedecor.com.

Reads the public Wix product sitemap, maps each ACH-* CSV row to a product
image, downloads a resized JPEG under images/achim/, writes
assets/achim-image-map.json, and patches the Image column on Achim rows.

Re-run is idempotent: existing files are reused. Unmatched rows keep the logo.
"""
from __future__ import annotations

import csv
import io
import json
import re
import ssl
import sys
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "assets" / "products.csv"
MAP_PATH = ROOT / "assets" / "achim-image-map.json"
IMG_DIR = ROOT / "images" / "achim"
SITEMAP_URL = "https://www.achimhomedecor.com/store-products-sitemap.xml"
UA = "AllProBuildingSuppliesCatalog/1.0 (+https://allprobuildingsupplies.com)"
NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
    "image": "http://www.google.com/schemas/sitemap-image/1.1",
}

GENERIC_SIZES = {"standard", "stock widths", "stock", "widths"}
SIZE_ALIASES = {
    "van clover": "van-cleef",
    "carera": "carerra",
    "carrera marble": "carrera-marble",
    "cozy cafe": "cozy-caf",
    "black and white": "black-white",
    "classic white grey veins": "classic-white-with-grey-veins",
    "black white vein marble": "black-with-white-vein-marble",
    "buffalo check": "buffalo-check-taupe",
    "solid": "",
    "1-2-3": "1-2-3",
    "glide n go": "glide-n-go",
}

# Extra slug fragments a family must / must-not contain.
FAMILY_RULES: dict[str, dict] = {
    "ACH-PORTFOLIO-TILE": {"all": ["portfolio"]},
    "ACH-STERLING-TILE": {"all": ["sterling"], "any": ["12x12", "12-x12"], "forbid": ["6x36"]},
    "ACH-STERLING-PARQUET": {"all": ["sterling", "parquet"]},
    "ACH-STERLING-PLANK-2MM": {"all": ["sterling", "6x36"], "any": ["2-0mm", "2mm"]},
    "ACH-STERLING-PLANK-12MM": {"all": ["sterling", "6x36"], "any": ["1-2mm", "1-2-mm"]},
    "ACH-TIVOLI-TILE": {"all": ["tivoli"], "forbid": ["tivoli-ii", "plank"]},
    "ACH-TIVOLI2-PLANK": {"all": ["tivoli-ii"]},
    "ACH-NEXUS-TILE": {"all": ["nexus"], "any": ["vinyl-floor-tile", "vinyl"], "forbid": ["plank", "carpet", "6x36"]},
    "ACH-NEXUS-PLANK": {"all": ["nexus", "plank"]},
    "ACH-NEXUS-CARPET": {"all": ["nexus"], "forbid": ["vinyl", "plank", "6x36"]},
    "ACH-FLEXFLOR-PLANK": {"all": ["flex-flor"]},
    "ACH-FLOORGALORE-TILE": {"all": ["5-2-x-5-2"]},
    "ACH-PALAZZO-TILE": {"all": ["12-x-24"]},
    "ACH-ARABESQUE-TILE": {"all": ["12-x12-self-adhesive-vinyl-floor-tile"], "forbid": ["12-x-24", "5-2"]},
    "ACH-MAJESTIC-TILE": {"all": ["majestic"]},
    "ACH-RETRO-TILE": {"all": ["retro"]},
    "ACH-FOAM-TILE": {"all": ["interlocking-foam"]},
    "ACH-OUTDOORZ-DECK": {"all": ["outdoorz"]},
    "ACH-CAPRI-RUG": {"all": ["capri"]},
    "ACH-MAT-COCO": {"all": ["coco-entrance"]},
    "ACH-MAT-COIR": {"all": ["printed-coir"]},
    "ACH-MAT-FATIGUE-ARLINGTON": {"all": ["anti-fatigue-mat", "arlington"]},
    "ACH-MAT-FATIGUE-CLARKE": {"all": ["anti-fatigue-mat", "clarke"]},
    "ACH-MAT-FATIGUE-LLL": {"all": ["anti-fatigue-mat", "live-love-laugh"]},
    "ACH-MAT-FATIGUE-PRINT": {"all": ["anti-fatigue-mat"], "forbid": ["arlington", "clarke", "live-love-laugh"]},
    "ACH-MAT-LEATHER-1830": {"all": ["faux-leather", "18x30"]},
    "ACH-MAT-LEATHER-2039": {"all": ["faux-leather", "20x39"]},
    "ACH-MAT-MEMORY-ELLE": {"all": ["memory-foam", "elle"]},
    "ACH-MAT-MEMORY-MADISON": {"all": ["memory-foam", "madison"]},
    "ACH-MAT-RUBBER": {"all": ["welcome-outdoor-rubber"]},
    "ACH-MAT-WROUGHT": {"all": ["wrought-iron"]},
    "ACH-BLIND-LUNA": {"all": ["luna"]},
    "ACH-BLIND-MADERA": {"all": ["madera"]},
    "ACH-BLIND-MORNINGSTAR": {"all": ["morningstar"]},
    "ACH-BLIND-SOLSTICE": {"all": ["solstice"]},
    "ACH-BLIND-SUNDOWN": {"all": ["sundown"]},
    "ACH-BLIND-VERANDA": {"all": ["veranda"]},
    "ACH-SHADE-123-PLEAT": {"all": ["1-2-3"]},
    "ACH-SHADE-BUFFALO-ROMAN": {"all": ["buffalo-check", "roman"]},
    "ACH-SHADE-CELESTIAL": {"all": ["celestial"]},
    "ACH-SHADE-GLIDENGO": {"all": ["glide-n-go"]},
    "ACH-SHADE-HONEYCOMB": {"all": ["honeycomb"], "forbid": ["top-down"]},
    "ACH-SHADE-JUTE": {"all": ["jute"]},
    "ACH-SHADE-ROMAN-BO": {"all": ["blackout-roman"]},
    "ACH-SHADE-TDBU-CELL": {"all": ["top-down-bottom-up"]},
    "ACH-SHADE-TEAR-LF": {"all": ["tear-down", "light-filtering"]},
    "ACH-SHADE-TEAR-RD": {"all": ["tear-down", "room-darkening"]},
    "ACH-ROD-BUONO2": {"all": ["buono-ii"]},
    "ACH-ROD-CAMINO": {"all": ["camino"]},
    "ACH-ROD-METALLO": {"all": ["metallo"]},
}

# Trailing product-type words stripped from a description to leave the name.
NAME_TRAILING = {
    "window", "curtain", "curtains", "panel", "panels", "set", "pair", "valance",
    "tier", "swag", "printed", "embellished", "cottage", "grommet", "rod",
    "pocket", "lined", "pinch", "pleat", "single", "double", "layered", "hidden",
    "back", "tab", "front", "piece", "6-piece", "5-piece", "4-piece", "6", "5",
    "4", "pc", "shade", "pickup", "pick", "up", "and",
}

CURTAIN_SLUG_FORBID = (
    "anti-fatigue", "pillow", "pot-holder", "napkin", "chair", "cushion",
    "coir", "entrance-mat", "door-mat", "air-mattress",
)

FAMILY_DEFAULT_SLUG = {
    "ACH-ARABESQUE-TILE": "12-x12-self-adhesive-vinyl-floor-tile",
    "ACH-FOAM-TILE": "interlocking-foam-24x24-anti-fatigue-floor-tiles-4-tiles-16-sq-ft",
    "ACH-ROD-METALLO": "metallo-decorative-rod-finial",
    "ACH-SHADE-CELESTIAL": "cordless-celestial-sheer-double-layered-shade-linen-1",
    "ACH-SHADE-JUTE": "cords-free-privacy-jute-shade-2",
    "ACH-BLIND-MORNINGSTAR": "cordless-gii-morningstar-1-light-filtering-mini-blind-1",
}


def hyph(text: str) -> str:
    s = str(text).lower().replace("&", " and ").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return re.sub(r"-+", "-", s).strip("-")


def sku_num(size: str) -> str | None:
    m = re.fullmatch(r"#?\s*(\d{3})\s*", str(size).strip())
    return m.group(1) if m else None


def size_needles(size: str) -> list[str]:
    raw = str(size).strip()
    if not raw or raw.lower() in GENERIC_SIZES:
        return []
    alias = SIZE_ALIASES.get(raw.lower())
    if alias is not None:
        return [alias] if alias else []
    n = sku_num(raw)
    if n:
        return [n]
    slug = hyph(raw)
    slug = slug.replace("grey", "gray") if "gray" in slug or "grey" in slug else slug
    # Also keep original grey spelling as alternate.
    return [slug]


def family_match(code: str, slug: str, desc: str) -> bool:
    rules = FAMILY_RULES.get(code)
    if rules:
        return _apply_rules(slug, rules)
    if code.startswith("ACH-CURTAIN-"):
        return curtain_family_match(code, slug, desc)
    return False


def _apply_rules(slug: str, rules: dict) -> bool:
    for t in rules.get("all") or []:
        if t not in slug:
            return False
    any_need = rules.get("any") or []
    if any_need and not any(t in slug for t in any_need):
        return False
    for t in rules.get("forbid") or []:
        if t in slug:
            return False
    return True


def curtain_name_slug(desc: str) -> str:
    parts = hyph(desc).split("-")
    while parts and parts[-1] in NAME_TRAILING:
        parts.pop()
    name = "-".join(parts)
    return name


def _slug_has_name(slug: str, name: str) -> bool:
    if not name:
        return False
    if name in slug or slug in (name, name + "-1"):
        return True
    if slug.startswith(name + "-"):
        return True
    return name.replace("-", "") in slug.replace("-", "")


def curtain_family_match(code: str, slug: str, desc: str) -> bool:
    if any(bad in slug for bad in CURTAIN_SLUG_FORBID):
        return False
    name = curtain_name_slug(desc)
    if not _slug_has_name(slug, name):
        return False
    d = desc.lower()
    short_ok = slug in (name, name + "-1")
    if "french door" in d:
        return "french-door" in slug
    if "tie up" in d or "tie-up" in d:
        return "tie-up" in slug
    if "scarf" in d:
        return "scarf" in slug
    if "swag" in d and "set" not in d:
        return "swag" in slug
    if "5-piece" in d or "5 piece" in d:
        return "5-piece" in slug or "5-pc" in slug
    if "6-piece" in d or "6 piece" in d:
        return "6-piece" in slug or "6-pc" in slug
    if "valance" in d and "tier" in d:
        return "tier" in slug and "valance" in slug
    if "valance" in d and "set" not in d:
        return "valance" in slug and "set" not in slug
    if "tier" in d and "set" not in d and "valance" not in d:
        return "tier" in slug and "set" not in slug
    if "panel" in d:
        if "french-door" in slug:
            return False
        return "panel" in slug or short_ok
    if "set" in d:
        return "set" in slug or "5-piece" in slug or "6-piece" in slug or "6-pc" in slug
    return True


def score_candidate(code: str, size: str, slug: str) -> int:
    needles = size_needles(size)
    if not needles:
        # Family-only match: prefer a dedicated product page, not a numbered duplicate.
        score = 12 - min(len(slug) // 25, 4)
        if slug.endswith("-1") or slug.endswith("-2") or slug.endswith("-3"):
            score -= 4
        return score

    sku = sku_num(size)
    if sku:
        if re.search(rf"(^|-){sku}$", slug):
            return 100
        if re.search(rf"(^|-){sku}-\d+$", slug):
            return 40
        return -1

    score = 0
    slug_norm = slug.replace("grey", "gray")
    for needle in needles:
        n = needle.replace("grey", "gray")
        if not n:
            # Foam "Solid" = unsuffixed generic foam page.
            extra = ("ash", "pine", "charcoal")
            if any(x in slug for x in extra):
                return -1
            return 20
        parts = [p for p in n.split("-") if p]
        if all(p in slug_norm or p in slug for p in parts):
            score += 8 * len(parts)
            # Prefer the slug that actually contains the hyphenated phrase.
            if n in slug or n in slug_norm:
                score += 12
        else:
            # Dimensional sizes: 54x72 vs 54-x-72 vs 54-x72
            dim = re.fullmatch(r"(\d+)x(\d+)", n)
            if dim:
                a, b = dim.group(1), dim.group(2)
                variants = [f"{a}x{b}", f"{a}-x-{b}", f"{a}-x{b}", f"{a}x-{b}"]
                if any(v in slug for v in variants):
                    score += 16
                else:
                    return -1
            else:
                return -1
    if slug.endswith("-1") or slug.endswith("-2"):
        score -= 2
    return score


def parse_sitemap(xml_bytes: bytes) -> list[dict]:
    root = ET.fromstring(xml_bytes)
    out = []
    for url in root.findall("sm:url", NS):
        loc = url.findtext("sm:loc", default="", namespaces=NS)
        slug = loc.rstrip("/").split("/")[-1]
        imgs = [
            im.findtext("image:loc", default="", namespaces=NS)
            for im in url.findall("image:image", NS)
        ]
        imgs = [i for i in imgs if i]
        if not loc or not imgs:
            continue
        out.append({"slug": slug, "loc": loc, "image": imgs[0]})
    return out


def fetch(url: str) -> bytes:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=45) as resp:
        return resp.read()


def cdn_small(url: str) -> str:
    return re.sub(r"/v1/fit/w_\d+,h_\d+,q_\d+/", "/v1/fit/w_800,h_800,q_80/", url)


def media_id(url: str) -> str:
    m = re.search(r"/media/([^/]+?)(?:~mv2)?\.(?:jpg|jpeg|png|webp|JPG)", url)
    if m:
        return re.sub(r"[^A-Za-z0-9_]+", "", m.group(1))[:80]
    return re.sub(r"[^A-Za-z0-9]+", "", url)[-40:]


def save_jpeg(raw: bytes, dest: Path) -> None:
    im = Image.open(io.BytesIO(raw))
    im = im.convert("RGB")
    im.thumbnail((800, 800))
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "JPEG", quality=75, optimize=True, progressive=True)


def match_rows(rows: list[dict], products: list[dict]) -> tuple[dict[str, dict], list[str]]:
    mapping: dict[str, dict] = {}
    unmatched: list[str] = []
    for row in rows:
        code, size = row["Code"], row["Size"]
        key = f"{code}|{size}"
        cands = []
        for p in products:
            if not family_match(code, p["slug"], row.get("Description") or ""):
                continue
            sc = score_candidate(code, size, p["slug"])
            if sc >= 0:
                cands.append((sc, p))
        cands.sort(key=lambda t: (-t[0], len(t[1]["slug"])))
        default_slug = FAMILY_DEFAULT_SLUG.get(code)
        if (not cands or cands[0][0] < 8) and default_slug:
            fallback = next((p for p in products if p["slug"] == default_slug), None)
            if fallback:
                cands = [(8, fallback)]
        if not cands or cands[0][0] < 8:
            unmatched.append(f"{key}  (best={cands[0][0] if cands else 'none'} {cands[0][1]['slug'] if cands else ''})")
            continue
        best = cands[0][1]
        mapping[key] = {
            "slug": best["slug"],
            "source": best["image"],
            "page": best["loc"],
            "score": cands[0][0],
        }
    return mapping, unmatched


def main() -> None:
    print("Fetching sitemap…")
    xml_bytes = fetch(SITEMAP_URL)
    products = parse_sitemap(xml_bytes)
    print(f"Sitemap products with images: {len(products)}")

    with CSV_PATH.open(newline="") as f:
        rows = list(csv.DictReader(f))
    achim = [r for r in rows if str(r.get("Code", "")).startswith("ACH-")]
    mapping, unmatched = match_rows(achim, products)
    print(f"Matched {len(mapping)} / {len(achim)}")
    if unmatched:
        print(f"Unmatched {len(unmatched)}:")
        for line in unmatched:
            print("  ", line)

    # Download unique source images.
    uniq: dict[str, str] = {}
    for meta in mapping.values():
        src = meta["source"]
        mid = media_id(src)
        uniq[src] = mid

    IMG_DIR.mkdir(parents=True, exist_ok=True)
    path_for_id: dict[str, str] = {}

    def dl(src: str, mid: str) -> tuple[str, str, str | None]:
        dest = IMG_DIR / f"{mid}.jpg"
        rel = f"images/achim/{mid}.jpg"
        if dest.exists() and dest.stat().st_size > 2000:
            return mid, rel, None
        last_err = None
        for url in (cdn_small(src), src):
            try:
                raw = fetch(url)
                save_jpeg(raw, dest)
                return mid, rel, None
            except Exception as e:  # noqa: BLE001
                last_err = str(e)
        return mid, rel, last_err

    errors = []
    print(f"Downloading {len(uniq)} unique photos…")
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = [pool.submit(dl, src, mid) for src, mid in uniq.items()]
        done = 0
        for fut in as_completed(futs):
            mid, rel, err = fut.result()
            path_for_id[mid] = rel
            done += 1
            if err:
                errors.append(f"{mid}: {err}")
            if done % 25 == 0 or done == len(uniq):
                print(f"  {done}/{len(uniq)}")

    file_map: dict[str, str] = {}
    for key, meta in mapping.items():
        mid = media_id(meta["source"])
        rel = path_for_id.get(mid)
        dest = ROOT / rel if rel else None
        if dest and dest.exists() and dest.stat().st_size > 2000:
            file_map[key] = rel
            meta["file"] = rel
        else:
            unmatched.append(f"{key}  (download failed)")

    MAP_PATH.write_text(json.dumps({"images": mapping, "unmatched": unmatched}, indent=2) + "\n")

    # Patch CSV Image column for Achim rows only.
    fieldnames = list(rows[0].keys())
    for r in rows:
        if not str(r.get("Code", "")).startswith("ACH-"):
            continue
        key = f"{r['Code']}|{r['Size']}"
        r["Image"] = file_map.get(key, "images/logo.png")
    with CSV_PATH.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)

    have = sum(1 for r in rows if str(r.get("Code", "")).startswith("ACH-") and r["Image"] != "images/logo.png")
    print(f"Wrote {have} Achim image paths into products.csv")
    print(f"Unique files: {len({p for p in file_map.values()})}")
    print(f"Map: {MAP_PATH}")
    if errors:
        print(f"Download errors ({len(errors)}):")
        for e in errors[:20]:
            print("  ", e)
    sys.exit(0)


if __name__ == "__main__":
    main()
