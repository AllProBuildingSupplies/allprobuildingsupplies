# All Pro Building Supplies — Site & API

Static storefront (GitHub Pages) + Cloudflare Worker API + D1 database.

## Deploy the API (Wrangler)

From `backend/`:

```cmd
cd backend
npx wrangler login
npx wrangler deploy
```

### Required secrets (set once after deploy)

Use the **same value** you want for the admin dashboard password:

```cmd
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put JWT_SECRET
```

Recommended additional secrets for email (contact form, order notifications, admin emails):

```cmd
npx wrangler secret put EMAILJS_SERVICE_ID
npx wrangler secret put EMAILJS_TEMPLATE_ID
npx wrangler secret put EMAILJS_PUBLIC_KEY
npx wrangler secret put EMAILJS_PRIVATE_KEY
npx wrangler secret put NOTIFY_EMAIL
```

Example values (match your EmailJS dashboard):

- `EMAILJS_SERVICE_ID` → `service_qefaa3x`
- `EMAILJS_TEMPLATE_ID` → `template_nh3iqob`
- `EMAILJS_PUBLIC_KEY` → your EmailJS public key
- `EMAILJS_PRIVATE_KEY` → optional private key for server-side send
- `NOTIFY_EMAIL` → `orders@allprobuildingsupplies.com`

## Deploy the website

Push HTML/CSS/JS to GitHub; Pages serves the root of this repo.

API URL is set in `assets/main.js` as `window.APBS_API_BASE`.

## Admin login

1. Open `admin.html`
2. Enter the password you set as `ADMIN_TOKEN` (not stored in the repo)
3. Session token is saved in `sessionStorage` as `apbs_admin_token`

## Database

- Schema reference: `backend/seed.sql`
- Apply to D1: `npx wrangler d1 execute allpro-db --remote --file=./seed.sql` (use with care on production)

## Security notes

- Trade customers receive a signed JWT on login (`apbs_token` in sessionStorage).
- Checkout and order history require that token.
- Product prices and exact inventory are only returned to approved logged-in users (or admin).
- Order totals and prices are computed on the server from the products table.
