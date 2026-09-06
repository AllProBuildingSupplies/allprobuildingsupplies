# Category sell sheets

From the [Sell Sheets](https://cursor.com/agents/bc-b52cab1c-67d7-471d-8910-d9123127244d) agent (PR #53), expanded with Achim flooring and window lines.

PDFs and hero photos live next to the brochure tool so rebuilds keep working:

**[brochure/sell-sheets/](../../brochure/sell-sheets/)**

| Category | PDF |
|---|---|
| Index | [00-sell-sheet-index.pdf](../../brochure/sell-sheets/pdf/00-sell-sheet-index.pdf) |
| Copper fittings | [copper-fittings-sell-sheet.pdf](../../brochure/sell-sheets/pdf/copper-fittings-sell-sheet.pdf) |
| Copper pipe | [copper-pipes-sell-sheet.pdf](../../brochure/sell-sheets/pdf/copper-pipes-sell-sheet.pdf) |
| CPVC pipe | [cpvc-pipes-sell-sheet.pdf](../../brochure/sell-sheets/pdf/cpvc-pipes-sell-sheet.pdf) |
| Insulation | [insulation-sell-sheet.pdf](../../brochure/sell-sheets/pdf/insulation-sell-sheet.pdf) |
| PEX fittings | [pex-fittings-sell-sheet.pdf](../../brochure/sell-sheets/pdf/pex-fittings-sell-sheet.pdf) |
| PEX pipe | [pex-pipes-sell-sheet.pdf](../../brochure/sell-sheets/pdf/pex-pipes-sell-sheet.pdf) |
| PVC fittings | [pvc-fittings-sell-sheet.pdf](../../brochure/sell-sheets/pdf/pvc-fittings-sell-sheet.pdf) |
| PVC pipe | [pvc-pipes-sell-sheet.pdf](../../brochure/sell-sheets/pdf/pvc-pipes-sell-sheet.pdf) |
| Vinyl floor tiles | [vinyl-tiles-sell-sheet.pdf](../../brochure/sell-sheets/pdf/vinyl-tiles-sell-sheet.pdf) |
| Vinyl floor planks | [vinyl-planks-sell-sheet.pdf](../../brochure/sell-sheets/pdf/vinyl-planks-sell-sheet.pdf) |
| Carpet tiles | [carpet-tiles-sell-sheet.pdf](../../brochure/sell-sheets/pdf/carpet-tiles-sell-sheet.pdf) |
| Area rug sets | [rugs-sell-sheet.pdf](../../brochure/sell-sheets/pdf/rugs-sell-sheet.pdf) |
| Mats | [mats-sell-sheet.pdf](../../brochure/sell-sheets/pdf/mats-sell-sheet.pdf) |
| Window blinds | [blinds-sell-sheet.pdf](../../brochure/sell-sheets/pdf/blinds-sell-sheet.pdf) |
| Window shades | [shades-sell-sheet.pdf](../../brochure/sell-sheets/pdf/shades-sell-sheet.pdf) |
| Curtain panels | [curtain-panels-sell-sheet.pdf](../../brochure/sell-sheets/pdf/curtain-panels-sell-sheet.pdf) |
| Kitchen curtains | [kitchen-curtains-sell-sheet.pdf](../../brochure/sell-sheets/pdf/kitchen-curtains-sell-sheet.pdf) |
| Valances & tiers | [valances-tiers-sell-sheet.pdf](../../brochure/sell-sheets/pdf/valances-tiers-sell-sheet.pdf) |
| Rods & finials | [rods-sell-sheet.pdf](../../brochure/sell-sheets/pdf/rods-sell-sheet.pdf) |

## Rebuild

```bash
cd brochure
npm install
npm run sell-sheets
```

Generator: `brochure/generate-sell-sheets.mjs` (catalog from `assets/products.csv`).
Achim catalog rows: `python3 scripts/build_achim_catalog.py`.
