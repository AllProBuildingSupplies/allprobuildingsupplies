# Cursor agent work

Open this folder when you want agent deliverables without hunting through GitHub branches.

Each subfolder is one stream of work. Overlapping pricing PRs were merged into a single folder. Work that already shipped on `main` is listed here so you can find it in the live site, not as leftover branches.

| Folder | What it is | Open this first |
|---|---|---|
| [product-pricing-analysis/](product-pricing-analysis/) | Factory orders, FOB/landed vs online margins, Tommur cost workbook | `Factory_Order_PVC_PEX_45HQ.csv` (send-to-factory PVC+PEX) and `Factory_Order_For_Tommur_FILLED.csv` |
| [sell-sheets/](sell-sheets/) | Category sell-sheet PDFs | `brochure/sell-sheets/pdf/` |
| [inbound-container-tracking/](inbound-container-tracking/) | Wan Hai containers 3 & 4 (already on `main`) | `data/inbound-containers.json` and Admin → Stock |
| [storefront/](storefront/) | Catalog, admin, invoices, Banquest, theme (already on `main`) | the live site |

## GitHub after this cleanup

- **`main`** — live storefront (GitHub Pages) plus the files above.
- **`cursor/repo-organization-7401`** — this cleanup branch (safe to delete after it is merged).
- Old `cursor/*` feature branches were deleted once their unique files lived here or were already on `main`.

## Cursor agents (this repo)

| Agent | Cursor | Code in this repo |
|---|---|---|
| Product pricing analysis | [open](https://cursor.com/agents/bc-dcaa793d-4f8b-42ca-b880-19afc8aad7cc) | `cursor/product-pricing-analysis/` (includes factory-order PRs #56–#58) |
| Tommur cost & margin workbook | — | merged into `product-pricing-analysis/` (was PR #52) |
| Sell Sheets | [open](https://cursor.com/agents/bc-b52cab1c-67d7-471d-8910-d9123127244d) | `brochure/sell-sheets/` (was PR #53) |
| Inbound shipment inventory | [open](https://cursor.com/agents/bc-841f111d-d196-469b-b403-e0e29f057a56) | `data/inbound-containers.json` (merged PR #55) |
| Storefront / ops (1b07) | — | live on `main` (invoices, Banquest, catalogs, admin mobile, theme, …) |
| Cloud Agent dev environment | — | `.cursor/environment.json` and `scripts/cloud-agent-install.sh` |

Internal one-off agents (price research, security reviews, video QA) did not leave branches. They are not duplicated here.
