# Storefront & admin (already on `main`)

Most of the old `cursor/*-1b07` GitHub branches were one long storefront agent. That work is already live. This page is the map so those branches do not need to stay on GitHub.

| Area | What shipped on `main` |
|---|---|
| Catalog | Supply House UX, SKU squares, classic guest catalog, grouped tiles, category icons |
| Mobile catalog | Compact two-up grouped tiles (merged from leftover PR #51 during repo cleanup) |
| Admin | Order CSV upload, Excel-safe sizes, mobile ops, order accordion, user create fix |
| Invoices | QuickBooks-style PDF, Graph email attach, Banquest pay link, 3% CC fee |
| Payments | Banquest hosted pay links, auto mark-paid |
| Theme | Light/dark toggle matching sell-sheet colors |
| PWA | Logo icons, cache bumps |
| Staging | Test site (`allpro-test.pages.dev`) vs live GitHub Pages |

Open the live site: [allprobuildingsupplies.com](https://allprobuildingsupplies.com)

Leftover draft PRs that were **not** merged because `main` already had a newer version of the same fix:

- PR #28 order backorder stock — `main` already allows admin backorders (`checkStock: false`)
- PR #26 Cloud Agent env — files were copied to `.cursor/environment.json` and `scripts/cloud-agent-install.sh`
- PR #7 follow-on excel sizes commit — decimal size matching is already in `assets/main.js`
