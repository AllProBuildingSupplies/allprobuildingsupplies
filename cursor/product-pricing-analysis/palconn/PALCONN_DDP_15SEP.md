# Palconn DDP vs our landed — 15 Sep 2026 invoice

Internal. Do not forward to Leela. Source: commercial invoice **IN2026-0915**, client PO **PAL20260912**, 15 Sep 2026. FOB Qingdao vs DDP **1600 Livingston Ave, North Brunswick, NJ 08902**. Payment 30/70 TT. NSF/UPC/CSA.

Workbook: `palconn/Palconn_15Sep_DDP_vs_landed.xlsx` (rebuild: `python3 cursor/product-pricing-analysis/palconn/build_palconn_ddp_check.py`).

Invoice mix: PPSU F2159 + copper crimp rings + PEX-B ½/¾/1" stick and 100 ft coil (red + blue). **No F1807 brass fittings, no PVC.** Totals **FOB $119,614 / DDP $190,616 / 143 CBM** (~two 40fts at our $10k cube).

## 1. Does her DDP match our estimated landed?

**Yes at the box.** Our method (same as the 10 Sep Palconn compare) is:

> Landed = FOB × **1.43** + (**$10,000 / 67.7 CBM**) × line CBM

On this invoice that is **$192,213**. Palconn DDP is **$190,616** — **0.8% under** us. The 1.43 + $10k/40ft math is calculating correctly.

She is **not** allocating ocean by cube. Plastics sit on a flat **DDP = FOB × 1.56**. Copper rings sit on **FOB × 1.94**. Stick and coil have the **same DDP per foot** even though a 100 ft coil takes ~3× the cube of a 20 ft stick.

| Family | FOB | Palconn DDP | Our landed | DDP vs us |
|---|---:|---:|---:|---:|
| PEX-B **20 ft stick** | $49,400 | $77,064 | $77,954 | **−1.1%** (match) |
| PEX-B **100 ft coil** | $32,880 | $51,294 | $60,194 | **−14.8%** (she is cheaper — did not charge cube) |
| PPSU fittings | $26,762 | $41,747 | $38,850 | **+7.5%** (she is richer — no cube credit) |
| Copper crimp rings | $10,572 | $20,511 | $15,215 | **+34.8%** |
| **Invoice** | **$119,614** | **$190,616** | **$192,213** | **−0.8%** |

Spot checks that match the 10 Sep sheet:

- ½" PPSU coupling: FOB $0.102 → our landed **$0.148** vs her DDP **$0.160**
- ½" PPSU elbow: FOB $0.148 → our **$0.215** vs her **$0.231**
- ½" stick: FOB $0.081 → our **$0.129/ft** vs her **$0.126/ft**
- 1" stick: FOB $0.256 → our **$0.399/ft** vs her **$0.399/ft** (exact)
- ½" coil: FOB $0.081 → our **$0.153/ft** vs her **$0.126/ft** (she reused the stick rate)

**Copper rings are the one place our 1.43 stack is too light.** Crimp rings are copper articles (CBP has classified them 7419; 7412 is also in play). 2026 Section **232 copper ~50%** can stack with 301 + overlay. Her DDP/FOB **1.94** is ~MFN + 301 + overlay + 232. **Use her DDP as the ring cost**, not FOB × 1.43.

**DDP is net landed.** Baruch confirmed 16 Sep: her DDP includes delivery to **1600 Livingston Ave** — no extra fees or invoices after this payment. Cost = Palconn DDP. Our FOB×1.43+$10k number matching her DDP within 1% means the formula was already in the right neighborhood for all-in warehouse cost (she is absorbing dest, or her ocean is cheaper than $10k/40ft). No dest add-on on top.

FOB unit prices on this PI match the **10 Sep** quote (PPSU −5%, PEX-B −1.2%). No new FOB cut.

## 2. Selling prices and the 50% range

**50% range = ~50% gross margin** = (sell − cost) / sell, so sell ≈ **2× Palconn DDP**. Band used: 45–55% = in range.

Site prices from `assets/products.csv`. Pipe is priced **per 20 ft stick** or **per 100 ft coil**, not per foot.

**If this whole PI sold at list: $321k revenue vs $191k Palconn DDP = 40.7% GM.** Below 50%. Coils carry it; sticks and most PPSU are thin; **rings lose money**.

| Family | List revenue | Palconn DDP | GM on DDP |
|---|---:|---:|---:|
| 100 ft coils | $115,954 | $51,294 | **55.8%** — works |
| PPSU fittings | $71,130 | $41,747 | **41.3%** — shy |
| 20 ft sticks | $120,350 | $77,064 | **36.0%** — thin |
| Copper rings | $13,800 | $20,511 | **−48.6%** — underwater |
| **Mix** | **$321,234** | **$190,616** | **40.7%** |

### What works (~50% or better)

| SKU | Site | Palconn DDP | GM | Sell for 50% GM |
|---|---:|---:|---:|---:|
| ½" plug | $0.23 | $0.105 | **54.5%** | $0.21 |
| ¾" plug | $0.40 | $0.193 | **51.8%** | $0.39 |
| 1×¾×1 red tee | $2.26 | $1.10 | **51.3%** | $2.20 |
| 1×¾×¾ red tee | $1.84 | $0.88 | **52.1%** | $1.76 |
| ¾×¾×1 red tee | $1.58 | $0.85 | **46.0%** | $1.71 |
| ½" 100 ft coil | $34.21 | $12.64 | **63.1%** | $25.27 |
| ¾" 100 ft coil | $57.09 | $24.49 | **57.1%** | $48.99 |
| 1" 100 ft coil | $79.15 | $39.94 | **49.5%** | $79.87 |

