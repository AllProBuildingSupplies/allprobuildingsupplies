#!/usr/bin/env python3
"""Build Achim Home Decor catalog rows and append them to assets/products.csv.

Source: live listings on https://www.achimhomedecor.com (blinds, curtains, rods,
tiles, planks, rugs, mats) as of 2026-09-06. One Code per product family; Size
holds color / pattern / SKU number. Price is left blank (Call for pricing).

Re-run is idempotent: existing ACH-* rows are replaced.
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


def slug(text: str, limit: int = 28) -> str:
    s = re.sub(r"[^A-Z0-9]+", "-", text.upper())
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:limit].rstrip("-")


def rows_for(
    *,
    material: str,
    code: str,
    desc: str,
    sizes: list[str],
    pack: int,
    main: str,
    sub: str,
    subsub: str,
    sss: str,
) -> list[dict[str, str]]:
    out = []
    seen = set()
    for size in sizes:
        size = " ".join(str(size).split())
        if not size or size in seen:
            continue
        seen.add(size)
        key = f"{code}|{size}"
        image = IMG
        if IMAGE_MAP:
            meta = IMAGE_MAP.get(key)
            if isinstance(meta, dict):
                image = meta.get("file") or IMG
            elif isinstance(meta, str) and meta:
                image = meta
        out.append(
            {
                "Material": material,
                "Code": code,
                "Description": desc,
                "Size": size,
                "Pack": str(pack),
                "Qty": "0",
                "Price": "",
                "Image": image,
                "main_category": main,
                "sub_category": sub,
                "sub_sub_category": subsub,
                "sub_sub_sub_category": sss,
                "Tommur-Code": "",
                "Lesso-Code": "",
            }
        )
    return out


def build_achim_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []

    # ── Flooring / vinyl tiles ──────────────────────────────────────────
    ft = dict(main="Flooring", sub="Tiles", subsub="Vinyl Tiles", material="Vinyl Tiles")
    rows += rows_for(
        **ft,
        code="ACH-PORTFOLIO-TILE",
        desc="PORTFOLIO 12x12 2.0mm Self-Adhesive Vinyl Floor Tile",
        sizes=[
            "Walnut Parquet",
            "Blue Diamond",
            "Cobble Mosaic",
            "Rustic Clay Square",
            "Midnight Marble",
            "Ash Grey Wood",
        ],
        pack=1,
        sss="Portfolio 12x12 2.0mm",
    )
    rows += rows_for(
        **ft,
        code="ACH-STERLING-TILE",
        desc="STERLING 12x12 Self-Adhesive Vinyl Floor Tile",
        sizes=[
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
        pack=1,
        sss="Sterling 12x12",
    )
    rows += rows_for(
        **ft,
        code="ACH-STERLING-PARQUET",
        desc="STERLING Square Parquet 12x12 Self-Adhesive Vinyl Floor Tile",
        sizes=["Square Parquet"],
        pack=1,
        sss="Sterling Square Parquet",
    )
    rows += rows_for(
        **ft,
        code="ACH-MAJESTIC-TILE",
        desc="MAJESTIC 18x18 Self-Adhesive Vinyl Floor Tile",
        sizes=[
            "Light Gray Slate",
            "Verde Green Marble",
            "Rustic Copper Slate",
            "Ghibli Beige Granite",
        ],
        pack=1,
        sss="Majestic 18x18",
    )
    rows += rows_for(
        **ft,
        code="ACH-TIVOLI-TILE",
        desc="TIVOLI 12x12 Self-Adhesive Vinyl Floor Tile (45 tiles / 45 sq ft)",
        sizes=[
            "#103",
            "#201",
            "#202",
            "#204",
            "#205",
            "#214",
            "#223",
            "#224",
            "#225",
            "#229",
            "#230",
            "#231",
            "#327",
            "#329",
            "#332",
            "#334",
            "#420",
            "#425",
            "#450",
            "#454",
            "#455",
            "#456",
            "#457",
        ],
        pack=45,
        sss="Tivoli 12x12",
    )
    rows += rows_for(
        **ft,
        code="ACH-NEXUS-TILE",
        desc="NEXUS 12x12 Self-Adhesive Vinyl Floor Tile (20 tiles / 20 sq ft)",
        sizes=[
            "#101",
            "#102",
            "#103",
            "#201",
            "#202",
            "#204",
            "#214",
            "#223",
            "#225",
            "#229",
            "#230",
            "#231",
            "#232",
            "#303",
            "#326",
            "#327",
            "#332",
            "#334",
            "#337",
            "#402",
            "#409",
            "#422",
            "#423",
            "#425",
            "#444",
            "#446",
            "#448",
            "#449",
            "#450",
            "#455",
            "#456",
            "#457",
            "#458",
            "#459",
            "#460",
            "#461",
            "#462",
        ],
        pack=20,
        sss="Nexus 12x12 Vinyl",
    )
    rows += rows_for(
        **ft,
        code="ACH-FLOORGALORE-TILE",
        desc="FLOOR GALORE 5.2x5.2 Self-Adhesive Vinyl Floor Tile",
        sizes=["Sandstone Quartz", "Galaxy", "Graphite"],
        pack=1,
        sss="Floor Galore 5.2x5.2",
    )
    rows += rows_for(
        **ft,
        code="ACH-PALAZZO-TILE",
        desc="PALAZZO 12x24 Self-Adhesive Vinyl Floor Tile",
        sizes=[
            "City Space Concrete",
            "Beechwood",
            "Azurro Marble",
            "Luxe White",
            "Quarry Stone",
            "Opal",
        ],
        pack=1,
        sss="Palazzo 12x24",
    )
    rows += rows_for(
        **ft,
        code="ACH-RETRO-TILE",
        desc="RETRO 12x12 Self-Adhesive Vinyl Floor Tile",
        sizes=[
            "Blonde Herringbone",
            "Whitewash Chevron",
            "Stone Herringbone",
            "Marble Criss Cross",
            "Scallop",
            "Starlight",
            "Latte",
            "Van Clover",
            "Linen Waves",
            "Clover",
            "Swirls Toffee",
            "Mod Diamond",
            "Edge",
            "Villa Toffee",
            "Onyx Star",
            "Woven Marble",
            "Green Medallion",
            "Slate",
            "Prism Marble",
            "Octagon",
            "Navy Pearl",
            "Geometric",
            "Geo Puzzle",
            "Diamond",
            "Chevron",
            "Carera",
            "Burch",
            "Affinty",
        ],
        pack=20,
        sss="Retro 12x12",
    )
    rows += rows_for(
        **ft,
        code="ACH-ARABESQUE-TILE",
        desc="ARABESQUE 12x12 Self-Adhesive Floor Tile",
        sizes=["Arabesque"],
        pack=1,
        sss="Arabesque 12x12",
    )
    rows += rows_for(
        material="Deck Tiles",
        code="ACH-OUTDOORZ-DECK",
        desc="OUTDOORZ Interlocking Wood Deck Tiles",
        sizes=["Honey Oak", "Royal Mahogany"],
        pack=1,
        main="Flooring",
        sub="Tiles",
        subsub="Vinyl Tiles",
        sss="OutdoorZ Deck",
    )
    rows += rows_for(
        material="Foam Tiles",
        code="ACH-FOAM-TILE",
        desc="Interlocking Foam 24x24 Anti-Fatigue Floor Tiles (4 tiles / 16 sq ft)",
        sizes=["Solid", "Pine", "Ash"],
        pack=4,
        main="Flooring",
        sub="Tiles",
        subsub="Vinyl Tiles",
        sss="Interlocking Foam 24x24",
    )

    # ── Flooring / vinyl planks ─────────────────────────────────────────
    fp = dict(
        main="Flooring", sub="Planks", subsub="Vinyl Planks", material="Vinyl Planks"
    )
    rows += rows_for(
        **fp,
        code="ACH-TIVOLI2-PLANK",
        desc="TIVOLI II 6x36 Self-Adhesive Vinyl Floor Planks",
        sizes=["Maple", "Rustic Oak", "Silver Spruce", "Mahogany", "Hazel Ash", "Silverton"],
        pack=1,
        sss="Tivoli II 6x36",
    )
    rows += rows_for(
        **fp,
        code="ACH-STERLING-PLANK-2MM",
        desc="STERLING 6x36 2.0mm Self-Adhesive Vinyl Floor Planks",
        sizes=["Birchwood", "Driftwood", "Rustic Grey", "Silver Spruce", "Medium Oak"],
        pack=1,
        sss="Sterling 6x36 2.0mm",
    )
    rows += rows_for(
        **fp,
        code="ACH-STERLING-PLANK-12MM",
        desc="STERLING 6x36 1.2mm Self-Adhesive Vinyl Floor Planks",
        sizes=["Walnut", "Hickory", "White Oak", "Light Grey Oak", "Saddle"],
        pack=1,
        sss="Sterling 6x36 1.2mm",
    )
    rows += rows_for(
        **fp,
        code="ACH-NEXUS-PLANK",
        desc="NEXUS 6x36 Self-Adhesive Vinyl Floor Planks",
        sizes=["Walnut", "Saddle", "Light Grey Oak", "Hickory", "White Oak", "Espresso"],
        pack=1,
        sss="Nexus 6x36",
    )
    rows += rows_for(
        **fp,
        code="ACH-FLEXFLOR-PLANK",
        desc="FLEX FLOR Looselay Vinyl Plank 9x48",
        sizes=["Dunes", "Smoke", "Whitewash", "Ebony", "Gray", "Rustic Cherry", "Aged Driftwood"],
        pack=1,
        sss="Flex Flor 9x48 Looselay",
    )

    # ── Flooring / carpet tiles ─────────────────────────────────────────
    rows += rows_for(
        material="Carpet Tiles",
        code="ACH-NEXUS-CARPET",
        desc="NEXUS 12x12 Self-Adhesive Carpet Floor Tile (12 tiles / 12 sq ft)",
        sizes=["Burgundy", "Navy", "Brown", "Jet", "Tan", "Smoke"],
        pack=12,
        main="Flooring",
        sub="Tiles",
        subsub="Carpet Tiles",
        sss="Nexus Carpet 12x12",
    )

    # ── Flooring / rugs ─────────────────────────────────────────────────
    rows += rows_for(
        material="Rugs",
        code="ACH-CAPRI-RUG",
        desc="CAPRI 3-Piece Rug Set (5x7 rug, 22x59 runner, 22x31 mat)",
        sizes=[
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

    # ── Flooring / mats ─────────────────────────────────────────────────
    fm = dict(main="Flooring", sub="Mats", subsub="Mats", material="Mats")
    rows += rows_for(
        **fm,
        code="ACH-MAT-COIR",
        desc="Printed Coir Door Mat 18x30",
        sizes=[
            "Cardinal",
            "Winter Wonderland",
            "Snowflake",
            "Buffalo Check Fall",
            "Welcome Pumpkins",
            "Autumn Foliage",
            "Happy Fall",
            "Dorothy",
            "Ladybug",
            "Leaves",
            "Sweet Home",
            "Go Away",
            "Home",
            "Prestige",
            "Welcome Aboard",
        ],
        pack=1,
        sss="Printed Coir 18x30",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-RUBBER",
        desc="Welcome Outdoor Rubber Entrance Mat 18x30",
        sizes=[
            "Quarry Stones",
            "Colorful Plank",
            "Farmhouse Plank",
            "Morning Call",
            "Sunflower Field",
            "Welcome Home",
            "Welcome Stone",
        ],
        pack=1,
        sss="Welcome Rubber 18x30",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-COCO",
        desc="Coco Entrance Mat 18x30",
        sizes=[
            "Daisy",
            "Scrolls",
            "Vines",
            "Welcome Key",
            "Flora",
            "Harlequin",
            "Milly",
            "Remi",
            "Sunrise",
        ],
        pack=1,
        sss="Coco Entrance 18x30",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-WROUGHT",
        desc="Wrought Iron Rubber Entrance Mat 18x30",
        sizes=[
            "Art Deco",
            "Daisy",
            "Diamond",
            "Fleur De Lis",
            "Fleur De Lis Slice",
            "Ironworks",
            "Lattice",
            "Tuscany",
        ],
        pack=1,
        sss="Wrought Iron Rubber 18x30",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-MEMORY-ELLE",
        desc="Memory Foam Mat 17x24 Elle",
        sizes=["Black", "Grey", "Tan", "White"],
        pack=1,
        sss="Memory Foam Elle 17x24",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-MEMORY-MADISON",
        desc="Memory Foam Mat 17x24 Madison",
        sizes=["Brown", "Burgundy", "Green", "Navy"],
        pack=1,
        sss="Memory Foam Madison 17x24",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-FATIGUE-CLARKE",
        desc="Anti-Fatigue Mat 18x30 Clarke",
        sizes=["Black", "Grey", "Navy", "Tan"],
        pack=1,
        sss="Anti-Fatigue Clarke 18x30",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-FATIGUE-PRINT",
        desc="Anti-Fatigue Printed Kitchen Mat 18x30",
        sizes=[
            "Apple Orchard",
            "Black Eyed Susan",
            "Butterflies",
            "Coffee",
            "Chateau",
            "Coastal",
            "Cucina",
            "Modern Farmhouse Black",
            "Modern Farmhouse Tan",
            "Fruity Tiles",
            "Golden Delicious",
            "Home Sweet Home",
            "Lemon Drop",
            "Mason Jars",
            "Precious",
            "Rooster",
            "Tuscany",
            "Boho",
            "Cozy Cafe",
            "Garden Blooms",
            "Buffalo Check",
        ],
        pack=1,
        sss="Anti-Fatigue Printed 18x30",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-FATIGUE-ARLINGTON",
        desc="Anti-Fatigue Mat 18x30 Arlington",
        sizes=["Green", "Grey", "Tan"],
        pack=1,
        sss="Anti-Fatigue Arlington 18x30",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-FATIGUE-LLL",
        desc="Anti-Fatigue Mat 18x30 Live Love Laugh",
        sizes=["Burgundy", "Charcoal", "Grey"],
        pack=1,
        sss="Anti-Fatigue Live Love Laugh",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-LEATHER-1830",
        desc="Woven-Embossed Faux-Leather Anti-Fatigue Mat 18x30",
        sizes=["Black", "Espresso", "Grey", "Lava", "Navy", "Tan"],
        pack=1,
        sss="Faux-Leather 18x30",
    )
    rows += rows_for(
        **fm,
        code="ACH-MAT-LEATHER-2039",
        desc="Woven-Embossed Faux-Leather Anti-Fatigue Mat 20x39",
        sizes=["Black", "Espresso", "Grey", "Lava", "Navy", "Tan"],
        pack=1,
        sss="Faux-Leather 20x39",
    )

    # ── Windows / shades ────────────────────────────────────────────────
    sh = dict(
        main="Windows",
        sub="Blinds & Shades",
        subsub="Shades",
        material="Shades",
        pack=1,
    )
    shade_items = [
        ("ACH-SHADE-GLIDENGO", "CORDLESS Glide n Go Blackout Vinyl Roller Shade", "Glide n Go Roller"),
        ("ACH-SHADE-TEAR-LF", "CORDS FREE Tear Down Light Filtering Window Shade", "Tear Down Light Filtering"),
        ("ACH-SHADE-TDBU-CELL", "Top Down-Bottom Up Cordless Honeycomb Cellular Shade", "TDBU Honeycomb"),
        ("ACH-SHADE-HONEYCOMB", "CORDLESS Honeycomb Cellular Pleated Shade", "Honeycomb Cellular"),
        ("ACH-SHADE-123-PLEAT", "CORDLESS 1-2-3 Vinyl Room Darkening Pleated Shade", "1-2-3 Pleated"),
        ("ACH-SHADE-CELESTIAL", "CORDLESS Celestial Sheer Double Layered Shade", "Celestial Sheer"),
        ("ACH-SHADE-ROMAN-BO", "CORDLESS Blackout Roman Window Shade", "Blackout Roman"),
        ("ACH-SHADE-JUTE", "CORDS FREE Privacy Jute Shade", "Privacy Jute"),
        ("ACH-SHADE-TEAR-RD", "CORDS FREE Tear Down Room Darkening Window Shade", "Tear Down Room Darkening"),
        ("ACH-SHADE-BUFFALO-ROMAN", "CORDLESS Buffalo Check Roman Window Shade", "Buffalo Check Roman"),
    ]
    for code, desc, sss in shade_items:
        size = "Burgundy" if code.endswith("BUFFALO-ROMAN") else "Stock widths"
        rows += rows_for(**sh, code=code, desc=desc, sizes=[size], sss=sss)

    # ── Windows / blinds ────────────────────────────────────────────────
    bl = dict(
        main="Windows",
        sub="Blinds & Shades",
        subsub="Blinds",
        material="Blinds",
        pack=1,
    )
    blind_items = [
        ("ACH-BLIND-VERANDA", "CORDLESS Veranda Vinyl Roll-Up Blind", "Veranda Roll-Up"),
        ("ACH-BLIND-SOLSTICE", "CORDLESS Solstice Vinyl Roll-Up Blind", "Solstice Roll-Up"),
        ("ACH-BLIND-LUNA", "CORDLESS GII Luna 2in Vinyl Venetian Blind", "GII Luna 2in Venetian"),
        ("ACH-BLIND-MADERA", "CORDLESS GII Madera Falsa 2in Faux Wood Plantation Blind", "GII Madera Falsa 2in"),
        ("ACH-BLIND-MORNINGSTAR", "CORDLESS GII Morningstar 1in Light Filtering Mini Blind", "GII Morningstar 1in"),
        ("ACH-BLIND-SUNDOWN", "CORDLESS GII Deluxe Sundown 1in Room Darkening Mini Blind", "GII Deluxe Sundown 1in"),
    ]
    for code, desc, sss in blind_items:
        rows += rows_for(**bl, code=code, desc=desc, sizes=["Stock widths"], sss=sss)

    # ── Windows / curtain panels ────────────────────────────────────────
    cp = dict(
        main="Windows",
        sub="Curtains",
        subsub="Curtain Panels",
        material="Curtains",
        pack=1,
    )
    panel_items = [
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
    for code, desc, sss in panel_items:
        size = "42x84" if code.endswith("GRAMERCY-PNL") else "Standard"
        rows += rows_for(**cp, code=code, desc=desc, sizes=[size], sss=sss)

    rows += rows_for(
        **cp,
        code="ACH-CURTAIN-DARCY-FR",
        desc="Darcy French Door Curtain Panel",
        sizes=["54x72", "54x40", "25x72", "25x40"],
        sss="Darcy French Door",
    )
    rows += rows_for(
        **cp,
        code="ACH-CURTAIN-BUFFALO-FR",
        desc="Buffalo Check French Door Curtain Panel",
        sizes=["54x72", "54x40", "25x72", "25x40"],
        sss="Buffalo Check French Door",
    )

    # ── Windows / kitchen curtain sets ──────────────────────────────────
    ck = dict(
        main="Windows",
        sub="Curtains",
        subsub="Kitchen Curtains",
        material="Curtains",
        pack=1,
    )
    kitchen_items = [
        ("ACH-CURTAIN-BONAPPETIT", "Bon Appetit Printed Cottage Window Curtain Set", "Navy", "Bon Appetit"),
        ("ACH-CURTAIN-NAPA", "Napa Printed Tier and Swag Window Curtain Set", "Standard", "Napa"),
        ("ACH-CURTAIN-BOHO", "Boho Printed Tier and Valance Set", "Mocha", "Boho"),
        ("ACH-CURTAIN-GARDEN", "Garden Blooms Tier and Valance Set", "Standard", "Garden Blooms"),
        ("ACH-CURTAIN-PAIGE-TV", "Paige Tier and Valance", "Standard", "Paige Tier Valance"),
        ("ACH-CURTAIN-PAIGE-5PC", "Paige 5-Piece Window Set", "Standard", "Paige 5-Piece"),
        ("ACH-CURTAIN-KENDAL", "Kendal Tier and Valance", "Standard", "Kendal"),
        ("ACH-CURTAIN-CLAIRE", "Claire 6-Piece Window Curtain Set", "Standard", "Claire 6-Piece"),
        ("ACH-CURTAIN-SUNFLOWER", "Sunflower Cottage Window Curtain Set", "Standard", "Sunflower Cottage"),
        ("ACH-CURTAIN-TUSCANY", "Tuscany Cottage Window Curtain Set", "Standard", "Tuscany Cottage"),
        ("ACH-CURTAIN-COFFEE", "Coffee Printed Tier and Swag Window Curtain Set", "Standard", "Coffee"),
        ("ACH-CURTAIN-FARMHOUSE", "Modern Farmhouse Tier and Valance Window Curtain Set", "Standard", "Modern Farmhouse"),
        ("ACH-CURTAIN-MORNING", "Top of the Morning Cottage Window Curtain Set", "Standard", "Top of the Morning"),
        ("ACH-CURTAIN-CHARDONNAY", "Chardonnay Printed Tier and Swag Window Curtain Set", "Standard", "Chardonnay"),
        ("ACH-CURTAIN-CUCINA", "Cucina Printed Tier and Swag Window Curtain Set", "Standard", "Cucina"),
        ("ACH-CURTAIN-GOLDEN", "Golden Delicious Printed Tier and Swag Window Curtain Set", "Standard", "Golden Delicious"),
        ("ACH-CURTAIN-CHESAPEAKE", "Chesapeake Embellished Cottage Window Curtain Set", "Standard", "Chesapeake"),
        ("ACH-CURTAIN-CUPPA", "Cuppa Joe Embellished Cottage Window Curtain Set", "Standard", "Cuppa Joe"),
        ("ACH-CURTAIN-ROOSTER", "Rooster Printed Tier and Swag Window Curtain Set", "Standard", "Rooster"),
        ("ACH-CURTAIN-HAMPTONS", "Hamptons Tier and Valance Window Curtain Set", "Standard", "Hamptons"),
        ("ACH-CURTAIN-LEMON", "Lemon Drop Tier and Valance Window Curtain Set", "Standard", "Lemon Drop"),
        ("ACH-CURTAIN-CAPPUCCINO", "Cappuccino Embellished Cottage Window Curtain Set", "Standard", "Cappuccino"),
        ("ACH-CURTAIN-MASON", "Mason Jars Window Curtain Set", "Standard", "Mason Jars"),
        ("ACH-CURTAIN-SUSAN", "Black Eyed Susan Cottage Window Curtain Set", "Standard", "Black Eyed Susan"),
        ("ACH-CURTAIN-HSH", "Home Sweet Home Tier and Valance Window Curtain Set", "Standard", "Home Sweet Home"),
        ("ACH-CURTAIN-FRUITY", "Fruity Tiles Tier and Valance Window Curtain Set", "Standard", "Fruity Tiles"),
        ("ACH-CURTAIN-AVERY", "Avery Window Curtain Tier Pair and Valance Set", "Standard", "Avery"),
        ("ACH-CURTAIN-BARNYARD-SET", "Barnyard Window Curtain Tier Pair and Valance Set", "Standard", "Barnyard Set"),
        ("ACH-CURTAIN-DAKOTA-SET", "Dakota Window Curtain Tier Pair and Valance Set", "Standard", "Dakota Set"),
        ("ACH-CURTAIN-COLBY-SET", "Colby Window Curtain Tier Pair and Valance Set", "Standard", "Colby Set"),
        ("ACH-CURTAIN-LLL-SET", "Live Love Laugh Window Curtain Tier Pair and Valance Set", "Standard", "Live Love Laugh Set"),
        ("ACH-CURTAIN-TATTERSALL", "Tattersall Window Curtain Tier Pair and Valance Set", "Standard", "Tattersall"),
        ("ACH-CURTAIN-FAIRFIELD", "Fairfield 5-Piece Window Curtain Set", "Standard", "Fairfield 5-Piece"),
        ("ACH-CURTAIN-PANACHE", "Panache 5-Piece Window Curtain Set", "Standard", "Panache 5-Piece"),
        ("ACH-CURTAIN-HALLEY", "Halley 6-Piece Window Curtain Set", "Standard", "Halley 6-Piece"),
        ("ACH-CURTAIN-DARCY-SET", "Darcy Window Curtain Tier and Valance Set", "Standard", "Darcy Tier Valance"),
    ]
    for code, desc, size, sss in kitchen_items:
        rows += rows_for(**ck, code=code, desc=desc, sizes=[size], sss=sss)

    # ── Windows / valances, tiers, scarves, tie-ups ─────────────────────
    cv = dict(
        main="Windows",
        sub="Curtains",
        subsub="Valances & Tiers",
        material="Curtains",
        pack=1,
    )
    valance_items = [
        ("ACH-CURTAIN-BORDEAUX-VAL", "Bordeaux Window Curtain Valance", "52x14", "Bordeaux Valance"),
        ("ACH-CURTAIN-GRAMERCY-VAL", "Gramercy Window Curtain Valance", "58x14", "Gramercy Valance"),
        ("ACH-CURTAIN-GRAMERCY-TIER", "Gramercy Window Curtain Tier Pair", "Standard", "Gramercy Tier"),
        ("ACH-CURTAIN-CALLIE", "Callie Double Layer Pick Up Valance", "Standard", "Callie Valance"),
        ("ACH-CURTAIN-SYDNEY-TIER", "Sydney Window Curtain Tier Pair", "58x24", "Sydney Tier"),
        ("ACH-CURTAIN-COLBY-VAL", "Colby Window Curtain Valance", "Standard", "Colby Valance"),
        ("ACH-CURTAIN-BARNYARD-VAL", "Barnyard Window Curtain Valance", "Standard", "Barnyard Valance"),
        ("ACH-CURTAIN-DAKOTA-VAL", "Dakota Window Curtain Valance", "Standard", "Dakota Valance"),
        ("ACH-CURTAIN-LLL-VAL", "Live Love Laugh Window Curtain Valance", "Standard", "Live Love Laugh Valance"),
        ("ACH-CURTAIN-OAKWOOD-TIER", "Oakwood Window Curtain Tier Pair", "58x24", "Oakwood Tier"),
        ("ACH-CURTAIN-OAKWOOD-VAL", "Oakwood Window Curtain Valance", "58x14", "Oakwood Valance"),
        ("ACH-CURTAIN-OMBRE-SCARF", "Ombre Window Curtain Scarf", "Standard", "Ombre Scarf"),
        ("ACH-CURTAIN-OMBRE-TIE", "Ombre Window Curtain Tie Up Shade", "Standard", "Ombre Tie-Up"),
        ("ACH-CURTAIN-DARCY-VAL", "Darcy Window Curtain Valance", "Standard", "Darcy Valance"),
        ("ACH-CURTAIN-DARCY-TIE", "Darcy Window Curtain Tie Up Shade", "Standard", "Darcy Tie-Up"),
        ("ACH-CURTAIN-BUFFALO-VAL", "Buffalo Check Window Curtain Valance", "Standard", "Buffalo Check Valance"),
        ("ACH-CURTAIN-BUFFALO-SWAG", "Buffalo Check Gathered Swag Window Curtain Pair", "72x63", "Buffalo Check Swag"),
        ("ACH-CURTAIN-BUFFALO-TIE", "Buffalo Check Window Curtain Tie Up Shade", "Standard", "Buffalo Check Tie-Up"),
        ("ACH-CURTAIN-BUFFALO-TIER", "Buffalo Check Window Curtain Tier Pair", "Standard", "Buffalo Check Tier"),
        ("ACH-CURTAIN-CHARLOTTE-VAL", "Charlotte Window Curtain Valance", "Standard", "Charlotte Valance"),
    ]
    for code, desc, size, sss in valance_items:
        rows += rows_for(**cv, code=code, desc=desc, sizes=[size], sss=sss)

    # ── Windows / rods ──────────────────────────────────────────────────
    rd = dict(
        main="Windows",
        sub="Hardware",
        subsub="Rods",
        material="Rods",
        pack=1,
    )
    buono = [
        "Ryder",
        "Othello",
        "Morgan",
        "Medley",
        "Jordan",
        "Hayden",
        "Halo",
        "Grace",
        "Futura",
        "Cole",
        "Carrie",
        "Carson",
        "Bradford",
    ]
    rows += rows_for(
        **rd,
        code="ACH-ROD-BUONO2",
        desc="Buono II Decorative Rod and Finial Set",
        sizes=buono,
        sss="Buono II",
    )
    rows += rows_for(
        **rd,
        code="ACH-ROD-CAMINO",
        desc="Camino Decorative Rod and Finial Set",
        sizes=["Lincroft", "Fairmont", "Ava"],
        sss="Camino",
    )
    rows += rows_for(
        **rd,
        code="ACH-ROD-METALLO",
        desc="Metallo Decorative Rod and Finial Set",
        sizes=["Lexus", "Leaf", "Ilana", "Carrera"],
        sss="Metallo",
    )

    return rows


def main() -> None:
    achim = build_achim_rows()
    keys = [(r["Code"], r["Size"]) for r in achim]
    if len(keys) != len(set(keys)):
        dupes = [k for k in keys if keys.count(k) > 1]
        raise SystemExit(f"Duplicate code+size pairs: {sorted(set(dupes))}")
    if any(not r["Size"] for r in achim):
        raise SystemExit("Every Achim row needs a Size (admin sync skips blank size).")
    if any(r["Price"] for r in achim):
        raise SystemExit("Achim prices must stay blank.")

    with CSV_PATH.open(newline="") as f:
        existing = list(csv.DictReader(f))
    plumbing = [r for r in existing if not str(r.get("Code", "")).startswith("ACH-")]
    if not plumbing:
        raise SystemExit("Refusing to write: plumbing rows missing from products.csv")

    all_rows = plumbing + achim
    with CSV_PATH.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=HEADERS, lineterminator="\n")
        w.writeheader()
        w.writerows(all_rows)

    mains = {}
    mats = {}
    for r in achim:
        mains[r["main_category"]] = mains.get(r["main_category"], 0) + 1
        mats[r["Material"]] = mats.get(r["Material"], 0) + 1
    print(f"Wrote {len(all_rows)} rows ({len(plumbing)} plumbing + {len(achim)} Achim)")
    print("Achim by main:", mains)
    print("Achim by material:", mats)
    print("Achim unique codes:", len({r['Code'] for r in achim}))


if __name__ == "__main__":
    main()
