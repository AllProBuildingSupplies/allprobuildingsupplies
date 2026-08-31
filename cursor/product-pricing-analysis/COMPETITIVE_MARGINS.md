# Competitive Margin Sheet

Simple pricing aid: **FOB → Landed → cheapest online → margin**.

## Files
- `Competitive_Margin_Sheet.xlsx` — use this (Summary + Margins + Research_Notes)
- `Competitive_Margin_Sheet.csv` — same rows, flat
- `Tommur_Cost_Margin_Tracker.xlsx` — source FOB / landed (unchanged)

## Columns (Margins sheet)
| Column | Meaning |
|--------|---------|
| FOB | Yellow factory FOB (pipe = **/ft**, else **/pc**) |
| Landed | Est. landed (45'HQ when dims exist) |
| Cheapest Online | Lowest public web price found (bulk unit if cheaper) |
| Margin $ | Online − Landed |
| Margin % | (Online − Landed) / Online |

## Rebuild
```bash
python3 cursor/product-pricing-analysis/build_competitive_margin_sheet.py
```
Requires prior research JSONs used by the script (`/tmp/prices_*.json` + copper survey artifact), or re-run web research.

## Caveats
See Summary sheet in the workbook. Copper pipe FOB vs US retail looks unit-suspicious — confirm with factory before setting pipe sell prices.
