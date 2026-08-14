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
- There is no seed data by design. Seed products through the admin panel's CSV upload, or `POST /api/admin/products/sync` with an admin JWT. A ready-to-use catalog CSV exists at `assets/products.csv`. Rows with an empty price render as `$0.00` / out-of-stock — that's data, not a bug.
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
