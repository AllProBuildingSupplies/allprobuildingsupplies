# Inbound container tracking

From the [Inbound shipment inventory](https://cursor.com/agents/bc-841f111d-d196-469b-b403-e0e29f057a56) agent. Already merged to `main` (PR #55).

| Where | What |
|---|---|
| [`data/inbound-containers.json`](../../data/inbound-containers.json) | Seed invoices for WHSU9010053 and WHSU9004718 |
| Admin → **Stock** → Import invoices | Loads that JSON and tracks expected vs received qty |
| `backend/src/index.js` | Receive-into-on-hand API |

This folder is a pointer only — do not duplicate the JSON here.
