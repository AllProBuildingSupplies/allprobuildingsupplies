# Product pricing + supplier sourcing

**Open this folder on `main`.** Factory orders, mill contacts, RFQ wording, and specs all live here. Do not scatter them across new `cursor/*` branches.

When mill quotes come back: landed check first, then ordering sheet in this folder, then sell sheets / catalog / site. Do not invent SKU prices. **Do not place factory POs until all quotes are in** — one combined order window.

**All quotes:** **FOB origin port** with inbound to **NJ USA** (Newark / Elizabeth), then **1600 Livingston Ave, North Brunswick, NJ 08902**. Samples DHL to that address. **Never use 35 Hope Hill Lane** (home). Not EXW factory. Not DDP from a new mill. Memphis / Florida are customer jobs — still price FOB to NJ first.

**Ocean (planning, until rates come down):** **$10,000 per 40ft / 40HQ** to NJ on every landed check. Same **$10,000** on a 45'HQ (more cube, not a cheaper box). Do **not** assume a 20ft is half — glass A-frames stay at **$10,000** until we have a 20ft quote. Landed ≈ FOB × duty stack + $10,000 / sellable units in the box.

## Start here

| File | What it is |
|---|---|
| **`SELLABLE_CATALOG.md`** | What is on the site now vs still waiting on quotes |
| **`EXCLUSIVE_SUPPLIER_ROADMAP.md`** | One-vendor play (Ashland Lakes → every category) |
| **`GLASS_SHEET_SOURCING.md`** | Egypt / India / Turkey. **Sphinx form filled:** `sphinx-glass/Sphinx_Prospect_Registration_AllPro.xlsx` |
| **`CARPET_FACTORY_SOURCING.md`** | Kaili / Qianqiao / **Dongsheng 9 Sep FOB** (800 g **$5.16** / 850 g **$5.44**) + **Anerte pad $22/roll** + **Halex FOB Shanghai in** (`halex/`) |
| **`CPVC_NJPD_SPEC.md`** | NJPD stick = **D2846 SDR-11 CTS**, not SCH80. Tommur already has FOB. Photos in `njpd-cpvc/` |
| **`PVC_PEX_ORIGIN_SOURCING.md`** | **Tommur = PVC/DWV. Zhenpeng = PEX PPSU. Palconn 10 Sep** — PEX-B + F1807; PPSU −5% still keep Zhenpeng; PVC pipe CBM in, do not buy. Compare: `palconn/Palconn_Leela_quote_COMPARE.xlsx`. |
| **`HAILIANG_COPPER_RFQ.md`** | Copper RFQ on WeChat. **ASTM already confirmed.** Waiting on FOB. Do not nag. |
| **`Factory_Order_PVC_PEX_45HQ.csv`** | Current plumbing 45'HQ order (inch sizes, FOB/DDP) |
| `Factory_Order_For_Tommur_FILLED.csv` | Earlier filled 45'HQ package |
| `Tommur_Cost_Margin_Tracker.xlsx` | FOB / landed / HTS / freight / margin |
| `Competitive_Margin_Sheet.xlsx` | FOB → landed vs cheapest online |
| **`Three_Mill_FOB_Landed.xlsx`** | Palconn + Tommur + Zhenpeng on one list (FOB, DDP/est landed, APBS sell). PEX **½ / ¾ / 1" only**. Every mill number we have is filled — blank means that mill did not quote. |
| `COMPETITIVE_MARGINS.md` | How to read the margin sheet |
| `FACTORY_ORDER_README.md` | How the 3-month container projection was built |
| `WHO_TO_CONTACT.md` | Factories to email: Zhenpeng fittings first, Tommur pipe DDP, Palconn backup |
| `KING_SMART_ALIBABA_REVIEW.md` | Alibaba store `kingsmartplumbing` vs NJPD Everflow — USA stock vs 50–75% target |
| `KingSmart_vs_NJPD.xlsx` | SKU-level King Smart list vs Gator sell vs Tommur vs Zhenpeng |
| `GREEN_VALVE_VS_TOMMUR.md` | Misnamed “Zhenpeng” PDF = Green Valve PVC PI vs Tommur FOB/DDP |
| `GreenValve_vs_Tommur.xlsx` | SKU-level Green EXW → landed vs Tommur PVC fittings + pipe |
| `ZHENPENG_FOB_QUOTE.md` | Real Zhenpeng FOB 2026-09-05 vs NJPD / Tommur DDP (23 F2159 SKUs) |
| `Zhenpeng_FOB_vs_NJPD.xlsx` | Line-level FOB → landed → Gator sell, Tommur, King Smart |

## RFQs already sent (waiting on replies)

**No factory POs until these are in and pricing is locked**, then order together so production lines up.

Glass (Sphinx waiting FOB) · carpet (Dongsheng **9 Sep FOB** — 800 g **$5.16/m²** lands **~$7.36/SY**; 850 g **$5.44** lands **~$7.70**; both over Artisent $5.92; need ~**$3.95/m²**. Kaili still open) · pad (Anerte/Kash — **$22/roll**, 285/40HQ; at **$10k** lands **~$2.21/SY** vs Artisent $1.70 — no longer beats) · tackstrip (**Halex FOB Shanghai in** — SGR-120 **$10.74**/box lands **~$21.11** vs HD **$28.65**; first accessory that still beats at $10k ocean. Samples next. Compare: `halex/Halex_Fred_quote_COMPARE.xlsx`) · copper (Hailiang — ASTM confirmed, waiting on FOB).

**PVC pipe + DWV:** Tommur. Green Valve PI is a backup (still EXW — need FOB).

**PEX (½–1" only):** Zhenpeng PPSU REV **held**. **Palconn 10 Sep** (`20260910 Palconn_Full_Catalog_RFQ_SEND.xlsx`): take Palconn for **PEX-B pipe + F1807**; keep Zhenpeng for PPSU (Palconn −5% but 1" elbow still Zhenpeng); **do not buy Palconn PVC pipe** (CBM in — 2" solid lands **~$16.04** vs site **$14.75**). Tommur = PVC/DWV. No PO until combined lock. Compare: `palconn/Palconn_Leela_quote_COMPARE.xlsx`.

## Tommur workbook rules

- **FOB_USD** = yellow column from All 3 Projects only (else blank)
- **CBM** = always `L×W×H/1,000,000` (prefer Lesso carton dims)
- **Duty_Tariff_Freight_Pct** = `(duty$ + freight$) / FOB` → Landed ≈ FOB × (1 + pct)
- **Freight** = **$10,000 / container CBM** × CBM per pc (`build_tommur_cost_margin.py`)

## Rebuild (optional)

```bash
python3 cursor/product-pricing-analysis/build_tommur_cost_margin.py
python3 cursor/product-pricing-analysis/build_competitive_margin_sheet.py
python3 cursor/product-pricing-analysis/build_factory_order_projection.py
python3 cursor/product-pricing-analysis/build_hailiang_copper_rfq.py
python3 cursor/product-pricing-analysis/palconn/build_palconn_full_rfq.py
python3 cursor/product-pricing-analysis/palconn/build_palconn_quote_compare.py
python3 cursor/product-pricing-analysis/build_three_mill_fob_landed.py
python3 cursor/product-pricing-analysis/halex/build_halex_compare.py
```
