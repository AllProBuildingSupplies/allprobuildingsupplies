# Tommur Cost & Margin Tracker

Workbook: `Tommur_Cost_Margin_Tracker.xlsx`

Built by `scripts/build_tommur_cost_margin.py` from the factory/project workbooks plus the website catalog.

## Sheets
- **Cost_Margin_Master** — one row per Tommur-offerable SKU with codes, dims, FOB/DDP, HTS, freight (40' & 45'HQ), landed cost, margins
- **FOB_vs_DDP_Compare** — SKUs that have both FOB and historical DDP
- **HTS_Tariff_Reference** — duty/tariff stack used
- **Data_Gaps** — missing FOB / dims / sell price
- **Assumptions_Notes** — formulas and caveats
- **Summary** — counts

## Key rules
- **FOB_USD** = yellow column from All 3 Projects only (else blank)
- **CBM** = always `L×W×H/1,000,000` (prefer Lesso carton dims)
- **Duty_Tariff_Freight_Pct** = `(duty$ + freight$) / FOB` → Landed ≈ FOB × (1 + pct)

## Rebuild
```bash
python3 scripts/build_tommur_cost_margin.py
```

## Still needed from you
Upload `Complete Fittings Price Lists.xlsx` (OneDrive path was not accessible here) to refresh fitting sell prices beyond the website catalog.

## Competitive margins (follow-on)
See `COMPETITIVE_MARGINS.md` and `Competitive_Margin_Sheet.xlsx` — FOB / landed vs cheapest online price with $ and % margins.
Rebuild: `python3 scripts/build_competitive_margin_sheet.py`
