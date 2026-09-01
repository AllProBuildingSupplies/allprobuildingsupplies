# All Pro OS (TEST)

New operations suite on branch `cursor/all-pro-os-test-0a19`. **Does not replace live admin** until you cut over.

| Open this | What it is |
|---|---|
| [`ops.html`](../../ops.html) | All Pro OS UI (inbox, orders, warehouse, shipments, loads, driver, inbound, purchasing, finance) |
| [`backend/src/ops/`](../../backend/src/ops/) | D1 tables + `/api/ops/*` Worker routes |

## How to run locally

1. Backend: `cd backend && npm run dev` (needs `backend/.dev.vars` with `ADMIN_TOKEN`)
2. Frontend: from repo root, `python3 -m http.server 8080`
3. Open `http://127.0.0.1:8080/ops.html?apbs_api=http://127.0.0.1:8787/api`

Test Pages (`allpro-test.pages.dev/ops.html`) talks to the **test** Worker automatically.

## Documents (real tables, not JSON)

Sales order → allocations → wave/pick tasks → outbound shipment + shipment lines → load + stops → proof of delivery → invoice flag.

Vendor PO → po_lines → inbound + inbound_lines → receipts + receipt_lines → putaway tasks.

`orders.shipments_json` is still dual-written so classic `admin.html` keeps working during TEST.
