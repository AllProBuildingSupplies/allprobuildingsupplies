# Inbound container tracking

Packing lists for Containers **3, 4, and 5** (ETA **2026-09-18**). All fittings on these containers are allocated to **NJPD APBS-000005**.

| Where | What |
|---|---|
| [`data/inbound-containers.json`](../../data/inbound-containers.json) | Packing-list PCS for WHSU9010053 (C3), WHSU9004718 (C4), and Container 5 (PL 260430-010-SG) |
| [`data/njpd-c345-fitting-backorder.json`](../../data/njpd-c345-fitting-backorder.json) | Fitting qty NJPD’s backorder should equal |
| Admin → **Stock** → Import packing lists | Loads that JSON; then Match NJPD backorder |
| `backend/src/index.js` | Receive-into-on-hand API; `POST /api/admin/orders/sync-inbound-backorder` (C3–C5 IDs only, `skipStock`) |

This folder is a pointer only — do not duplicate the JSON here.

Qtys are **packing-list pieces** (sticks), not commercial-invoice carton counts. Foam pipe stays inbound until received; it is not added as extra lines on the NJPD fittings PO.
