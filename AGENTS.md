# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
A single product: the "All Pro Building Supplies" B2B storefront, made of three parts:
- Static frontend — plain HTML/CSS/JS at the repo root (`*.html`, `assets/`). No build step. Serve statically.
- Backend API — a Cloudflare Worker in `backend/` (`src/index.js`, config in `wrangler.toml`), backed by a Cloudflare D1 (SQLite) database bound as `DB`.
- `brochure/` — an optional, standalone Puppeteer script that renders a PDF. Unrelated to running the storefront.

There is no test suite, linter, or CI configured anywhere in this repo, and the storefront has no build step.

### Running the two services (dev)
Run both at once; the frontend calls the backend over HTTP.
- Backend: from `backend/`, run `npm run dev` (alias for `wrangler dev`; defaults to `http://127.0.0.1:8787`). Local dev secrets are read from `backend/.dev.vars` (gitignored) — it must define at least `ADMIN_TOKEN` and `JWT_SECRET`. Recreate it if missing.
- Frontend: from the repo root, run `python3 -m http.server 8080` (or any static server).

### Non-obvious gotchas
- The frontend picks the API from hostname in `assets/main.js` (`window.APBS_API_BASE`). Live domain → production Worker. Test hosts (`allpro-test.pages.dev`, `test.allprobuildingsupplies.com`) → test Worker. Local override: `?apbs_env=test` or temporarily point at `http://127.0.0.1:8787/api` (do NOT commit a hardcoded local URL).
- D1 has no schema/migrations in the repo (production D1 is already provisioned). The Worker also runs `ensureCoreSchema` / column ensures on request so a fresh test D1 gets tables automatically. For local DB: from `backend/`, `npx wrangler d1 execute allpro-db --local --file schema.sql`. Local D1 data lives under `backend/.wrangler/` (gitignored), so it persists across restarts but is wiped if that dir is deleted.
- There is no seed data by design. Seed products through the admin panel's CSV upload, or `POST /api/admin/products/sync` with an admin JWT. A ready-to-use catalog CSV exists at `assets/products.csv`. Plumbing rows with an empty price render as `$0.00` / out-of-stock — that's data, not a bug. Flooring and Windows (Achim) rows are listed with a blank price on purpose: the site shows **Call for pricing** and will not add them to cart until a price list is loaded. Rebuild Achim rows with `python3 scripts/build_achim_catalog.py`, then sync D1.
- Auth model: admin logs in with the raw `ADMIN_TOKEN` (via `POST /api/admin/login`) to get an admin JWT. Passwords are SHA-256 hashed client-side before being sent, so `register`/`login`/`change-password` all send the hash, and the DB stores the hash. New registrations are `pending` and must be approved (admin panel or `PUT /api/admin/users/bulk`) before they can log in.
- `JWT_SECRET` falls back to `ADMIN_TOKEN` if unset, so customer tokens won't verify unless at least `ADMIN_TOKEN` is set.
- EmailJS (contact form + order/notify emails) is optional; those routes degrade gracefully when the `EMAILJS_*` secrets are unset. Core catalog/auth/cart/checkout/admin flows work without it.

### Test / staging site (does not touch live)
- **Live:** GitHub Pages from `main` → `https://allprobuildingsupplies.com` → production Worker + production D1.
- **Test frontend:** Cloudflare Pages project `allpro-test` → `https://allpro-test.pages.dev` (optional custom domain `test.allprobuildingsupplies.com` later via DNS CNAME).
- **Test API:** Worker `allpro-api-test` (`npx wrangler deploy --env test`) → preview D1 (`preview_database_id` in `wrangler.toml`).
- Deploy test frontend (static files only): from repo root, `bash scripts/deploy-test-frontend.sh`.
- Test admin password is the `ADMIN_TOKEN` secret on the **test** Worker (`wrangler secret put ADMIN_TOKEN --env test`), independent of production.

### Brochure PDF tool (optional)
From `brochure/`: `npm install` then `npm run build`. `npm install` downloads a Chromium build for Puppeteer, so it is intentionally excluded from the startup update script.

### Category sell sheets
From `brochure/`: `npm run sell-sheets` regenerates one PDF per catalog category (plus an index) under `brochure/sell-sheets/pdf/`, driven by `assets/products.csv` and standards in `brochure/category-standards.js`.

### Shipping site and catalog changes
When the user asks to update the live website, catalog, products, homepage, or storefront: work and test on a branch if needed, then **always merge to `main` and push** before finishing. Do not leave the work only on a PR branch. The user needs to open `https://allprobuildingsupplies.com` and see the change.

