# Hailiang / AILIANG copper + brass RFQ

Factory catalog excerpt (pages 19–25) matched to every copper SKU on the All Pro site (`assets/products.csv`).

**WeChat:** `中国海亮铜管13656855717`. Workbook `Hailiang_Copper_Brass_RFQ.xlsx` sent 5 Sep. **No FOB yet.** Screenshot: `hailiang/wechat-b88-vs-en1057.jpg`.

## Status (9 Sep 2026)

She asked: **ASTM B88 还是 EN 1057？** Answer: **ASTM B88 only. Not EN 1057.**

That is the right question. EN 1057 is EU metric tube (15 / 22 / 28 mm). NJ / US plumbing is **ASTM B88 CTS** Type K / Type L. A metric quote will not go on NJPD’s jobs.

| | ASTM B88 (quote this) | EN 1057 (do not quote) |
|---|---|---|
| Market | US / Canada | EU |
| Sizes | ½"–4" CTS | 15 / 22 / 28 / 35 / 42 / 54 / 76 / 108 mm |
| Tube | Type **K** (thick) + Type **L** (thinner). Hard 10 ft sticks; Type K also soft coil | R220 / R250 — not Type K/L |
| Fittings | **ASTM B16.22** wrought, socket for B88 OD | EN 1254, socket for EN 1057 OD |
| ½"–2½" | Catalog φ is close enough (15=½" … 67=2½") | Same ballpark |
| **3"** | **OD 79.4 mm** | Catalog **φ76** — **will not fit** US 3" |
| **4"** | **OD 104.8 mm** | Catalog **φ108** — **will not fit** US 4" |

Yellow/red rows in the Excel are exactly those 3"/4" OD mismatches plus pipe / PEX adapters / stub-outs that were not in the fittings booklet.

**Still waiting on Unit_Price_FOB_USD.** No copper PO until the filled sheet is in (same combined lock as everyone else).

## Copy-paste WeChat (send this)

```
请按 ASTM B88 报价，不要按 EN 1057。

我们是美国新泽西进口商。
- 铜管：ASTM B88。Type L 硬管 10 ft；Type K 软盘管 + 硬管。Excel 里 PIPING 行也请报价。
- 管件：ASTM B16.22，必须配 B88 管外径。不要用欧标 φ76 / φ108 当 3" / 4"。
- 3" 外径必须 79.4 mm，4" 外径必须 104.8 mm。如果这两档只能做 EN 1057，请写“不能做美标”，不要用欧标价充美标。
- 红/黄行请确认能否做美标。
- 价格：FOB 宁波，美元。填 Excel 的 Unit_Price_FOB_USD。

Please quote ASTM B88 only — not EN 1057.
Tube: Type L hard 10 ft + Type K (soft coil and hard). Fittings must fit B88 CTS (B16.22).
3" OD = 79.4 mm, 4" OD = 104.8 mm. If you cannot make those, mark “cannot make ASTM” — do not quote φ76 / φ108 as 3" / 4".
FOB Ningbo, USD, fill the Excel.
```

## Send this

`Hailiang_Copper_Brass_RFQ.xlsx` — sheet **RFQ_send_this** (already on WeChat)

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

| US CTS | Catalog φ | ASTM B88 OD | Fit US tube? |
|--------|-----------|-------------|---|
| 1/2" | 15 | 15.875 mm | Yes (close) |
| 3/4" | 22 | 22.225 mm | Yes (close) |
| 1" | 28 | 28.575 mm | Yes (close) |
| 1-1/4" | 35 | 34.925 mm | Yes (close) |
| 1-1/2" | 42 | 41.275 mm | Yes (close) |
| 2" | 54 | 53.975 mm | Yes (close) |
| 2-1/2" | 67 | 66.675 mm | Yes (close) |
| 3" | 76 | **79.375 mm** | **No — ask ASTM** |
| 4" | 108 | **104.775 mm** | **No — ask ASTM** |

Pipe, copper-to-PEX adapters, and stub-outs are not on the fittings excerpt. Brass SKUs are listed on **Brass_factory_only** — none are on the live site.
