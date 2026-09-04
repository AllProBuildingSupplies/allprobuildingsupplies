# Tommur DDP vs APBS FOB-landed ($2,800 + $500) — NJPD Everflow PEX

Sources: Tommur updated DDP sheet · Gator order ack **11234952** (pipe) · Gator quote **11237145** (fittings/rings) · freight quotes **$2,800 ocean + $500 drayage / 40'**.

---

## Freight: $19k is not $3,300

Tommur’s door-to-door stack:

| Piece | Tommur $19k/40HQ | Your new quotes |
|-------|------------------|-----------------|
| Ocean | $9,500 | **$2,800** |
| Delivery / dray | $1,600 | **$500** |
| **Freight+dray subtotal** | $11,100 | **$3,300** |
| Customs duties | **$7,900** | **Still due on FOB** (est. 42.8% of merchandise) |
| **Total DIY** | $19,000 | **$3,300 + duties** — not $3,300 |

Duty used here: **5.3% MFN + 25% Sec 301 + 12.5% FLIP ≈ 42.8%** on China-origin HTS 3917 (confirm with broker). Tommur already baked duty into **`DDP_USD`**.

On KEEP lines that have FOB:

| | |
|--|--|
| FOB merchandise | **$32,266** |
| Est. duty 42.8% | **$13,810** |
| Freight+drayage (one 40') | **$3,300** |
| **DIY landed** | **~$49,400** |
| Tommur DDP on same SKUs | **~$37,400** |
| SKUs DDP cheaper / FOB-landed cheaper | **90 / 14** |

**DDP still wins the box** because Tommur DDP sits only ~5–15% over FOB, while a real US entry is FOB + ~43% duty + $3,300. Cheap ocean does **not** beat their DDP once duty is counted.

The 14 SKUs where FOB-landed beats DDP are almost all **PEX fittings** (Tommur’s DDP/CURRENT on fittings is fat vs FOB). **PEX pipe DDP still beats DIY.**

KEEP mix CBM ≈ **92** — over one 40' (67.7) and a 45HQ (86). PVC is still sized as a 45HQ. Budget a second box or cut PVC if this ships together; **$3,300 is per 40'**.

---

## NJPD product filter (what to order)

NJPD is **not** buying Tommur’s full PEX range. They buy **Everflow** from Gator:

**Pipe (ack 11234952)** — 20 ft **straight** sticks, red + blue, **1/2", 3/4", 1" only**:

| Gator | Item | Stick $ | $/ft | This PO |
|-------|------|---------|------|---------|
| PFW-B1220 / PFW-R1220 | 1/2" blue/red | $3.55 | **$0.1775** | 500 sticks = **10,000 ft** |
| PFW-B3420 / PFW-R3420 | 3/4" blue/red | $6.70 | **$0.335** | 500 sticks = **10,000 ft** |
| PFW-B120 / PFW-R120 | 1" blue/red | $11.625 | **$0.5813** | 250 sticks = **5,000 ft** |

**DROP from Tommur list:** 1-1/4", 1-1/2", 2" pipe and elbows; male/female adapters; 1x1/2, 1-1/2x3/4, 2x3/4 reducers.

**Fittings (quote 11237145)** — Everflow **poly-alloy crimp** (PP*) + **copper crimp rings** (EPCR*).

| Status | Count |
|--------|-------|
| KEEP — exact match on Tommur quote | 14 PEX lines (3 pipe sizes + 11 fittings) |
| DROP — Tommur had it, NJPD does not | 13 |
| ASK TOMMUR / source elsewhere | 15 (see below) |

---

## Margins at NJPD/Gator prices (PEX) and All Pro (PVC)

Selling prices: **Gator unit prices** for every NJPD PEX SKU. PVC unchanged (All Pro website).

### PVC — still fine (All Pro sells)

| Path | Order cost | Sell-through | Profit | Order margin | SKU median |
|------|------------|--------------|--------|--------------|------------|
| Tommur DDP | $26,906 | $86,206 | $59,300 | **69%** | **74%** |
| FOB + duty + $3,300/CBM | higher | same | lower | still healthy | — |

Zero PVC underwater. Thinnest still ~49% on DDP.

### PEX — pipe works; most fittings do **not** at Gator street

| Path | Order margin | SKU median | Underwater |
|------|--------------|------------|------------|
| Tommur DDP / CURRENT | **22%** | **−3%** | **8 of 14** |
| FOB-landed | **10%** | **8%** | **2 of 14** |

**Pipe (buy Tommur DDP):**

| Size | FOB | DDP | APBS landed | NJPD sell /ft | Margin DDP | Margin landed | Buy |
|------|-----|-----|-------------|---------------|------------|---------------|-----|
| 1/2" | $0.0915 | **$0.10** | $0.16 | $0.1775 | **44%** | 10% | **DDP** |
| 3/4" | $0.1717 | **$0.18** | $0.28 | $0.335 | **46%** | 17% | **DDP** |
| 1" | $0.2941 | **$0.31** | $0.48 | $0.581 | **47%** | 17% | **DDP** |

**Fittings NJPD actually uses (sell = Gator):**

| Item | FOB | Tommur DDP/CURRENT | APBS landed | NJPD sell | M% DDP | M% landed |
|------|-----|--------------------|-------------|-----------|--------|-----------|
| Elbow 1/2" | $0.29 | **$0.49** | $0.45 | **$0.33** | **−48%** | **−35%** |
| Elbow 3/4" | $0.40 | **$0.83** | $0.60 | **$0.66** | **−26%** | **+8%** |
| Coupling 1/2" | $0.16 | $0.25 | $0.23 | $0.23 | −9% | −2% |
| Coupling 3/4" | $0.24 | $0.40 | $0.36 | $0.38 | −5% | +5% |
| Coupling 1" | $0.51 | $0.81 | $0.75 | $0.77 | −5% | +2% |
| Tee 1/2" | $0.30 | $0.47 | $0.44 | $0.45 | −5% | +3% |
| Tee 3/4" | $0.53 | $0.84 | $0.77 | $0.92 | +9% | +16% |
| Tee 1" | $0.91 | $1.45 | $1.33 | $2.03 | +29% | +35% |
| Red tee 1x1x3/4" | $0.88 | $1.41 | $1.31 | $1.58 | +11% | +17% |
| Red tee 3/4x3/4x1/2" | $0.49 | $0.78 | $0.74 | $0.74 | −5% | ~0% |
| Red coupling 3/4x1/2" | $0.21 | $0.34 | $0.32 | $0.33 | −3% | +3% |

To sell PEX fittings at what NJPD pays Gator, **Tommur DDP on 1/2" and 3/4" elbows is too high**. FOB+landed fixes 3/4" elbow (~8%) but **1/2" elbow still loses ~$0.12/pc** even DIY. Volume on that SKU is 3,000 pcs.

---

## Ask Tommur (NJPD buys; not on their quote)

| Gator | Item | NJPD $ | Qty on quote |
|-------|------|--------|----------------|
| PPLN0100 | 1" poly-alloy elbow | $1.46 | 900 |
| PPRC1034 | 1" x 3/4" reducing coupling | $0.71 | 600 |
| PPPL0012 / 0034 / 0100 | plugs 1/2, 3/4, 1" | $0.21 / $0.36 / $0.59 | 2,000 / 1,000 / 500 |
| PPRT1112 | 1x1x1/2 reducing tee | $1.39 | 300 |
| PPRT1341 | 1x3/4x1 reducing tee | $2.05 | 200 |
| PPRT1033 | 1x3/4x3/4 reducing tee | $1.67 | 300 |
| PPRT3410 | 3/4x3/4x1 reducing tee | $1.44 | 150 |
| PPRT3413 | 3/4x1/2x3/4 reducing tee | $0.79 | 750 |
| PPRT3411 | 3/4x1/2x1/2 reducing tee | $0.60 | 900 |
| PPRT1213 | 1/2x1/2x3/4 reducing tee | $0.64 | 300 |
| EPCR0012 / 0034 / 0100 | copper crimp rings | $0.15 / $0.21 / $0.38 | 10k / 6k / 3.5k |

Rings are **ASTM F1807 copper**, not plastic — source separately if Tommur is fittings/pipe only.

---

## Everflow specs to send the factory

NJPD’s packing slip is **Everflow PEX-B** (Gator `PFW-*`) and **Everflow poly-alloy crimp** (`PP*`).

**Pipe — match this or they will reject it on the job**

- Type: **PEX-B** (silane crosslink). Not PEX-A / F1960 expansion. Not PEX-C.
- Form: **20 ft STRAIGHT sticks** (this PO is not coils).
- Color: **red (hot) and blue (cold)** — they order both.
- Sizes: **1/2", 3/4", 1" only** (CTS SDR-9: OD 0.625" / 0.875" / 1.125").
- Standards: **ASTM F876 + F877**, **CSA B137.5**, **NSF/ANSI 14 & 61 (NSF-pw)**, chlorine **ASTM F2023**.
- Typical rating: **160 psi @ 73°F**, **100 psi @ 180°F**.
- Non-barrier potable (not EVOH heat pipe).

**Fittings — match this**

- Material: **poly-alloy / PPSU (Acudel)** plastic insert.
- Standard: **ASTM F2159** (plastic insert + copper crimp ring) + F877, CSA B137.5, NSF-pw, lead-free.
- Install: **copper crimp ring**, full-circle crimp tool.
- **Not** F1960 expansion, **not** brass F1807 bodies (the *ring* is F1807; the *fitting* is F2159).
- Typical: 100 psi @ 180°F.

Workbook: `Tommur_NJPD_PEX_Landed_vs_DDP.xlsx` (Summary, Combined_List, Order_KEEP_only, NJPD_PEX_Match, Everflow_Specs, Assumptions).
