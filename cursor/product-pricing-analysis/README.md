# Product pricing + supplier sourcing

**Open this folder on `main`.** Factory orders, mill contacts, RFQ wording, and specs all live here. Do not scatter them across new `cursor/*` branches.

When mill quotes come back: landed check first, then ordering sheet in this folder, then sell sheets / catalog / site. Do not invent SKU prices. **Do not place factory POs until all quotes are in** — one combined order window.

**All quotes:** **FOB Ningbo/Shanghai** (or **FCA Ningbo**) with inbound to **NJ USA**. Samples DHL to NJ. Not EXW factory. Not DDP from a new mill. Memphis is a job, not the warehouse.

## Start here

| File | What it is |
|---|---|
| **`SELLABLE_CATALOG.md`** | What is on the site now vs still waiting on quotes |
| **`EXCLUSIVE_SUPPLIER_ROADMAP.md`** | One-vendor play (Ashland Lakes → every category) |
| **`GLASS_SHEET_SOURCING.md`** | Egypt / India / Turkey contacts + RFQ (China AD/CVD) |
| **`CARPET_FACTORY_SOURCING.md`** | Kaili / Qianqiao / Dongsheng + **Anerte pad FOB in** (5 lb film $0.88/m²) + tackstrip (Halex) + Ablaze 451 photo |
| **`CPVC_NJPD_SPEC.md`** | NJPD stick = **D2846 SDR-11 CTS**, not SCH80. Tommur already has FOB. Photos in `njpd-cpvc/` |
| **`PVC_PEX_ORIGIN_SOURCING.md`** | **Tommur = PVC pipe + DWV. Zhenpeng = PEX (½–1" only).** No POs until all mill quotes are in |
| **`HAILIANG_COPPER_RFQ.md`** | Copper RFQ sent WeChat. She asked B88 vs EN 1057 — **quote B88 only.** No FOB yet |
| **`Factory_Order_PVC_PEX_45HQ.csv`** | Current plumbing 45'HQ order (inch sizes, FOB/DDP) |
| `Factory_Order_For_Tommur_FILLED.csv` | Earlier filled 45'HQ package |
| `Tommur_Cost_Margin_Tracker.xlsx` | FOB / landed / HTS / freight / margin |
| `Competitive_Margin_Sheet.xlsx` | FOB → landed vs cheapest online |
| `COMPETITIVE_MARGINS.md` | How to read the margin sheet |
| `FACTORY_ORDER_README.md` | How the 3-month container projection was built |

## RFQs already sent (waiting on replies)

**No factory POs until these are in and pricing is locked**, then order together so production lines up.

Glass (Sphinx, Gold Plus, Şişecam) · carpet (Kaili, Qianqiao, Dongsheng) · pad (Anerte/Kash — **FOB in**, need 40HQ packing + NJ sample) · tackstrip (Halex/Fred) · copper (Hailiang WeChat — **ASTM B88 not EN 1057**, waiting on FOB).

**PVC pipe + DWV:** Tommur. Green Valve PI is a backup (still EXW — need FOB).

**PEX (½–1" only, Zhenpeng):** REV PI held. Do not order yet. Drop 1¼–2" PEX from the working list.

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
