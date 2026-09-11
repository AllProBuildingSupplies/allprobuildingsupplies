# CPVC — what NJPD actually buys

**Do not quote SCH80 to NJPD.** Do not hunt another mill yet. Tommur already prices this pipe.

Photos from NJPD’s current stock: `njpd-cpvc/`.

## What is on the stick (not SCH40 IPS)

The pipe is cream/tan CTS with a **yellow stripe**. Print on the 1¼" piece:

- `1 1/4"` · **`SDR 11`** · **`CPVC 4120`** · **`ASTM D2846`**
- `U.P. Code ASTM D 2846` + UPC shield
- CSA · ICC-ES PMG · **E84 25/50 RATED** (plenum)

That is **copper-tube-size hot/cold CPVC** (FlowGuard-style), not IPS Schedule 40 and not Schedule 80.

People (and Tommur’s own book) often call the D2846 CTS **fittings** line “SCH40.” The **pipe** print is SDR-11. IPS CPVC Sch 40 would be ASTM F441 — we do not have that in the Tommur tracker.

## Tommur already has it

| Line | In Tommur book | FOB |
|---|---|---|
| **ASTM D2846 SDR-11 pipe** (½–2") | Yes — yellow FOB on all 6 sizes | **Yes** |
| **“CPVC 2846 SCH40” fittings** (CTS: elbows, tees, adapters, unions, valves…) | Yes — **155 SKUs** | Almost none (8 of 155) |
| CPVC SCH80 pipe (ASTM F441) | Yes — on the site | Yes — **wrong product for NJPD** |
| CPVC SDR-13.5 pipe | Yes | Yes — thinner wall; not what they showed |
| IPS CPVC Sch 40 pipe (F441 Sch 40) | **No** | — |

### SDR-11 pipe — Tommur yellow FOB → est. landed 45'HQ (USD / ft)

| Size (CTS) | FOB | Landed | On site sell |
|---|---:|---:|---:|
| ½" × 1.73" | $0.36 | $0.52 | $1.42 |
| ¾" × 2.03" | $0.59 | $0.87 | $2.37 |
| 1" × 2.6" | $0.99 | $1.46 | $3.96 |
| **1¼" × 3.18"** (the photo) | **$1.48** | **$2.18** | $5.93 |
| 1½" × 3.76" | $2.07 | $3.04 | $8.26 |
| 2" × 4.9" | $3.53 | $5.20 | $14.11 |

½ / ¾ / 1" landed is **tight vs Home Depot** (~4–12%). 1¼" and up look fine. Quote NJPD off **landed**, not the site card. Those landed figures are from the Tommur tracker; rebuild with **$10,000/container** in `build_tommur_cost_margin.py` (was $7k).

SCH80 FOB is a different wall/OD. Do not substitute.

## Gaps before we put it on the combined PO

1. **Marks.** Ask Tommur to confirm **UPC + NSF/ANSI 61 + ASTM E84 25/50** on the SDR-11 extrusion (NJPD’s stick is plenum-rated). Cream + yellow stripe is the look they already buy.
2. **CTS fittings FOB.** Fill the yellow column on **CPVC 2846 SCH40** (Tommur’s name for D2846 CTS fittings). Only couplings/tees have FOB today; those unit prices look high vs HD CTS — confirm they are CTS D2846, not SCH80 IPS.
3. Same lock as everything else: **no CPVC PO until all mill quotes are in.**

## Copy-paste to Tommur

> We need **ASTM D2846 CPVC 4120 SDR-11 CTS** pipe (cream, yellow stripe), **not** SCH80 / not IPS F441.
>
> Sizes: ½, ¾, 1, 1¼, 1½, 2 inch. 10 ft and/or 20 ft sticks. Confirm **UPC, NSF/ANSI 61, ICC-ES PMG, ASTM E84 25/50**.
>
> Please also quote **FOB Ningbo** on the full **CPVC 2846 SCH40** fittings list (CTS D2846 — elbows, tees, couplings, adapters, unions). Sockets must fit SDR-11 CTS, not SCH80 IPS.
>
> Photos of the pipe specification we need are attached.
