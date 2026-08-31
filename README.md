# All Pro Building Supplies — Site & API

Static storefront (GitHub Pages) + Cloudflare Worker API + D1 database.

## Deploy the API (Wrangler)

From `backend/`:

```cmd
cd backend
npx wrangler login
npx wrangler deploy
```

### Required secrets (set once)

```cmd
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put JWT_SECRET
```

Recommended for email (contact form, order notifications, admin emails):

```cmd
npx wrangler secret put EMAILJS_SERVICE_ID
npx wrangler secret put EMAILJS_TEMPLATE_ID
npx wrangler secret put EMAILJS_PUBLIC_KEY
npx wrangler secret put NOTIFY_EMAIL
```

Example EmailJS values:

- `EMAILJS_SERVICE_ID` → `service_qefaa3x`
- `EMAILJS_TEMPLATE_ID` → `template_nh3iqob`
- `EMAILJS_PUBLIC_KEY` → your EmailJS public key
- `NOTIFY_EMAIL` → `orders@allprobuildingsupplies.com`

## Deploy the website

Push HTML/CSS/JS (and `assets/zelle-qr.png`) to GitHub; Pages serves the repo root.

API URL: `assets/main.js` → `window.APBS_API_BASE`

## Admin login

1. Open `admin.html`
2. Enter the password you set as `ADMIN_TOKEN`
3. Token is stored in `sessionStorage` as `apbs_admin_token`

## Where to find things

Agent work that is **not** the live storefront (factory orders, cost/margin workbooks, sell-sheet PDFs) is under [`cursor/`](cursor/README.md), one subfolder per agent stream.

## Database

Production data lives in Cloudflare D1 (`allpro-db`). Manage products and users through the admin panel or CSV upload. There is no seed file in this repo by design.

## Brochure & sell sheets

From `brochure/` (requires `npm install` once — downloads Chromium for Puppeteer):

```bash
npm run build          # company brochure PDF
npm run sell-sheets    # one sell sheet PDF per product category
```

Sell sheet outputs land in `brochure/sell-sheets/pdf/`. Index of agent folders: [`cursor/README.md`](cursor/README.md).

## Security notes

- Trade customers receive a signed JWT on login (`apbs_token`).
- Checkout and order history require that token.
- Public catalog hides prices; approved users and admin see full data.
- Order totals and prices are computed on the server for customer checkout.
- Admin can override line prices on manual orders.
