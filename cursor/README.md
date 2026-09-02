# Cursor work (files in this repo)

GitHub now has **one branch: `main`**. Agent deliverables that are not the live storefront live here:

| Folder | What it is | Open this first |
|---|---|---|
| [product-pricing-analysis/](product-pricing-analysis/) | Factory orders, margins, Tommur cost workbook | `Factory_Order_PVC_PEX_45HQ.csv` |
| [manufacturer-sourcing/](manufacturer-sourcing/) | Best/cheapest factories vs Tommur + NSF/UPC + RFQ packs | `RFQ_CONTACTS_AND_LISTS.md` |
| [sell-sheets/](sell-sheets/) | Category sell-sheet PDFs | `brochure/sell-sheets/pdf/` |
| [inbound-container-tracking/](inbound-container-tracking/) | Containers 3 & 4 | `data/inbound-containers.json` and Admin → Stock |
| [storefront/](storefront/) | Catalog / admin / invoices (already the live site) | [allprobuildingsupplies.com](https://allprobuildingsupplies.com) |

## Cloud agents — keep vs archive

Cursor cannot merge conversations. Work products are already merged on `main`. Archive the rest in [cursor.com/agents](https://cursor.com/agents) so the list stays short.

**Keep (at most these):**

| Keep? | Agent | Why |
|---|---|---|
| Yes, until you are done organizing | [Repository organization cleanup](https://cursor.com/agents/bc-8ededf4a-b15b-422b-bb84-eb79e8217401) | This cleanup chat |
| Optional | [Product pricing analysis](https://cursor.com/agents/bc-dcaa793d-4f8b-42ca-b880-19afc8aad7cc) | Only if you still want to iterate **proposed sell prices** / FOB-vs-DDP. The factory CSVs are already in this folder. |
| Optional | [Sell Sheets](https://cursor.com/agents/bc-b52cab1c-67d7-471d-8910-d9123127244d) | Only if you want to change the PDFs. Rebuild: `cd brochure && npm run sell-sheets` |

**Archive (redundant — children, finished imports, or one-shot bots):**

- Pricing children: OCR screenshot, PVC prices, CPVC/PEX/insulation prices, copper prices
- Inbound children: test inbound UI, demo mark arrived, review demo video, mine inbound transcript, explore sales, try admin login
- Imported old desktop chats (already shipped): Website code review, Test folder file review, Product categories, Admin panel and products table
- [Inbound shipment inventory](https://cursor.com/agents/bc-841f111d-d196-469b-b403-e0e29f057a56) — shipped as PR #55
- Security review A/B, privacy guard A/B, platform pattern A/B, API RPC, config injection, filesystem boundary, agent tooling trust
- Automation runs: Pr approval agent logic, Security review orchestrator

**Turn off if you do not want extra agents on every PR:**

- [Pull Request Router and Approver](https://cursor.com/automations/3aac2ee9-9ff8-11f1-b532-320a589b8025) (enabled)
- [Security Reviewer](https://cursor.com/automations/3a72cb06-9ff8-11f1-b532-320a589b8025) (enabled)

Those two automations spawned most of the one-shot review agents.