After merging to `main`:
- Static frontend deploys from GitHub Pages on `main`. Confirm the live HTML/JS/images actually updated.
- If `backend/` changed, deploy the production Worker: from `backend/`, `npx wrangler deploy` (not `--env test`).
- If catalog SKUs, images, or categories changed, upsert into **production D1**. Do not `DELETE` the live `products` table and replace it from CSV — that would wipe on-hand plumbing qty. Insert/update the new or changed rows only (Achim/`ACH-*` upserts are the usual case). Then confirm `GET https://allpro-api.baruch-6d5.workers.dev/api/products` includes the new items.

GitHub should stay on `main` only. Archive finished Cursor cloud agents in the Agents dashboard.

### Supplier contacts, RFQs, specs — one folder, on `main`

All mill contacts, RFQ wording, specs, and factory-order sheets live in **`cursor/product-pricing-analysis/` on `main`**. That is the only place to add glass, carpet, pad, tackstrip, copper, PVC/PEX origin, or exclusive-supplier notes.

- Do **not** open a new `cursor/*` branch each time a mill, country, or RFQ comes up. Edit the files in that folder and merge back to `main` in the same turn.
- If the platform forces a feature branch, reuse the existing open sourcing branch if there is one. Otherwise use a single long-lived branch `cursor/supplier-sourcing-d7cc`, put the files in `cursor/product-pricing-analysis/`, and **merge it to `main` before finishing**. Do not leave a second copy only on the PR.
- Site/catalog SKU work still merges to `main` as already documented above. Do not invent glass/carpet/pad prices until a mill quote is in.

### Factory emails, WeChat, WhatsApp, and forms (must be forwardable)

Anything Baruch will send or attach to a mill must be **ready to forward with no edits**. Write in All Pro’s voice, to the factory.

- Do **not** address Baruch. Do **not** include agent notes, status, strategy, “tell them,” “we already said,” “do not nag,” home vs warehouse asides, “yellow cells = our answers,” “please sign before sending,” competitor names (Artisent, NJPD, Mortisay), or later routing (Florida/Memphis jobs).
- Put internal commentary only in the `.md` memos. Put the sendable piece in a `*_SEND.xlsx` / `*_SEND.txt` (or a workbook that contains **only** mill-facing sheets).
- Sign-off: Baruch Grossman, Founder & Owner, All Pro Building Supplies LLC, +1 732-734-1123, info@allprobuildingsupplies.com, warehouse **1600 Livingston Ave, North Brunswick, NJ 08902**. Leave a blank signature cell if the mill’s form needs a wet signature.

**PVC pipe + DWV fittings:** mill is **Tommur / Lesso**.

**PEX:** mill is **Ningbo Zhenpeng**. Sizes **½ / ¾ / 1" only** — do not order 1¼ / 1½ / 2" PEX. No factory POs until every mill quote is in; then place orders together so production lines up.

### Import destination (all mill quotes)

**Delivery / warehouse (use this on every RFQ, sample, and mill form):**  
**1600 Livingston Ave, North Brunswick, NJ 08902, USA.**

**Do not use 35 Hope Hill Lane.** That is Baruch’s home. Never put it on factory quotes, DHL samples, prospect forms, or commercial invoices as the ship-to.

Baruch / All Pro is based in **New Jersey**. Every factory RFQ, sample, and landed-cost check uses **FOB origin port** with inbound to **NJ USA** (NY/NJ — Newark / Elizabeth), then to **1600 Livingston Ave**. Sample courier is DHL to that Livingston address.

Do **not** quote door-to-door Memphis, Texas, Florida, or “Southeast” as the default. Those are **customer jobs**, not the warehouse. Example: a glass container *might* later go straight to a Florida customer — still get **FOB + ocean to NJ** first, then change routing. Memphis is a job only.

Preferred Incoterms: **FOB Ningbo or Shanghai** (glass: **FOB Alexandria / Damietta** or the mill’s origin port). **FCA** same ports is OK. Do **not** take **EXW** factory. Do **not** take **DDP** from a new mill unless they give an all-in price that already includes US MFN + Section 301 + overlay, and we still prefer our own forwarder on first orders.

Do **not** commit `.cursor/environment.json`. Cloud Agents for this storefront use the existing personal environment tied to GitHub `AllProBuildingSupplies/allprobuildingsupplies`. A committed environment file made Cursor create a second environment (`allprobuildingsupplies/allprobuildingsupplies`) and broke new chats.
