# Hailiang / AILIANG copper + brass RFQ

Factory catalog excerpt (pages 19–25) matched to every copper SKU on the All Pro site (`assets/products.csv`).

## Send this

`Hailiang_Copper_Brass_RFQ.xlsx` — sheet **RFQ_send_this**

- Column A: photo from **their** catalog (item family)
- Factory item no. (`L-101`, `S-102`, `T-102`, …) and **φ mm** size as printed
- Our APBS code / inch size / Type K vs L
- Blank **Qty** and **Unit_Price_FOB_USD** for them to fill
- Green = match, yellow = match but 3"/4" metric vs ASTM OD, red = not on these 7 pages

## Rebuild

```bash
python3 cursor/product-pricing-analysis/build_hailiang_copper_rfq.py
```

Crops for a rebuild (optional) were generated from the Hailiang fittings booklet. The sendable workbook is `Hailiang_Copper_Brass_RFQ.xlsx`.

## Size map

| US CTS | Catalog φ |
|--------|-----------|
| 1/2" | 15 |
| 3/4" | 22 |
| 1" | 28 |
| 1-1/4" | 35 |
| 1-1/2" | 42 |
| 2" | 54 |
| 2-1/2" | 67 |
| 3" | 76 (confirm vs ASTM 79.4 mm OD) |
| 4" | 108 (confirm vs ASTM 104.8 mm OD) |

Pipe, copper-to-PEX adapters, and stub-outs are not on this excerpt. Brass SKUs are listed on **Brass_factory_only** — none are on the live site.