Coils work because list $/ft is ~1.7–2.7× the stick $/ft. Same Palconn DDP per foot.

### Thin vs 50% (typical 28–38%)

20 ft sticks — all three sizes:

| Stick | Site / 20 ft | DDP / 20 ft | GM | Need for 50% |
|---|---:|---:|---:|---:|
| ½" | $3.91 | $2.53 | 35.4% | **$5.05** |
| ¾" | $7.37 | $4.90 | 33.5% | **$9.80** |
| 1" | $12.79 | $7.99 | 37.6% | **$15.97** |

PPSU workhorses (coupling / elbow / tee / most reducing tees) land **28–43%**. Examples: ½" coupling $0.25 vs DDP $0.16 (**36%** — need **$0.32**); ½" elbow $0.36 vs $0.23 (**36%** — need **$0.46**); ½" tee $0.49 vs $0.33 (**33%** — need **$0.66**).

### Underwater — raise before this PI lands

| Ring | Site | Palconn DDP | GM | Need for 50% |
|---|---:|---:|---:|---:|
| ½" | $0.17 | $0.269 | **−58%** | **$0.54** |
| ¾" | $0.23 | $0.385 | **−67%** | **$0.77** |
| 1" | $0.41 | $0.475 | **−16%** | **$0.95** |

Even FOB × 1.43 ($0.20 / $0.29 / $0.35) still loses on ½" and ¾" at Gator/site. Do not sell Palconn rings at these cards.

### Gator (NJPD) vs Palconn DDP — direct answers

Sell cards on the site are Gator/NJPD (quote **11237145** fittings/rings, ack **11234952** 20 ft sticks), rounded up a few cents on most SKUs.

**Yes — copper rings lose money** if Palconn DDP is the cost and you sell at Gator/site. Same unit (each). On this PI that is about **−$6,700**.

| Ring | Gator (quote) | Site | Palconn DDP | $ / pc at site | This PI |
|---|---:|---:|---:|---:|---:|
| ½" EPCR0012 | $0.15 | $0.17 | **$0.269** | **−$0.10** | 30,000 pcs → **−$2,960** |
| ¾" EPCR0034 | $0.21 | $0.23 | **$0.385** | **−$0.16** | 20,000 pcs → **−$3,100** |
| 1" EPCR0100 | $0.38 | $0.41 | **$0.475** | **−$0.06** | 10,000 pcs → **−$650** |

Copper 232 is why. Palconn FOB on ½" is only **$0.139** — below Gator — but her DDP is 1.94× FOB.

**Other workhorses: you make money, not 50%.** At *site* (Gator rounded up) sticks and PPSU couplings/elbows/tees are **28–38% GM**. At *exact Gator* stick prices they are a bit thinner (**27–31%** on pipe, **20–32%** on those fittings). Not losing except rings. Not 50% either.

| Item | Gator | Site | Palconn DDP | GM at Gator | GM at site |
|---|---:|---:|---:|---:|---:|
| ½" 20 ft stick | $3.55 | $3.91 | $2.53 | **29%** | **35%** |
| ¾" 20 ft stick | $6.70 | $7.37 | $4.90 | **27%** | **34%** |
| 1" 20 ft stick | $11.63 | $12.79 | $7.99 | **31%** | **38%** |
| ½" coupling | $0.23 | $0.25 | $0.16 | **31%** | **36%** |
| ¾" coupling | $0.38 | $0.42 | $0.30 | **20%** | **28%** |
| 1" coupling | $0.77 | $0.85 | $0.56 | **27%** | **34%** |
| ½" elbow | $0.33 | $0.36 | $0.23 | **30%** | **36%** |
| ¾" elbow | $0.66 | $0.72 | $0.49 | **26%** | **32%** |
| ½" tee | $0.45 | $0.49 | $0.33 | **26%** | **33%** |
| ¾" tee | $0.92 | $1.02 | $0.66 | **28%** | **35%** |
| 1" tee | $2.03 | $2.24 | $1.38 | **32%** | **39%** |

Vs Tommur DDP those same Gator fittings were often **underwater**. Palconn DDP flips them to profit — just not 50%.

Coils are not on the Gator NJPD ack (they buy 20 ft sticks). Site coil GM **50–63%**.

## Verdict

1. **Landed math is right, and her DDP is the cost.** Palconn DDP on this mix equals FOB × 1.43 + $10k/40ft within 1%. Delivery to Livingston is in that number — do not add dest on top. Copper rings: believe **her** DDP, not 1.43.
2. **Matching Gator: rings lose money; everything else on this PI makes ~25–38% (site 28–38%), not 50%.** Coils at site are the 50% lines. Mix at site list **~41%**.
3. **No factory PO until the combined mill lock** (Tommur PVC/DWV, Zhenpeng PPSU pallet, Palconn PEX-B + F1807). Drop or reprice rings before this mix ships if sell stays at Gator.

Keep Zhenpeng for PPSU unless we unwind the REV PI — Palconn DDP does not change that. Palconn PVC pipe was not on this invoice (still do not buy).
