#!/usr/bin/env python3
"""Build Achim + Alveron catalog rows and rewrite Achim/Alveron lines in assets/products.csv.

Priced lines come from the Baruch 8-27-26 Achim price books and the Alveron
Click-Lock spec sheet. Selling price = wholesale COST × 1.25, rounded to cents.

One Code per product family. Size is the real dimension (12x12, 23x64, …).
Color is the pattern / finish. Unpriced Achim lines (curtains, rugs, mats, rods,
and collections not in the books) keep Color/Size split and blank Price.

Re-run is idempotent: existing ACH-* and ALV-* rows are replaced. Plumbing is kept.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV_PATH = ROOT / "assets" / "products.csv"
IMAGE_MAP_PATH = ROOT / "assets" / "achim-image-map.json"

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

IMG = "images/logo.png"
IMAGE_MAP: dict = {}
if IMAGE_MAP_PATH.exists():
    raw = json.loads(IMAGE_MAP_PATH.read_text())
    IMAGE_MAP = raw.get("images", raw) if isinstance(raw, dict) else {}

MARKUP = 1.25


def sell(cost: float | None) -> str:
    if cost is None:
        return ""
    return f"{round(float(cost) * MARKUP + 1e-12, 2):.2f}"


def slug_tokens(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(text or "").lower()).strip()


def resolve_image(code: str, size: str, color: str) -> str:
    candidates = []
    color = str(color or "").strip()
    size = str(size or "").strip()
    if color:
        candidates.append(f"{code}|{color}")
        candidates.append(f"{code}|{size}|{color}")
        m = re.match(r"^(#\d+)\s+(.*)$", color)
        if m:
            candidates.append(f"{code}|{m.group(1)}")
            candidates.append(f"{code}|{m.group(2)}")
        if re.match(r"^#\d+$", color):
            candidates.append(f"{code}|{color}")
    candidates.append(f"{code}|{size}")
    candidates.append(f"{code}|Stock widths")
    for key in candidates:
        meta = IMAGE_MAP.get(key)
        if isinstance(meta, dict) and meta.get("file"):
            return meta["file"]
        if isinstance(meta, str) and meta:
            return meta
    color_l = slug_tokens(color)
    prefix = code + "|"
    best = ""
    best_score = 0
    for key, meta in IMAGE_MAP.items():
        if not str(key).startswith(prefix):
            continue
        rest = slug_tokens(str(key)[len(prefix) :])
        if not rest:
            continue
        score = 0
        if color_l and (rest == color_l or rest in color_l or color_l in rest):
            score = 40 + min(len(rest), 20)
        if score > best_score:
            file = ""
            if isinstance(meta, dict):
                file = meta.get("file") or ""
            elif isinstance(meta, str):
                file = meta
            if file:
                best = file
                best_score = score
    return best or IMG


def make_row(
    *,
    material: str,
    code: str,
    desc: str,
    size: str,
    color: str,
    pack: int | str,
    main: str,
    sub: str,
    subsub: str,
    sss: str,
    cost: float | None = None,
    price: str | None = None,
) -> dict[str, str]:
    size = " ".join(str(size).split())
    color = " ".join(str(color).split())
    if price is None:
        price = sell(cost)
    return {
        "Material": material,
        "Code": code,
        "Description": desc,
        "Size": size,
        "Color": color,
        "Pack": str(pack),
        "Qty": "0",
        "Price": price,
        "Image": resolve_image(code, size, color),
        "main_category": main,
        "sub_category": sub,
        "sub_sub_category": subsub,
        "sub_sub_sub_category": sss,
        "Tommur-Code": "",
        "Lesso-Code": "",
    }


def cartesian(
    *,
    material: str,
    code: str,
    desc: str,
    sizes: list[str],
    colors: list[str],
    pack: int | str | dict,
    main: str,
    sub: str,
    subsub: str,
    sss: str,
    cost: float | None = None,
    costs: dict[str, float] | None = None,
    color_filter=None,
) -> list[dict[str, str]]:
    out = []
    for size in sizes:
        size = " ".join(str(size).split())
        if not size:
            continue
        for color in colors:
            color = " ".join(str(color).split())
            if color_filter and not color_filter(size, color):
                continue
            if isinstance(pack, dict):
                p = pack.get(size, pack.get("_", 1))
            else:
                p = pack
            c = None if cost is None and not costs else (costs[size] if costs else cost)
            out.append(
                make_row(
                    material=material,
                    code=code,
                    desc=desc,
                    size=size,
                    color=color,
                    pack=p,
                    main=main,
                    sub=sub,
                    subsub=subsub,
                    sss=sss,
                    cost=c,
                )
            )
    return out


def colors_only(
    *,
    material: str,
    code: str,
    desc: str,
    size: str,
    colors: list[str],
    pack: int,
    main: str,
    sub: str,
    subsub: str,
    sss: str,
    cost: float | None = None,
) -> list[dict[str, str]]:
    return cartesian(
        material=material,
        code=code,
        desc=desc,
        sizes=[size],
        colors=colors,
        pack=pack,
        main=main,
        sub=sub,
        subsub=subsub,
        sss=sss,
        cost=cost,
    )


def width_of(size: str) -> float:
    m = re.match(r"^(\d+(?:\.\d+)?)", str(size).replace("¼", ".25").replace("-1/4", ".25"))
    return float(m.group(1)) if m else 0.0


def pack_by_width(size: str, small: int, large: int, cutoff: float = 36) -> int:
    return small if width_of(size) <= cutoff else large


# Pattern numbers from the flooring price book, with names where the book (or Tivoli page) lists them.
TIVOLI_NAMES = {
    "103": "Black & White",
    "201": "Classic Parquet Oak",
    "202": "Classic Light Oak Diamond Parquet",
    "204": "Four Finger Square Parquet",
    "205": "White Border Classic Inlaid Parquet",
    "214": "Light Oak Plank Look",
    "223": "Medium Oak Plank Look",
    "224": "Wood Diamond",
    "225": "3 Finger Medium Oak Parquet",
    "229": "Charcoal Grey Wood",
    "230": "Saddlewood",
    "231": "Ash Grey Wood",
    "327": "Marble Blocks",
    "332": "Brick Pavers",
    "450": "Carrera Marble",
    "455": "Bianco Marble",
    "456": "White Slate",
    "457": "Mosaic",
}

NEXUS_NUMBERS = [
    "103", "201", "202", "101", "102", "204", "214", "223", "225", "303", "326",
    "327", "232", "229", "230", "231", "332", "334", "402", "409", "422", "337",
    "423", "425", "444", "448", "446", "456", "449", "450", "455", "457", "458",
    "459", "460", "461", "462",
]

RETRO_COLORS = [
    ("601", "Slate"),
    ("602", "Green Medallion"),
    ("603", "Burch"),
    ("604", "Geometric"),
    ("605", "Prism Marble"),
    ("606", "Navy Pearl"),
    ("607", "Geo Puzzle"),
    ("608", "Diamond"),
    ("609", "Carerra"),
    ("610", "Chevron"),
    ("611", "Octagon"),
    ("612", "Affinity"),
    ("613", "Clover"),
    ("614", "Linen Waves"),
    ("615", "Van Clover"),
    ("616", "Latte"),
    ("617", "Starlight"),
    ("618", "Watercolor Check"),
    ("619", "Edge"),
    ("620", "Mod Diamond"),
    ("621", "Swirls-Toffee"),
    ("622", "Villa-Toffee"),
    ("623", "Woven Marble"),
    ("624", "Onyx Star"),
    ("625", "Scallop"),
    ("626", "Arabesque"),
    ("627", "Marble Criss Cross"),
    ("628", "Stone Herringbone"),
    ("629", "Whitewash Chevron"),
    ("630", "Blonde Herringbone"),
]

PALAZZO_COLORS = [
    ("801", "Opal"),
    ("802", "Quarry Stone"),
    ("803", "Luxe White"),
    ("804", "Azurro Marble"),
    ("805", "Beechwood"),
    ("806", "City Scape Concrete"),
]


def pattern_label(num: str, name: str = "") -> str:
    name = (name or TIVOLI_NAMES.get(num) or "").strip()
    return f"#{num} {name}".strip() if name else f"#{num}"


def build_priced_flooring() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    ft = dict(main="Flooring", sub="Tiles", subsub="Vinyl Tiles", material="Vinyl Tiles")
    rows += colors_only(
        **ft,
        code="ACH-NEXUS-TILE",
        desc="NEXUS 12x12 1.2mm Self-Adhesive Vinyl Floor Tile (20 tiles / 20 sq ft)",
        size="12x12",
        colors=[pattern_label(n) for n in NEXUS_NUMBERS],
        pack=20,
        sss="Nexus 12x12 Vinyl",
        cost=6.50,
    )
    tivoli_nums = [
        "103", "201", "202", "204", "205", "214", "223", "224", "225", "229",
        "230", "231", "327", "332", "450", "455", "456", "457",
    ]
    rows += colors_only(
        **ft,
        code="ACH-TIVOLI-TILE",
        desc="TIVOLI 12x12 1.2mm Self-Adhesive Vinyl Floor Tile (45 tiles / 45 sq ft)",
        size="12x12",
        colors=[pattern_label(n) for n in tivoli_nums],
        pack=45,
        sss="Tivoli 12x12",
        cost=14.70,
    )
    rows += colors_only(
        **ft,
        code="ACH-RETRO-TILE",
        desc="RETRO 12x12 1.5mm Self-Adhesive Vinyl Floor Tile (20 tiles / 20 sq ft)",
        size="12x12",
        colors=[pattern_label(n, name) for n, name in RETRO_COLORS],
        pack=20,
        sss="Retro 12x12",
        cost=13.00,
    )
    rows += colors_only(
        **ft,
        code="ACH-PALAZZO-TILE",
        desc="PALAZZO 12x24 2.0mm Self-Adhesive Vinyl Floor Tile (20 tiles / 40 sq ft)",
        size="12x24",
        colors=[pattern_label(n, name) for n, name in PALAZZO_COLORS],
        pack=20,
        sss="Palazzo 12x24",
        cost=32.00,
    )

    fp = dict(main="Flooring", sub="Planks", subsub="Vinyl Planks", material="Vinyl Planks")
    rows += colors_only(
        **fp,
        code="ACH-NEXUS-PLANK",
        desc="NEXUS 6x36 1.2mm Peel-and-Stick Vinyl Floor Planks (10 planks / 15 sq ft)",
        size="6x36",
        colors=["Walnut", "Saddle", "Light Grey Oak", "Hickory", "White Oak", "Espresso"],
        pack=10,
        sss="Nexus 6x36 1.2mm",
        cost=8.40,
    )
    rows += colors_only(
        **fp,
        code="ACH-TIVOLI2-PLANK",
        desc="TIVOLI II 6x36 2.0mm Peel-and-Stick Vinyl Floor Planks (10 planks / 15 sq ft)",
        size="6x36",
        colors=["Silver Spruce", "Medium Oak", "3 Plank Maple", "Redwood", "Mahogany", "Silverton"],
        pack=10,
        sss="Tivoli II 6x36 2.0mm",
        cost=11.90,
    )
    rows += colors_only(
        material="Carpet Tiles",
        code="ACH-NEXUS-CARPET",
        desc="NEXUS 12x12 Self-Adhesive Carpet Tile (12 tiles / 12 sq ft)",
        size="12x12",
        colors=["Smoke", "Tan", "Burgundy", "Jet", "Navy"],
        pack=12,
        main="Flooring",
        sub="Tiles",
        subsub="Carpet Tiles",
        sss="Nexus Carpet 12x12",
        cost=7.75,
    )
    rows += colors_only(
        material="Carpet Tiles",
        code="ACH-NEXUS-CARPET-50",
        desc="NEXUS 19.7x19.7 Self-Adhesive Carpet Tile (12 tiles / ~32 sq ft)",
        size="19.7x19.7",
        colors=["Smoke", "Jet"],
        pack=12,
        main="Flooring",
        sub="Tiles",
        subsub="Carpet Tiles",
        sss="Nexus Carpet 19.7x19.7",
        cost=19.50,
    )
    rows += colors_only(
        material="Vinyl Planks",
        code="ALV-CLICK-PLANK",
        desc="ALVERON Click-Lock SPC Plank 7.2x48 5mm / 20 mil (10 planks / 24 sq ft)",
        size="7.2x48",
        colors=[
            "Natural Drift",
            "Canyon Hickory",
            "Whiskey Oak",
            "Cashmere Oak",
            "Heritage Mahogany",
            "Seaside Linen",
        ],
        pack=10,
        main="Flooring",
        sub="Planks",
        subsub="Click-Lock",
        sss="Alveron Click-Lock 7.2x48",
        cost=42.00,
    )
    return rows


def build_unpriced_flooring() -> list[dict[str, str]]:
    """Collections not in the Baruch flooring book — keep Color/Size split, quote-only."""
    rows: list[dict[str, str]] = []
    ft = dict(main="Flooring", sub="Tiles", subsub="Vinyl Tiles", material="Vinyl Tiles", cost=None)
    extra_tiles = [
        (
            "ACH-PORTFOLIO-TILE",
            "PORTFOLIO 12x12 2.0mm Self-Adhesive Vinyl Floor Tile",
            "12x12",
            [
                "Walnut Parquet",
                "Blue Diamond",
                "Cobble Mosaic",
                "Rustic Clay Square",
                "Midnight Marble",
                "Ash Grey Wood",
            ],
            "Portfolio 12x12 2.0mm",
        ),
        (
            "ACH-STERLING-TILE",
            "STERLING 12x12 Self-Adhesive Vinyl Floor Tile",
            "12x12",
            [
                "Black",
                "White",
                "Black and White",
                "Medium Oak Plank",
                "Classic White Grey Veins",
                "Black White Vein Marble",
                "Granite",
                "Spanish Rose",
                "Rustic Marble",
                "Gray Speckled Granite",
                "Black Speckled Granite",
                "Light Oak Plank",
                "Ash Grey Wood",
                "Rustic Slate",
                "Carrera Marble",
            ],
            "Sterling 12x12",
        ),
        (
            "ACH-STERLING-PARQUET",
            "STERLING Square Parquet 12x12 Self-Adhesive Vinyl Floor Tile",
            "12x12",
            ["Square Parquet"],
            "Sterling Square Parquet",
        ),
        (
            "ACH-MAJESTIC-TILE",
            "MAJESTIC 18x18 Self-Adhesive Vinyl Floor Tile",
            "18x18",
            ["Light Gray Slate", "Verde Green Marble", "Rustic Copper Slate", "Ghibli Beige Granite"],
            "Majestic 18x18",
        ),
        (
            "ACH-FLOORGALORE-TILE",
            "FLOOR GALORE 5.2x5.2 Self-Adhesive Vinyl Floor Tile",
            "5.2x5.2",
            ["Sandstone Quartz", "Galaxy", "Graphite"],
            "Floor Galore 5.2x5.2",
        ),
        (
            "ACH-ARABESQUE-TILE",
            "ARABESQUE 12x12 Self-Adhesive Floor Tile",
            "12x12",
            ["Arabesque"],
            "Arabesque 12x12",
        ),
    ]
    for code, desc, size, colors, sss in extra_tiles:
        rows += colors_only(**ft, code=code, desc=desc, size=size, colors=colors, pack=1, sss=sss)

    rows += colors_only(
        material="Deck Tiles",
        code="ACH-OUTDOORZ-DECK",
        desc="OUTDOORZ Interlocking Wood Deck Tiles",
        size="12x12",
        colors=["Honey Oak", "Royal Mahogany"],
        pack=1,
        main="Flooring",
        sub="Tiles",
        subsub="Deck Tiles",
        sss="OutdoorZ Deck",
    )
    rows += colors_only(
        material="Foam Tiles",
        code="ACH-FOAM-TILE",
        desc="Interlocking Foam 24x24 Anti-Fatigue Floor Tiles (4 tiles / 16 sq ft)",
        size="24x24",
        colors=["Solid", "Pine", "Ash"],
        pack=4,
        main="Flooring",
        sub="Tiles",
        subsub="Foam Tiles",
        sss="Interlocking Foam 24x24",
    )

    fp = dict(main="Flooring", sub="Planks", subsub="Vinyl Planks", material="Vinyl Planks")
    rows += colors_only(
        **fp,
        code="ACH-STERLING-PLANK-2MM",
        desc="STERLING 6x36 2.0mm Self-Adhesive Vinyl Floor Planks",
        size="6x36",
        colors=["Birchwood", "Driftwood", "Rustic Grey", "Silver Spruce", "Medium Oak"],
        pack=1,
        sss="Sterling 6x36 2.0mm",
    )
    rows += colors_only(
        **fp,
        code="ACH-STERLING-PLANK-12MM",
        desc="STERLING 6x36 1.2mm Self-Adhesive Vinyl Floor Planks",
        size="6x36",
        colors=["Walnut", "Hickory", "White Oak", "Light Grey Oak", "Saddle"],
        pack=1,
        sss="Sterling 6x36 1.2mm",
    )
    rows += colors_only(
        **fp,
        code="ACH-FLEXFLOR-PLANK",
        desc="FLEX FLOR Looselay Vinyl Plank 9x48",
        size="9x48",
        colors=["Dunes", "Smoke", "Whitewash", "Ebony", "Gray", "Rustic Cherry", "Aged Driftwood"],
        pack=1,
        sss="Flex Flor 9x48 Looselay",
    )

    rows += colors_only(
        material="Rugs",
        code="ACH-CAPRI-RUG",
        desc="CAPRI 3-Piece Rug Set (5x7 rug, 22x59 runner, 22x31 mat)",
        size="3-Piece Set",
        colors=[
            "Crosshatch Blue",
            "Baylayage",
            "Soliel",
            "Landon Blue",
            "Landon Tan",
            "Rizzy Blue",
            "Rizzy Grey",
        ],
        pack=1,
        main="Flooring",
        sub="Rugs",
        subsub="Rugs",
        sss="Capri 3-Piece Set",
    )

    mats = [
        (
            "ACH-MAT-COIR",
            "Printed Coir Door Mat 18x30",
            "18x30",
            [
                "Cardinal", "Winter Wonderland", "Snowflake", "Buffalo Check Fall",
                "Welcome Pumpkins", "Autumn Foliage", "Happy Fall", "Dorothy",
                "Ladybug", "Leaves", "Sweet Home", "Go Away", "Home", "Prestige",
                "Welcome Aboard",
            ],
            "Printed Coir 18x30",
        ),
        (
            "ACH-MAT-RUBBER",
            "Welcome Outdoor Rubber Entrance Mat 18x30",
            "18x30",
            [
                "Quarry Stones", "Colorful Plank", "Farmhouse Plank", "Morning Call",
                "Sunflower Field", "Welcome Home", "Welcome Stone",
            ],
            "Welcome Rubber 18x30",
        ),
        (
            "ACH-MAT-COCO",
            "Coco Entrance Mat 18x30",
            "18x30",
            ["Daisy", "Scrolls", "Vines", "Welcome Key", "Flora", "Harlequin", "Milly", "Remi", "Sunrise"],
            "Coco Entrance 18x30",
        ),
        (
            "ACH-MAT-WROUGHT",
            "Wrought Iron Rubber Entrance Mat 18x30",
            "18x30",
            [
                "Art Deco", "Daisy", "Diamond", "Fleur De Lis", "Fleur De Lis Slice",
                "Ironworks", "Lattice", "Tuscany",
            ],
            "Wrought Iron Rubber 18x30",
        ),
        ("ACH-MAT-MEMORY-ELLE", "Memory Foam Mat 17x24 Elle", "17x24", ["Black", "Grey", "Tan", "White"], "Memory Foam Elle 17x24"),
        ("ACH-MAT-MEMORY-MADISON", "Memory Foam Mat 17x24 Madison", "17x24", ["Brown", "Burgundy", "Green", "Navy"], "Memory Foam Madison 17x24"),
        ("ACH-MAT-FATIGUE-CLARKE", "Anti-Fatigue Mat 18x30 Clarke", "18x30", ["Black", "Grey", "Navy", "Tan"], "Anti-Fatigue Clarke 18x30"),
        (
            "ACH-MAT-FATIGUE-PRINT",
            "Anti-Fatigue Printed Kitchen Mat 18x30",
            "18x30",
            [
                "Apple Orchard", "Black Eyed Susan", "Butterflies", "Coffee", "Chateau",
                "Coastal", "Cucina", "Modern Farmhouse Black", "Modern Farmhouse Tan",
                "Fruity Tiles", "Golden Delicious", "Home Sweet Home", "Lemon Drop",
                "Mason Jars", "Precious", "Rooster", "Tuscany", "Boho", "Cozy Cafe",
                "Garden Blooms", "Buffalo Check",
            ],
            "Anti-Fatigue Printed 18x30",
        ),
        ("ACH-MAT-FATIGUE-ARLINGTON", "Anti-Fatigue Mat 18x30 Arlington", "18x30", ["Green", "Grey", "Tan"], "Anti-Fatigue Arlington 18x30"),
        ("ACH-MAT-FATIGUE-LLL", "Anti-Fatigue Mat 18x30 Live Love Laugh", "18x30", ["Burgundy", "Charcoal", "Grey"], "Anti-Fatigue Live Love Laugh"),
        ("ACH-MAT-LEATHER-1830", "Woven-Embossed Faux-Leather Anti-Fatigue Mat 18x30", "18x30", ["Black", "Espresso", "Grey", "Lava", "Navy", "Tan"], "Faux-Leather 18x30"),
        ("ACH-MAT-LEATHER-2039", "Woven-Embossed Faux-Leather Anti-Fatigue Mat 20x39", "20x39", ["Black", "Espresso", "Grey", "Lava", "Navy", "Tan"], "Faux-Leather 20x39"),
    ]
    for code, desc, size, colors, sss in mats:
        rows += colors_only(
            material="Mats",
            code=code,
            desc=desc,
            size=size,
            colors=colors,
            pack=1,
            main="Flooring",
            sub="Mats",
            subsub="Mats",
            sss=sss,
        )
    return rows


def ms_pack(size: str) -> int:
    return pack_by_width(size, 6, 4, 36)


def build_priced_windows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    # Vinyl roller shades — exact SKU list from the window book (not a full cartesian).
    # Size uses the book's ¼-inch widths. Colors: White, Ivory, Black, Dark Brown, Green.
    shade = dict(main="Windows", sub="Shades", material="Shades")
    roller_skus = [
        # translucent #300PT
        ("37-1/4x6", "White", 36, 3.25),
        ("37-1/4x6", "Ivory", 36, 3.25),
        ("37-1/4x6", "Dark Brown", 12, 3.25),
        ("37-1/4x6", "Black", 12, 3.25),
        ("37-1/4x6", "Green", 12, 3.25),
        ("37-1/4x7", "White", 36, 3.50),
        ("46-1/4x6", "White", 12, 5.00),
        ("46-1/4x6", "Ivory", 12, 5.00),
        ("46-1/4x6", "Black", 12, 5.00),
        ("46-1/4x7", "White", 12, 5.25),
        ("55-1/4x6", "White", 12, 5.75),
        ("55-1/4x6", "Ivory", 12, 5.75),
        ("55-1/4x6", "Black", 12, 5.75),
        ("55-1/4x6", "Dark Brown", 12, 5.75),
        ("55-1/4x7", "White", 12, 6.25),
        ("73-1/4x6", "Ivory", 6, 8.00),
        ("73-1/4x6", "White", 6, 8.00),
        # room darkening #300PRD
        ("37-1/4x6", "Ivory", 36, 3.75, "ACH-SHADE-ROLLER-RD", "VINYL Room Darkening Roller Shade #300PRD"),
        ("37-1/4x6", "White", 36, 3.75, "ACH-SHADE-ROLLER-RD", "VINYL Room Darkening Roller Shade #300PRD"),
        ("37-1/4x7", "White", 36, 4.50, "ACH-SHADE-ROLLER-RD", "VINYL Room Darkening Roller Shade #300PRD"),
        ("46-1/4x6", "Ivory", 12, 5.50, "ACH-SHADE-ROLLER-RD", "VINYL Room Darkening Roller Shade #300PRD"),
        ("46-1/4x6", "White", 12, 5.50, "ACH-SHADE-ROLLER-RD", "VINYL Room Darkening Roller Shade #300PRD"),
        ("46-1/4x7", "White", 12, 7.00, "ACH-SHADE-ROLLER-RD", "VINYL Room Darkening Roller Shade #300PRD"),
        ("55-1/4x6", "White", 12, 6.50, "ACH-SHADE-ROLLER-RD", "VINYL Room Darkening Roller Shade #300PRD"),
        ("55-1/4x7", "White", 12, 8.00, "ACH-SHADE-ROLLER-RD", "VINYL Room Darkening Roller Shade #300PRD"),
        ("73-1/4x6", "White", 6, 9.50, "ACH-SHADE-ROLLER-RD", "VINYL Room Darkening Roller Shade #300PRD"),
    ]
    for item in roller_skus:
        if len(item) == 4:
            size, color, pack, cost = item
            code, desc, sss = "ACH-SHADE-ROLLER-LF", "VINYL Translucent Roller Shade #300PT", "Vinyl Roller Translucent"
        else:
            size, color, pack, cost, code, desc = item
            sss = "Vinyl Roller Room Darkening"
        rows.append(
            make_row(
                material="Shades",
                code=code,
                desc=desc,
                size=size,
                color=color,
                pack=pack,
                main="Windows",
                sub="Shades",
                subsub="Roller Shades",
                sss=sss,
                cost=cost,
            )
        )
    for code, desc, sss in [
        ("ACH-SHADE-BRKT-IN", "Window Shade Inside Brackets #263 — 2 pairs", "Inside Brackets"),
        ("ACH-SHADE-BRKT-OUT", "Window Shade Outside Brackets #55 — 2 pairs", "Outside Brackets"),
        ("ACH-SHADE-BRKT-ADJ", "Window Shade Adjustable Brackets #163 — 2 pairs", "Adjustable Brackets"),
    ]:
        rows.append(
            make_row(
                material="Shades",
                code=code,
                desc=desc,
                size="2 Pairs",
                color="",
                pack=48,
                main="Windows",
                sub="Shades",
                subsub="Accessories",
                sss=sss,
                cost=33.60,
            )
        )

    # Cordless honeycomb / celestial / glide n go / roman
    honey_costs = {
        "23x64": 22.45, "27x64": 26.20, "29x64": 28.10, "30x64": 28.80,
        "31x64": 30.00, "33x64": 31.90, "34x64": 32.85, "35x64": 33.80,
        "36x64": 34.80, "39x64": 37.60, "45x64": 43.25,
    }
    rows += cartesian(
        material="Shades",
        code="ACH-SHADE-HONEYCOMB",
        desc="CORDLESS Honeycomb Cellular Pleated Shade",
        sizes=list(honey_costs),
        colors=["White", "Alabaster"],
        pack={sz: pack_by_width(sz, 6, 4, 36) for sz in honey_costs},
        costs=honey_costs,
        main="Windows",
        sub="Shades",
        subsub="Cellular Shades",
        sss="Honeycomb Cellular",
    )
    tdbu_costs = {
        "23x64": 24.70, "27x64": 28.80, "29x64": 30.90, "30x64": 31.70,
        "31x64": 33.00, "33x64": 35.10, "35x64": 37.15, "36x64": 38.25,
        "39x64": 41.35,
    }
    rows += cartesian(
        material="Shades",
        code="ACH-SHADE-TDBU-CELL",
        desc="CORDLESS Top-Down Bottom-Up Honeycomb Cellular Shade",
        sizes=list(tdbu_costs),
        colors=["Wheat", "Dove Grey", "White", "Alabaster"],
        pack=6,
        costs=tdbu_costs,
        main="Windows",
        sub="Shades",
        subsub="Cellular Shades",
        sss="TDBU Honeycomb",
    )
    celestial_costs = {
        "23x72": 28.65, "27x72": 31.20, "29x72": 33.95, "30x72": 34.30,
        "31x72": 34.65, "32x72": 35.75, "33x72": 36.85, "34x72": 37.90,
        "35x72": 39.00, "36x72": 40.05, "39x72": 43.30, "43x72": 47.60,
        "48x72": 52.95,
    }
    rows += cartesian(
        material="Shades",
        code="ACH-SHADE-CELESTIAL",
        desc="CORDLESS Celestial Light-Filtering Double Layer Shade",
        sizes=list(celestial_costs),
        colors=["Grey", "Linen", "White"],
        pack=2,
        costs=celestial_costs,
        main="Windows",
        sub="Shades",
        subsub="Roller Shades",
        sss="Celestial Double Layer",
    )
    glide = [
        ("23x72", 14.60), ("24x72", 15.10), ("25x72", 15.60), ("26x72", 15.95),
        ("27x72", 16.40), ("28x72", 16.85), ("29x72", 17.25), ("30x72", 17.75),
        ("31x72", 18.20), ("32x72", 18.65), ("33x72", 19.10), ("34x72", 19.55),
        ("35x72", 20.00), ("36x72", 20.75), ("37x72", 21.20), ("38x72", 21.65),
        ("39x72", 22.10), ("40x72", 22.50), ("41x72", 22.95), ("42x72", 23.45),
        ("43x72", 23.90), ("44x72", 24.35), ("45x72", 24.80),
    ]
    rows += cartesian(
        material="Shades",
        code="ACH-SHADE-GLIDENGO",
        desc="CORDLESS Glide n Go 100% Blackout Vinyl Roller Shade",
        sizes=[s for s, _ in glide],
        colors=["White", "Ivory"],
        pack=6,
        costs=dict(glide),
        main="Windows",
        sub="Shades",
        subsub="Roller Shades",
        sss="Glide n Go Blackout",
    )
    roman_costs = {
        "27x64": 29.70, "29x64": 31.90, "30x64": 33.00, "31x64": 34.10,
        "33x64": 36.30, "35x64": 38.50, "36x64": 39.60,
    }
    rows += cartesian(
        material="Shades",
        code="ACH-SHADE-ROMAN-BO",
        desc="CORDLESS Blackout Roman Shade",
        sizes=list(roman_costs),
        colors=["White", "Ivory", "Grey"],
        pack=4,
        costs=roman_costs,
        main="Windows",
        sub="Shades",
        subsub="Roman Shades",
        sss="Blackout Roman",
    )

    # Blinds
    bl = dict(main="Windows", sub="Blinds", material="Blinds")
    rows += cartesian(
        **bl,
        code="ACH-BLIND-HORIZON",
        desc="HORIZON Ribbed Vinyl Patio Door Vertical Blind with Valance",
        sizes=["78x84", "104x84"],
        colors=["White", "Alabaster"],
        pack=2,
        costs={"78x84": 28.90, "104x84": 42.75},
        subsub="Vertical Blinds",
        sss="Horizon Ribbed",
    )
    rows += cartesian(
        **bl,
        code="ACH-BLIND-MONACO",
        desc="MONACO Plain Vinyl Patio Door Vertical Blind (no valance)",
        sizes=["78x84", "104x84"],
        colors=["White"],
        pack=2,
        costs={"78x84": 26.60, "104x84": 39.35},
        subsub="Vertical Blinds",
        sss="Monaco Plain",
    )
    rows.append(
        make_row(
            material="Blinds",
            code="ACH-BLIND-VANE-PLAIN",
            desc="Plain Vertical Blind Vane 3-1/2in (white only)",
            size="82.5",
            color="White",
            pack=100,
            main="Windows",
            sub="Blinds",
            subsub="Vertical Blinds",
            sss="Plain Vanes",
            cost=1.25,
        )
    )
    rows.append(
        make_row(
            material="Blinds",
            code="ACH-BLIND-VANE-RIBBED",
            desc="Ribbed Vertical Blind Vane 3-1/2in",
            size="82.5",
            color="White",
            pack=100,
            main="Windows",
            sub="Blinds",
            subsub="Vertical Blinds",
            sss="Ribbed Vanes",
            cost=1.25,
        )
    )

    ms_short = {
        "45x25": 7.50, "18x42": 4.40, "23x42": 4.70, "23x48": 4.25, "27x48": 4.95,
        "28x48": 5.15, "29x48": 5.35, "31x48": 5.70, "32x48": 5.90, "33x48": 6.10,
        "34x48": 6.25, "35x48": 6.45, "36x48": 6.60, "45x48": 8.30, "46x48": 8.45,
        "47x48": 8.65, "58x48": 10.65, "70x48": 12.85,
    }
    rows += cartesian(
        **bl,
        code="ACH-BLIND-MORNINGSTAR",
        desc="GII CORDLESS Morningstar 1in Light Filtering Vinyl Mini Blind",
        sizes=list(ms_short),
        colors=["White", "Alabaster", "Black"],
        pack={sz: ms_pack(sz) for sz in ms_short},
        costs=ms_short,
        subsub="Mini Blinds",
        sss="GII Morningstar 1in",
    )
    ms_64 = {
        "22x64": 4.34, "23x64": 4.55, "24x64": 4.72, "25x64": 4.93, "26x64": 5.10,
        "27x64": 5.31, "28x64": 5.53, "29x64": 5.70, "30x64": 5.90, "31x64": 6.10,
        "32x64": 6.30, "33x64": 6.50, "34x64": 6.70, "35x64": 6.90, "36x64": 7.10,
        "37x64": 7.52, "38x64": 7.72, "39x64": 7.92, "40x64": 8.15, "41x64": 8.36,
        "42x64": 8.56, "43x64": 8.76, "44x64": 8.96, "45x64": 9.16, "46x64": 9.36,
        "47x64": 9.56, "48x64": 9.76, "52x64": 10.56, "54x64": 10.96, "57x64": 11.28,
        "58x64": 11.75, "59x64": 11.98, "60x64": 12.20, "64x64": 13.00, "70x64": 14.20,
        "71x64": 14.45, "72x64": 14.60,
    }
    rows += cartesian(
        **bl,
        code="ACH-BLIND-MORNINGSTAR",
        desc="GII CORDLESS Morningstar 1in Light Filtering Vinyl Mini Blind",
        sizes=list(ms_64),
        colors=["White", "Alabaster", "Black", "Woodtone", "Grey"],
        pack={sz: ms_pack(sz) for sz in ms_64},
        costs=ms_64,
        subsub="Mini Blinds",
        sss="GII Morningstar 1in",
    )
    ms_72_star = {
        "23x72": 5.10, "25x72": 5.55, "26x72": 5.75, "27x72": 5.95, "28x72": 6.20,
        "29x72": 6.40, "30x72": 6.60, "31x72": 6.80, "32x72": 7.05, "33x72": 7.25,
        "34x72": 7.45, "35x72": 7.70, "36x72": 7.95,
    }
    ms_72_all = {
        "24x72": 5.30, "39x72": 9.35, "45x72": 10.80, "46x72": 11.05, "48x72": 11.55,
    }
    rows += cartesian(
        **bl,
        code="ACH-BLIND-MORNINGSTAR",
        desc="GII CORDLESS Morningstar 1in Light Filtering Vinyl Mini Blind",
        sizes=list(ms_72_star),
        colors=["White"],
        pack={sz: ms_pack(sz) for sz in ms_72_star},
        costs=ms_72_star,
        subsub="Mini Blinds",
        sss="GII Morningstar 1in",
    )
    rows += cartesian(
        **bl,
        code="ACH-BLIND-MORNINGSTAR",
        desc="GII CORDLESS Morningstar 1in Light Filtering Vinyl Mini Blind",
        sizes=list(ms_72_all),
        colors=["White", "Alabaster", "Black", "Woodtone", "Grey"],
        pack={sz: ms_pack(sz) for sz in ms_72_all},
        costs=ms_72_all,
        subsub="Mini Blinds",
        sss="GII Morningstar 1in",
    )

    sundown = {
        "23x64": 5.90, "27x64": 6.90, "29x64": 7.45, "30x64": 7.70, "31x64": 7.95,
        "32x64": 8.20, "33x64": 8.50, "34x64": 8.75, "35x64": 9.00, "36x64": 9.25,
        "39x64": 10.65, "43x64": 11.75, "46x64": 12.70, "48x64": 13.25,
        "60x64": 16.40, "72x64": 19.75,
    }
    sundown_star = {"60x64", "72x64"}
    rows += cartesian(
        **bl,
        code="ACH-BLIND-SUNDOWN",
        desc="GII CORDLESS Deluxe Sundown 1in Room Darkening Vinyl Mini Blind",
        sizes=list(sundown),
        colors=["White", "Alabaster", "Black", "Mahogany", "Grey", "Latte"],
        pack={sz: pack_by_width(sz, 6, 4, 36) for sz in sundown},
        costs=sundown,
        color_filter=lambda sz, color: (sz not in sundown_star) or color in ("White", "Alabaster"),
        subsub="Mini Blinds",
        sss="GII Deluxe Sundown 1in",
    )
    luna = {
        "23x64": 10.40, "27x64": 12.25, "29x64": 13.15, "30x64": 13.60, "31x64": 14.00,
        "32x64": 14.50, "33x64": 14.95, "35x64": 15.85, "36x64": 16.30, "39x64": 19.25,
        "43x64": 21.15, "48x64": 23.50,
    }
    rows += cartesian(
        **bl,
        code="ACH-BLIND-LUNA",
        desc="GII CORDLESS Luna 2in Vinyl Plantation Blind",
        sizes=list(luna),
        colors=["White", "Mahogany"],
        pack=4,
        costs=luna,
        subsub="Plantation Blinds",
        sss="GII Luna 2in",
    )
    madera = {
        "36x52": 24.00, "37x52": 25.00, "74x52": 53.00,
        "23x64": 16.75, "25x64": 18.25, "27x64": 19.65, "29x64": 21.10, "30x64": 21.85,
        "31x64": 22.55, "32x64": 23.30, "33x64": 24.00, "34x64": 24.75, "35x64": 25.45,
        "36x64": 26.20, "37x64": 27.15, "39x64": 30.25, "43x64": 33.35, "45x64": 34.95,
        "46x64": 35.70, "48x64": 37.25, "52x64": 40.00, "60x64": 46.50, "72x64": 55.50,
    }
    rows += cartesian(
        **bl,
        code="ACH-BLIND-MADERA",
        desc="GII CORDLESS Madera Falsa 2in Faux Wood Plantation Blind",
        sizes=list(madera),
        colors=["White", "Mahogany", "Grey"],
        pack=2,
        costs=madera,
        subsub="Plantation Blinds",
        sss="GII Madera Falsa 2in",
    )
    return rows


def build_unpriced_windows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    extra_shades = [
        ("ACH-SHADE-TEAR-LF", "CORDS FREE Tear Down Light Filtering Window Shade", "Tear Down Light Filtering"),
        ("ACH-SHADE-123-PLEAT", "CORDLESS 1-2-3 Vinyl Room Darkening Pleated Shade", "1-2-3 Pleated"),
        ("ACH-SHADE-JUTE", "CORDS FREE Privacy Jute Shade", "Privacy Jute"),
        ("ACH-SHADE-TEAR-RD", "CORDS FREE Tear Down Room Darkening Window Shade", "Tear Down Room Darkening"),
        ("ACH-SHADE-BUFFALO-ROMAN", "CORDLESS Buffalo Check Roman Window Shade", "Buffalo Check Roman"),
    ]
    for code, desc, sss in extra_shades:
        color = "Burgundy" if code.endswith("BUFFALO-ROMAN") else ""
        subsub = "Roman Shades" if "ROMAN" in code else "Roller Shades"
        rows.append(
            make_row(
                material="Shades",
                code=code,
                desc=desc,
                size="Assorted",
                color=color,
                pack=1,
                main="Windows",
                sub="Shades",
                subsub=subsub,
                sss=sss,
            )
        )
    for code, desc, sss in [
        ("ACH-BLIND-VERANDA", "CORDLESS Veranda Vinyl Roll-Up Blind", "Veranda Roll-Up"),
        ("ACH-BLIND-SOLSTICE", "CORDLESS Solstice Vinyl Roll-Up Blind", "Solstice Roll-Up"),
    ]:
        rows.append(
            make_row(
                material="Blinds",
                code=code,
                desc=desc,
                size="Assorted",
                color="",
                pack=1,
                main="Windows",
                sub="Blinds",
                subsub="Roll-Up Blinds",
                sss=sss,
            )
        )

    panels = [
        ("ACH-CURTAIN-CONSTELLATION", "Constellation Grommet Window Curtain Panel", "Constellation"),
        ("ACH-CURTAIN-TRIBECA", "Tribeca 4-Piece Window Curtain Panel Set", "Tribeca 4-Piece"),
        ("ACH-CURTAIN-GRAMERCY-PNL", "Gramercy Rod Pocket Window Curtain Panel", "Gramercy Panel"),
        ("ACH-CURTAIN-BEDFORD", "Bedford Front Tab Window Curtain Panel", "Bedford"),
        ("ACH-CURTAIN-ALLEGRA", "Allegra Rod Pocket Panel", "Allegra"),
        ("ACH-CURTAIN-BLAKE", "Blake Rod Pocket Window Curtain Panel", "Blake"),
        ("ACH-CURTAIN-BOMBAY", "Bombay Double Layered Rod Pocket Window Curtain Panel", "Bombay"),
        ("ACH-CURTAIN-MISTY", "Misty Hidden Back Tab Panel", "Misty"),
        ("ACH-CURTAIN-BORDEAUX-PNL", "Bordeaux Rod Pocket Window Curtain Panel", "Bordeaux Panel"),
        ("ACH-CURTAIN-WINDSOR", "Windsor Pinch Pleat Window Curtain Panel", "Windsor"),
        ("ACH-CURTAIN-VOGUE", "Vogue Grommet Window Curtain Panel", "Vogue"),
        ("ACH-CURTAIN-TRANQUIL", "Tranquil Lined Grommet Window Curtain Panel", "Tranquil"),
        ("ACH-CURTAIN-WILLOW", "Willow Rod Pocket Window Curtain Panel", "Willow"),
        ("ACH-CURTAIN-TAYLOR", "Taylor Lined Grommet Window Curtain Panel", "Taylor"),
        ("ACH-CURTAIN-OMBRE-PNL", "Ombre Window Curtain Panel", "Ombre Panel"),
        ("ACH-CURTAIN-SPECTRUM", "Spectrum Rod Pocket Window Curtain Panel", "Spectrum"),
        ("ACH-CURTAIN-RAINBOW", "Rainbow Single Grommet Window Curtain Panel", "Rainbow"),
        ("ACH-CURTAIN-ESSENCE", "Essence Window Curtain Panel", "Essence"),
        ("ACH-CURTAIN-SUTTON", "Sutton Window Curtain Panel", "Sutton"),
        ("ACH-CURTAIN-PYTHON", "Python Grommet Window Curtain Panel", "Python"),
        ("ACH-CURTAIN-HARPER", "Harper Criss-Cross Window Curtain Panel", "Harper"),
        ("ACH-CURTAIN-KENYA", "Kenya Window Curtain Panel", "Kenya"),
        ("ACH-CURTAIN-PARKER", "Parker Pinch Pleat Window Curtain Panel", "Parker"),
        ("ACH-CURTAIN-BUFFALO-PNL", "Buffalo Check Window Curtain Panel", "Buffalo Check Panel"),
        ("ACH-CURTAIN-CHARLOTTE-PNL", "Charlotte Rod Pocket Window Curtain Panel", "Charlotte Panel"),
        ("ACH-CURTAIN-DARCY-PNL", "Darcy Rod Pocket Window Curtain Panel", "Darcy Panel"),
    ]
    for code, desc, sss in panels:
        size = "42x84" if code.endswith("GRAMERCY-PNL") else "Standard"
        rows.append(
            make_row(
                material="Curtains",
                code=code,
                desc=desc,
                size=size,
                color="",
                pack=1,
                main="Windows",
                sub="Curtains",
                subsub="Curtain Panels",
                sss=sss,
            )
        )
    for code, desc, sss in [
        ("ACH-CURTAIN-DARCY-FR", "Darcy French Door Curtain Panel", "Darcy French Door"),
        ("ACH-CURTAIN-BUFFALO-FR", "Buffalo Check French Door Curtain Panel", "Buffalo Check French Door"),
    ]:
        for size in ["54x72", "54x40", "25x72", "25x40"]:
            rows.append(
                make_row(
                    material="Curtains",
                    code=code,
                    desc=desc,
                    size=size,
                    color="",
                    pack=1,
                    main="Windows",
                    sub="Curtains",
                    subsub="Curtain Panels",
                    sss=sss,
                )
            )

    kitchen = [
        ("ACH-CURTAIN-BONAPPETIT", "Bon Appetit Printed Cottage Window Curtain Set", "Navy", "Bon Appetit"),
        ("ACH-CURTAIN-NAPA", "Napa Printed Tier and Swag Window Curtain Set", "", "Napa"),
        ("ACH-CURTAIN-BOHO", "Boho Printed Tier and Valance Set", "Mocha", "Boho"),
        ("ACH-CURTAIN-GARDEN", "Garden Blooms Tier and Valance Set", "", "Garden Blooms"),
        ("ACH-CURTAIN-PAIGE-TV", "Paige Tier and Valance", "", "Paige Tier Valance"),
        ("ACH-CURTAIN-PAIGE-5PC", "Paige 5-Piece Window Set", "", "Paige 5-Piece"),
        ("ACH-CURTAIN-KENDAL", "Kendal Tier and Valance", "", "Kendal"),
        ("ACH-CURTAIN-CLAIRE", "Claire 6-Piece Window Curtain Set", "", "Claire 6-Piece"),
        ("ACH-CURTAIN-SUNFLOWER", "Sunflower Cottage Window Curtain Set", "", "Sunflower Cottage"),
        ("ACH-CURTAIN-TUSCANY", "Tuscany Cottage Window Curtain Set", "", "Tuscany Cottage"),
        ("ACH-CURTAIN-COFFEE", "Coffee Printed Tier and Swag Window Curtain Set", "", "Coffee"),
        ("ACH-CURTAIN-FARMHOUSE", "Modern Farmhouse Tier and Valance Window Curtain Set", "", "Modern Farmhouse"),
        ("ACH-CURTAIN-MORNING", "Top of the Morning Cottage Window Curtain Set", "", "Top of the Morning"),
        ("ACH-CURTAIN-CHARDONNAY", "Chardonnay Printed Tier and Swag Window Curtain Set", "", "Chardonnay"),
        ("ACH-CURTAIN-CUCINA", "Cucina Printed Tier and Swag Window Curtain Set", "", "Cucina"),
        ("ACH-CURTAIN-GOLDEN", "Golden Delicious Printed Tier and Swag Window Curtain Set", "", "Golden Delicious"),
        ("ACH-CURTAIN-CHESAPEAKE", "Chesapeake Embellished Cottage Window Curtain Set", "", "Chesapeake"),
        ("ACH-CURTAIN-CUPPA", "Cuppa Joe Embellished Cottage Window Curtain Set", "", "Cuppa Joe"),
        ("ACH-CURTAIN-ROOSTER", "Rooster Printed Tier and Swag Window Curtain Set", "", "Rooster"),
        ("ACH-CURTAIN-HAMPTONS", "Hamptons Tier and Valance Window Curtain Set", "", "Hamptons"),
        ("ACH-CURTAIN-LEMON", "Lemon Drop Tier and Valance Window Curtain Set", "", "Lemon Drop"),
        ("ACH-CURTAIN-CAPPUCCINO", "Cappuccino Embellished Cottage Window Curtain Set", "", "Cappuccino"),
        ("ACH-CURTAIN-MASON", "Mason Jars Window Curtain Set", "", "Mason Jars"),
        ("ACH-CURTAIN-SUSAN", "Black Eyed Susan Cottage Window Curtain Set", "", "Black Eyed Susan"),
        ("ACH-CURTAIN-HSH", "Home Sweet Home Tier and Valance Window Curtain Set", "", "Home Sweet Home"),
        ("ACH-CURTAIN-FRUITY", "Fruity Tiles Tier and Valance Window Curtain Set", "", "Fruity Tiles"),
        ("ACH-CURTAIN-AVERY", "Avery Window Curtain Tier Pair and Valance Set", "", "Avery"),
        ("ACH-CURTAIN-BARNYARD-SET", "Barnyard Window Curtain Tier Pair and Valance Set", "", "Barnyard Set"),
        ("ACH-CURTAIN-DAKOTA-SET", "Dakota Window Curtain Tier Pair and Valance Set", "", "Dakota Set"),
        ("ACH-CURTAIN-COLBY-SET", "Colby Window Curtain Tier Pair and Valance Set", "", "Colby Set"),
        ("ACH-CURTAIN-LLL-SET", "Live Love Laugh Window Curtain Tier Pair and Valance Set", "", "Live Love Laugh Set"),
        ("ACH-CURTAIN-TATTERSALL", "Tattersall Window Curtain Tier Pair and Valance Set", "", "Tattersall"),
        ("ACH-CURTAIN-FAIRFIELD", "Fairfield 5-Piece Window Curtain Set", "", "Fairfield 5-Piece"),
        ("ACH-CURTAIN-PANACHE", "Panache 5-Piece Window Curtain Set", "", "Panache 5-Piece"),
        ("ACH-CURTAIN-HALLEY", "Halley 6-Piece Window Curtain Set", "", "Halley 6-Piece"),
        ("ACH-CURTAIN-DARCY-SET", "Darcy Window Curtain Tier and Valance Set", "", "Darcy Tier Valance"),
    ]
    for code, desc, color, sss in kitchen:
        rows.append(
            make_row(
                material="Curtains",
                code=code,
                desc=desc,
                size="Standard",
                color=color,
                pack=1,
                main="Windows",
                sub="Curtains",
                subsub="Kitchen Curtains",
                sss=sss,
            )
        )

    valances = [
        ("ACH-CURTAIN-BORDEAUX-VAL", "Bordeaux Window Curtain Valance", "52x14", "", "Bordeaux Valance"),
        ("ACH-CURTAIN-GRAMERCY-VAL", "Gramercy Window Curtain Valance", "58x14", "", "Gramercy Valance"),
        ("ACH-CURTAIN-GRAMERCY-TIER", "Gramercy Window Curtain Tier Pair", "Standard", "", "Gramercy Tier"),
        ("ACH-CURTAIN-CALLIE", "Callie Double Layer Pick Up Valance", "Standard", "", "Callie Valance"),
        ("ACH-CURTAIN-SYDNEY-TIER", "Sydney Window Curtain Tier Pair", "58x24", "", "Sydney Tier"),
        ("ACH-CURTAIN-COLBY-VAL", "Colby Window Curtain Valance", "Standard", "", "Colby Valance"),
        ("ACH-CURTAIN-BARNYARD-VAL", "Barnyard Window Curtain Valance", "Standard", "", "Barnyard Valance"),
        ("ACH-CURTAIN-DAKOTA-VAL", "Dakota Window Curtain Valance", "Standard", "", "Dakota Valance"),
        ("ACH-CURTAIN-LLL-VAL", "Live Love Laugh Window Curtain Valance", "Standard", "", "Live Love Laugh Valance"),
        ("ACH-CURTAIN-OAKWOOD-TIER", "Oakwood Window Curtain Tier Pair", "58x24", "", "Oakwood Tier"),
        ("ACH-CURTAIN-OAKWOOD-VAL", "Oakwood Window Curtain Valance", "58x14", "", "Oakwood Valance"),
        ("ACH-CURTAIN-OMBRE-SCARF", "Ombre Window Curtain Scarf", "Standard", "", "Ombre Scarf"),
        ("ACH-CURTAIN-OMBRE-TIE", "Ombre Window Curtain Tie Up Shade", "Standard", "", "Ombre Tie-Up"),
        ("ACH-CURTAIN-DARCY-VAL", "Darcy Window Curtain Valance", "Standard", "", "Darcy Valance"),
        ("ACH-CURTAIN-DARCY-TIE", "Darcy Window Curtain Tie Up Shade", "Standard", "", "Darcy Tie-Up"),
        ("ACH-CURTAIN-BUFFALO-VAL", "Buffalo Check Window Curtain Valance", "Standard", "", "Buffalo Check Valance"),
        ("ACH-CURTAIN-BUFFALO-SWAG", "Buffalo Check Gathered Swag Window Curtain Pair", "72x63", "", "Buffalo Check Swag"),
        ("ACH-CURTAIN-BUFFALO-TIE", "Buffalo Check Window Curtain Tie Up Shade", "Standard", "", "Buffalo Check Tie-Up"),
        ("ACH-CURTAIN-BUFFALO-TIER", "Buffalo Check Window Curtain Tier Pair", "Standard", "", "Buffalo Check Tier"),
        ("ACH-CURTAIN-CHARLOTTE-VAL", "Charlotte Window Curtain Valance", "Standard", "", "Charlotte Valance"),
    ]
    for code, desc, size, color, sss in valances:
        rows.append(
            make_row(
                material="Curtains",
                code=code,
                desc=desc,
                size=size,
                color=color,
                pack=1,
                main="Windows",
                sub="Curtains",
                subsub="Valances & Tiers",
                sss=sss,
            )
        )

    rods = [
        (
            "ACH-ROD-BUONO2",
            "Buono II Decorative Rod and Finial Set",
            [
                "Ryder", "Othello", "Morgan", "Medley", "Jordan", "Hayden", "Halo",
                "Grace", "Futura", "Cole", "Carrie", "Carson", "Bradford",
            ],
            "Buono II",
        ),
        ("ACH-ROD-CAMINO", "Camino Decorative Rod and Finial Set", ["Lincroft", "Fairmont", "Ava"], "Camino"),
        ("ACH-ROD-METALLO", "Metallo Decorative Rod and Finial Set", ["Lexus", "Leaf", "Ilana", "Carrera"], "Metallo"),
    ]
    for code, desc, colors, sss in rods:
        rows += colors_only(
            material="Rods",
            code=code,
            desc=desc,
            size="Standard",
            colors=colors,
            pack=1,
            main="Windows",
            sub="Curtains",
            subsub="Rods",
            sss=sss,
        )
    return rows


def build_achim_rows() -> list[dict[str, str]]:
    rows = []
    rows += build_priced_flooring()
    rows += build_unpriced_flooring()
    rows += build_priced_windows()
    rows += build_unpriced_windows()
    return rows


def main() -> None:
    achim = build_achim_rows()
    keys = [(r["Code"], r["Size"], r["Color"]) for r in achim]
    if len(keys) != len(set(keys)):
        seen = {}
        dupes = []
        for k in keys:
            if k in seen:
                dupes.append(k)
            seen[k] = True
        raise SystemExit(f"Duplicate code+size+color: {sorted(set(dupes))[:20]}")
    if any(not r["Size"] for r in achim):
        raise SystemExit("Every Achim/Alveron row needs a Size.")

    with CSV_PATH.open(newline="") as f:
        existing = list(csv.DictReader(f))
    plumbing = [
        r
        for r in existing
        if not str(r.get("Code", "")).startswith("ACH-")
        and not str(r.get("Code", "")).startswith("ALV-")
    ]
    if not plumbing:
        raise SystemExit("Refusing to write: plumbing rows missing from products.csv")
    for r in plumbing:
        r.setdefault("Color", "")

    all_rows = plumbing + achim
    with CSV_PATH.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        w.writerows(all_rows)

    priced = sum(1 for r in achim if r["Price"])
    windows = [r for r in achim if r["main_category"] == "Windows"]
    subs = {}
    for r in windows:
        subs[r["sub_category"]] = subs.get(r["sub_category"], 0) + 1
    print(
        f"Wrote {len(achim)} Achim/Alveron rows ({priced} priced) + {len(plumbing)} plumbing. "
        f"Windows subs: {subs}. Total {len(all_rows)}."
    )


if __name__ == "__main__":
    main()
