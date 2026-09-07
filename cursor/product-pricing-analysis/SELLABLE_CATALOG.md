# Sellable catalog — what we can sell today

Living list of products All Pro Building Supplies can put on a quote. The live storefront catalog is `assets/products.csv` (sync to D1 via admin). Achim rows are rebuilt with `python3 scripts/build_achim_catalog.py`.

**Pricing rule:** plumbing SKUs keep their current prices. Every new Flooring / Windows (Achim) SKU is listed with a **blank price**. The website shows **Call for pricing** and will not add those items to cart until a price list is loaded.

## How the site is organized

| Homepage / nav | `main_category` | What is in it |
|---|---|---|
| **Flooring** | Flooring | Achim vinyl tiles & planks, carpet tiles, rugs, mats |
| **Plumbing** | Plumbing | Copper, PVC, CPVC, PEX, pipe insulation (factory lines we already buy) |
| **Windows** | Windows | Achim shades, blinds, curtains, rods & finials |

Glass sheet, mill (broadloom) carpet, toilets / vanities, and brass fittings are **not SKU’d yet** — see “Working on” below. Do not invent those rows.

---

## Achim Importing Co. / Achim Home Decor

Baruch’s father owns **Achim Importing Co.** (Achim Home Decor Inc.). Family pricing. Everything they sell is fair game for our catalog.

| | |
|---|---|
| Founded | 1962 |
| Principal | Marton B. Grossman |
| Address | 1600 Livingston Ave, North Brunswick, NJ |
| Phone | 718.369.2200 |
| Email | customerservice@achimonline.com |
| Sites | https://www.achimhomedecor.com · https://achimonline.com |
| Scale | Dropship / fulfillment, ~600k sq ft, 10,000+ SKUs |

The CSV does **not** dump every color/size SKU. It matches plumbing style: **one `Code` per product family**, variants in `Size` (color, pattern, motif number, or “Stock widths”). Achim’s full warehouse line is larger than the consumer website; extra colorways are still quoteable — call Achim / us.

Website listings captured 2026-09-06 from achimhomedecor.com.

### Flooring (Achim)

| Family | Code | Variants (Size) | Notes |
|---|---|---|---|
| Portfolio 12x12 2.0mm vinyl tile | `ACH-PORTFOLIO-TILE` | Walnut Parquet, Blue Diamond, Cobble Mosaic, Rustic Clay Square, Midnight Marble, Ash Grey Wood | Peel & stick |
| Sterling 12x12 vinyl tile | `ACH-STERLING-TILE` | 15 stone / wood looks | |
| Sterling Square Parquet | `ACH-STERLING-PARQUET` | Square Parquet | |
| Majestic 18x18 vinyl tile | `ACH-MAJESTIC-TILE` | Light Gray Slate, Verde Green Marble, Rustic Copper Slate, Ghibli Beige Granite | |
| Tivoli 12x12 vinyl tile | `ACH-TIVOLI-TILE` | Motifs #103–#457 (23) | 45 / ctn, 45 sq ft |
| Nexus 12x12 vinyl tile | `ACH-NEXUS-TILE` | Motifs #101–#462 (37) | 20 / ctn, 20 sq ft |
| Floor Galore 5.2x5.2 | `ACH-FLOORGALORE-TILE` | Sandstone Quartz, Galaxy, Graphite | |
| Palazzo 12x24 | `ACH-PALAZZO-TILE` | 6 looks | |
| Retro 12x12 | `ACH-RETRO-TILE` | 28 patterns | 20 / ctn |
| Arabesque 12x12 | `ACH-ARABESQUE-TILE` | Arabesque | |
| OutdoorZ interlocking deck | `ACH-OUTDOORZ-DECK` | Honey Oak, Royal Mahogany | |
| Interlocking foam 24x24 | `ACH-FOAM-TILE` | Solid, Pine, Ash | 4 / ctn, 16 sq ft |
| Tivoli II 6x36 planks | `ACH-TIVOLI2-PLANK` | Maple, Rustic Oak, Silver Spruce, Mahogany, Hazel Ash, Silverton | |
| Sterling 6x36 2.0mm planks | `ACH-STERLING-PLANK-2MM` | Birchwood, Driftwood, Rustic Grey, Silver Spruce, Medium Oak | |
| Sterling 6x36 1.2mm planks | `ACH-STERLING-PLANK-12MM` | Walnut, Hickory, White Oak, Light Grey Oak, Saddle | |
| Nexus 6x36 planks | `ACH-NEXUS-PLANK` | Walnut, Saddle, Light Grey Oak, Hickory, White Oak, Espresso | |
| Flex Flor 9x48 looselay | `ACH-FLEXFLOR-PLANK` | Dunes, Smoke, Whitewash, Ebony, Gray, Rustic Cherry, Aged Driftwood | |
| Nexus 12x12 carpet tile | `ACH-NEXUS-CARPET` | Burgundy, Navy, Brown, Jet, Tan, Smoke | 12 / ctn, polyester peel & stick |
| Capri 3-piece rug set | `ACH-CAPRI-RUG` | 7 colorways | 5x7 + runner + mat |
| Printed coir 18x30 | `ACH-MAT-COIR` | 15 prints | Seasonal art rotates |
| Welcome rubber 18x30 | `ACH-MAT-RUBBER` | 7 prints | |
| Coco entrance 18x30 | `ACH-MAT-COCO` | 9 designs | |
| Wrought iron rubber 18x30 | `ACH-MAT-WROUGHT` | 8 designs | |
| Memory foam Elle 17x24 | `ACH-MAT-MEMORY-ELLE` | Black, Grey, Tan, White | |
| Memory foam Madison 17x24 | `ACH-MAT-MEMORY-MADISON` | Brown, Burgundy, Green, Navy | |
| Anti-fatigue Clarke 18x30 | `ACH-MAT-FATIGUE-CLARKE` | Black, Grey, Navy, Tan | |
| Anti-fatigue printed 18x30 | `ACH-MAT-FATIGUE-PRINT` | 21 kitchen prints | |
| Anti-fatigue Arlington | `ACH-MAT-FATIGUE-ARLINGTON` | Green, Grey, Tan | |
| Anti-fatigue Live Love Laugh | `ACH-MAT-FATIGUE-LLL` | Burgundy, Charcoal, Grey | |
| Faux-leather 18x30 | `ACH-MAT-LEATHER-1830` | 6 colors | |
| Faux-leather 20x39 | `ACH-MAT-LEATHER-2039` | 6 colors | |

