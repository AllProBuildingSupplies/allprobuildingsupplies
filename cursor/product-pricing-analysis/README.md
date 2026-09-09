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
| **`CARPET_FACTORY_SOURCING.md`** | Kaili / Qianqiao / **Dongsheng FOB Qingdao in** + **Anerte pad $22/roll, 285/40HQ** + **Halex/Fred email in** (`halex/`) + Ablaze 451 photo |
| **`CPVC_NJPD_SPEC.md`** | NJPD stick = **D2846 SDR-11 CTS**, not SCH80. Tommur already has FOB. Photos in `njpd-cpvc/` |
| **`PVC_PEX_ORIGIN_SOURCING.md`** | **Tommur = PVC/DWV. Zhenpeng = PEX PPSU. Palconn quote in** — PEX-B pipe + F1807. Compare: `palconn/Palconn_Leela_quote_COMPARE.xlsx`. |
| **`HAILIANG_COPPER_RFQ.md`** | Copper RFQ on WeChat. **ASTM already confirmed.** Waiting on FOB. Do not nag. |
| **`Factory_Order_PVC_PEX_45HQ.csv`** | Current plumbing 45'HQ order (inch sizes, FOB/DDP) |
| `Factory_Order_For_Tommur_FILLED.csv` | Earlier filled 45'HQ package |
| `Tommur_Cost_Margin_Tracker.xlsx` | FOB / landed / HTS / freight / margin |
| `Competitive_Margin_Sheet.xlsx` | FOB → landed vs cheapest online |
| `COMPETITIVE_MARGINS.md` | How to read the margin sheet |
| `FACTORY_ORDER_README.md` | How the 3-month container projection was built |

## RFQs already sent (waiting on replies)

**No factory POs until these are in and pricing is locked**, then order together so production lines up.

Glass (Sphinx waiting FOB) · carpet (Dongsheng **FOB Qingdao in** — 25 oz **$5.54/m²**; at **$10k/40HQ** lands **~$7.82/SY** vs Artisent $5.92; need ~**$3.95/m²**. Kaili still open) · pad (Anerte/Kash — **$22/roll**, 285/40HQ; at **$10k** lands **~$2.21/SY** vs Artisent $1.70 — no longer beats) · tackstrip (**Halex/Fred emailed 7 Sep** — send `halex/Halex_Fred_company_and_RFQ_SEND.txt`) · copper (Hailiang — ASTM confirmed, waiting on FOB).

**PVC pipe + DWV:** Tommur. Green Valve PI is a backup (still EXW — need FOB).

**PEX (½–1" only):** Zhenpeng PPSU REV **held**. **Palconn/Leela quote in** (`20260908 Palconn_Full_Catalog_RFQ_SEND.xlsx`): take Palconn for **PEX-B pipe + F1807 brass**; keep Zhenpeng for PPSU; keep Tommur for PVC/DWV. No PO until combined lock. Compare: `palconn/Palconn_Leela_quote_COMPARE.xlsx`.

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
```
