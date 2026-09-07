# Product pricing + supplier sourcing

**Open this folder on `main`.** Factory orders, mill contacts, RFQ wording, and specs all live here. Do not scatter them across new `cursor/*` branches.

When mill quotes come back: landed check first, then ordering sheet in this folder, then sell sheets / catalog / site. Do not invent SKU prices.

**All quotes:** **FOB Ningbo/Shanghai** (or **FCA Ningbo**) with inbound to **NJ USA**. Samples DHL to NJ. Not EXW factory. Not DDP from a new mill. Memphis is a job, not the warehouse.

## Start here

| File | What it is |
|---|---|
| **`SELLABLE_CATALOG.md`** | What is on the site now vs still waiting on quotes |
| **`EXCLUSIVE_SUPPLIER_ROADMAP.md`** | One-vendor play (Ashland Lakes → every category) |
| **`GLASS_SHEET_SOURCING.md`** | Egypt / India / Turkey contacts + RFQ (China AD/CVD) |
| **`CARPET_FACTORY_SOURCING.md`** | Kaili / Qianqiao / Dongsheng + **pad (Anerte) + tackstrip (Halex) RFQs** + Ablaze 451 photo |
| **`PVC_PEX_ORIGIN_SOURCING.md`** | Stay with Tommur/Lesso; India / Mexico / Vietnam / Turkey backups |
| **`HAILIANG_COPPER_RFQ.md`** | Copper/brass RFQ workbook vs live copper SKUs |
| **`Factory_Order_PVC_PEX_45HQ.csv`** | Current plumbing 45'HQ order (inch sizes, FOB/DDP) |
| `Factory_Order_For_Tommur_FILLED.csv` | Earlier filled 45'HQ package |
| `Tommur_Cost_Margin_Tracker.xlsx` | FOB / landed / HTS / freight / margin |
| `Competitive_Margin_Sheet.xlsx` | FOB → landed vs cheapest online |
| `COMPETITIVE_MARGINS.md` | How to read the margin sheet |
| `FACTORY_ORDER_README.md` | How the 3-month container projection was built |

## RFQs already sent (waiting on replies)

Glass (Sphinx, Gold Plus, Şişecam) · carpet (Kaili, Qianqiao Linda $8.92/m² — too high) · pad (Anerte/Kash) · tackstrip (Halex/Fred).

**PVC DWV:** Zhejiang Green Valve PI YMF26060303X — EXW Taizhou, cheaper than Tommur on paper, not FOB NJ.

**PEX PPSU:** Ningbo Zhenpeng **REV** PI — FOB Ningbo **$16,185.80** / 55,100 pcs / **1 pallet 2.3 CBM 488 kg**. Elbows ~⅓ of Tommur FOB. Ride on next Tommur 45'HQ to NJ. See `PVC_PEX_ORIGIN_SOURCING.md`.

## Tommur workbook rules

- **FOB_USD** = yellow column from All 3 Projects only (else blank)
- **CBM** = always `L×W×H/1,000,000` (prefer Lesso carton dims)
- **Duty_Tariff_Freight_Pct** = `(duty$ + freight$) / FOB` → Landed ≈ FOB × (1 + pct)

## Rebuild (optional)

```bash
python3 cursor/product-pricing-analysis/build_tommur_cost_margin.py
python3 cursor/product-pricing-analysis/build_competitive_margin_sheet.py
python3 cursor/product-pricing-analysis/build_factory_order_projection.py
python3 cursor/product-pricing-analysis/build_hailiang_copper_rfq.py
```