### Windows (Achim)

**Shades** (cordless / cords-free; Size = Stock widths unless noted): Glide n' Go blackout roller, Tear Down light filtering, Top-down/bottom-up honeycomb, Honeycomb cellular pleated, 1-2-3 room-darkening pleated, Celestial sheer, Blackout roman, Privacy jute, Tear Down room darkening, Buffalo Check roman (Burgundy).

**Blinds:** Veranda roll-up, Solstice roll-up, GII Luna 2" vinyl venetian, GII Madera Falsa 2" faux wood, GII Morningstar 1" light-filtering mini, GII Deluxe Sundown 1" room-darkening mini.

**Curtain panels, kitchen sets, valances/tiers:** Named Achim styles from the live curtains catalog (Constellation through Buffalo Check / Charlotte / Darcy), including French-door size runs for Darcy and Buffalo Check.

**Rods:** Buono II (13 finials), Camino (Lincroft, Fairmont, Ava), Metallo (Lexus, Leaf, Ilana, Carrera).

Achim also sells other décor (pillows, lighting, etc.) that is **not SKU’d yet**. Add when we want those on the site.

---

## Plumbing (already on the site)

248 SKUs, priced. Factories we have already spoken to / quoted:

| Material | What | Factory notes |
|---|---|---|
| **PVC** | Sch 40 solid & foam-core pipe + DWV fittings | Stay with Tommur / Lesso as primary. Backup quotes: India ASTM mills, Mexico Wavin (USMCA), Vietnam only if they run IPS + NSF. Memo: `PVC_PEX_ORIGIN_SOURCING.md` |
| **CPVC** | Sch 80 + SDR-11 / SDR-13.5 | Same China primary |
| **PEX** | PEX-B **pipe** — Tommur / Lesso. PEX **PPSU fittings ½–1"** — **Ningbo Zhenpeng primary** (REV FOB Ningbo). 1¼–2" fittings stay Tommur. Turkey is PEX-pipe backup only. |
| **Copper** | Type K soft / Type L hard tube + wrought fittings | Hailiang RFQ in this folder: `HAILIANG_COPPER_RFQ.md` |
| **Insulation** | Cold-water pipe insulation | On site |
| **Brass** | — | Not in `products.csv` yet. Do not invent SKUs. Add when the Hailiang (or other) list is ready. |

---

## Working on (do not add fake SKUs)

| Line | Status |
|---|---|
| **Glass sheets** | 1/4", 3/8", 1/2" (6/10/12 mm). China/Malaysia AD/CVD is a problem. Egypt (Sphinx) + India (Gold Plus) first; Şişecam as a quality check. Memo: `GLASS_SHEET_SOURCING.md`. RFQ sent; waiting on quotes. |
| **Broadloom carpet + pad + tackstrip** | Mill quotes in progress. Contacts + copy-paste RFQs + Ablaze photo: `CARPET_FACTORY_SOURCING.md`. Not the same as Achim Nexus **carpet tiles**. |
| **Toilets, vanities, bath fixtures** | Expand later. Baruch has companies to research when we get there. |
| **Advantage Glue-Down Plank II** | Mentioned as a US fill line — no Achim code, not added. |

---

## Sell sheets

One PDF per `sub_sub_category` (same as plumbing):

Plumbing: PVC Pipe, PVC DWV Fittings, Copper Tube, Copper Fittings, CPVC Pipe, PEX-B Pipe, PEX Fittings, Pipe Insulation.

New: Vinyl Floor Tiles, Vinyl Floor Planks, Carpet Tiles, Area Rug Sets, Entrance & Kitchen Mats, Window Blinds, Window Shades, Curtain Panels, Kitchen Curtains, Valances & Tiers, Curtain Rods & Finials.

Rebuild: `cd brochure && npm run sell-sheets`.

---

## Go-live checklist

1. Merge this catalog + site work.
2. Admin **sync** `assets/products.csv` to D1 (`POST /api/admin/products/sync`) on **test**, then production. GitHub Pages alone will not show new SKUs on the live Worker until that sync.
3. Send the Achim price list when ready — we fill the Price column and re-sync. Until then every Achim card stays **Call for pricing**.
