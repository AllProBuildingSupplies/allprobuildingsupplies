# Product pricing analysis

Merged from overlapping Cursor PRs #52, #56, #57, and #58 (Tommur workbook + competitive margins + factory orders).

Agent: [Product pricing analysis](https://cursor.com/agents/bc-dcaa793d-4f8b-42ca-b880-19afc8aad7cc)

## Start here

| File | Use |
|---|---|
| **`Factory_Order_PVC_PEX_45HQ.csv`** | Latest factory order: PVC + PEX for a 45'HQ (~3 month supply), with inch sizes, carton dims, FOB and DDP |
| **`Factory_Order_For_Tommur_FILLED.csv`** | Earlier filled 45'HQ package (core money-makers + top-up) |
| `Factory_Order_For_Tommur.csv` | Core 3-month reorder only (~60% of a 45'HQ) |
| `Factory_Order_3Mo_Container.xlsx` | Full projection workbook (summary, fill, assumptions) |
| `Tommur_Cost_Margin_Tracker.xlsx` | FOB / landed / HTS / freight / margin by SKU |
| `Competitive_Margin_Sheet.xlsx` | FOB → landed vs cheapest online price |
| `COMPETITIVE_MARGINS.md` | How to read the margin sheet |
| `FACTORY_ORDER_README.md` | How the 3-month container projection was built |

## Tommur workbook rules

- **FOB_USD** = yellow column from All 3 Projects only (else blank)
- **CBM** = always `L×W×H/1,000,000` (prefer Lesso carton dims)
- **Duty_Tariff_Freight_Pct** = `(duty$ + freight$) / FOB` → Landed ≈ FOB × (1 + pct)

## Rebuild (optional)

Scripts live in this folder. They still need the original research JSON / live order pulls the agent used.

```bash
python3 cursor/product-pricing-analysis/build_tommur_cost_margin.py
python3 cursor/product-pricing-analysis/build_competitive_margin_sheet.py
python3 cursor/product-pricing-analysis/build_factory_order_projection.py
```
