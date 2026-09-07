# Inbound container tracking

Packing lists for Containers **3, 4, and 5** (ETA **2026-09-18**). All fittings on these containers are allocated to **NJPD APBS-000005**.

| Where | What |
|---|---|
| [`data/inbound-containers.json`](../../data/inbound-containers.json) | WHSU9010053 (C3), WHSU9004718 (C4), Container 5 (PL 260430-010-SG). Fittings = PCS; foam pipe = PKGS (20 ft) |
| [`data/njpd-c345-fitting-backorder.json`](../../data/njpd-c345-fitting-backorder.json) | Fitting qty NJPD’s backorder should equal |
| Admin → **Stock** → Import packing lists | Loads that JSON; then Match NJPD backorder |
| `backend/src/index.js` | Receive-into-on-hand API; `POST /api/admin/orders/sync-inbound-backorder` (C3–C5 IDs only, `skipStock`) |

This folder is a pointer only — do not duplicate the JSON here.

Fitting qty is packing-list **PCS**. Foam pipe qty is packing-list **PKGS** (each pkg = one 20 ft length). The pipe **PCS** column is meters, not sticks — e.g. C3+C4 2" foam is **2,340** lengths, not 14,274. Foam pipe stays inbound until received; it is not added as extra lines on the NJPD fittings PO.
