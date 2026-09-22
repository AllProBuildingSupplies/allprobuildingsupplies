# Zhenpeng FOB quote 2026-09-05 vs NJPD / Tommur

Quote to **Baruch Grossman / All Pro Building Supplies LLC**. **FOB Ningbo**, ASTM **F2159**, **PPSU Solvay**, cUPC + NSF/ANSI 61 claimed. Wholesale pack. 30% / 70% T/T, 30 days, HS 3917400000.

| | |
|--|--|
| Pieces | **55,100** |
| FOB | **$16,686.15** |
| Landed est. | **~$24,378** (FOB × **1.428** duty + **$0.01**/pc freight) |
| If sold at NJPD/Gator | **$33,581** sell-through, **$9,203** profit, **27.4%** order margin |
| Underwater at NJPD | **0 / 23** |
| Hits 50% margin target | **0 / 23** |
| Beats Tommur DDP | **11 / 11** matched SKUs |
| Pipe / copper rings | **Not on this quote** |

Rebuild: `python3 cursor/product-pricing-analysis/build_zhenpeng_fob_quote.py` → `Zhenpeng_FOB_vs_NJPD.xlsx`.

Landed = FOB × (5.3% MFN + 25% Sec 301 + 12.5% FLIP) + $0.01 freight. 163 cartons of fittings are ~5 CBM, so real freight is closer to **$0.004**/pc; $0.01 is conservative.

## Headline

This is the first fittings quote that **clears NJPD street**. Tommur DDP on the 1/2" elbow is **$0.49 vs sell $0.33 (−48%)**. Zhenpeng landed is **$0.256 vs $0.33 (+23%)**.

It does **not** hit the 50–75% target. Public catalog **B121290 = $0.10** did not survive. This quote is **$0.172 FOB (+72%)**. Walk line for 50% on that SKU was **~$0.11 FOB**. Keep them in the bake-off, **counter**, do not PO yet (King Smart FOB CN still due).

## Money SKUs

| Gator | Item | ZP FOB | Landed | NJPD sell | M% | Tommur DDP | vs DDP |
|--|--|--:|--:|--:|--:|--:|--:|
| PPLN0012 | 1/2" elbow (B121290) | **$0.172** | $0.256 | $0.331 | **23%** | $0.49 | **−48%** |
| PPLN0034 | 3/4" elbow | $0.353 | $0.514 | $0.658 | 22% | $0.83 | −38% |
| PPLN0100 | 1" elbow | $0.592 | $0.855 | $1.461 | **41%** | — | covers a Tommur hole |
| PPCP0012 | 1/2" coupling | $0.107 | $0.163 | $0.230 | 29% | $0.25 | −35% |
| PPCP0034 | 3/4" coupling | $0.207 | $0.306 | $0.380 | 19% | $0.40 | −24% |
| PPCP0100 | 1" coupling | $0.440 | $0.638 | $0.770 | 17% | $0.81 | −21% |
| PPTE0012 | 1/2" tee | $0.237 | $0.348 | $0.449 | 22% | $0.47 | −26% |
| PPTE0034 | 3/4" tee | $0.489 | $0.708 | $0.923 | 23% | $0.84 | −16% |
| PPTE0100 | 1" tee | $0.938 | $1.349 | $2.034 | 34% | $1.45 | −7% |
| PPPL0012 | 1/2" plug | $0.094 | $0.144 | $0.208 | 31% | — | |
| PPPL0100 | 1" plug | $0.268 | $0.393 | $0.590 | 33% | — | |

King Smart overlap (their old China FOB low → still worse than this mill):

- 3/4" elbow $0.51 vs Zhenpeng **$0.353**
- 1/2" tee $0.38 vs **$0.237**
- 1" plug $0.47 vs **$0.268**
- 3/4×1/2×3/4 tee $0.65 vs **$0.439**

## Thin lines (still above water)

| Gator | Item | ZP FOB | Landed | Sell | M% |
|--|--|--:|--:|--:|--:|
| PPRT3411 | 3/4"x1/2"x1/2" tee | $0.383 | $0.557 | $0.596 | **7%** |
| PPRT3431 | 3/4"x3/4"x1/2" tee | $0.455 | $0.660 | $0.744 | **11%** |
| PPCP0100 | 1" coupling | $0.440 | $0.638 | $0.770 | 17% |
| PPRC3412 | 3/4"x1/2" coupling | $0.180 | $0.267 | $0.331 | 19% |
| PPCP0034 | 3/4" coupling | $0.207 | $0.306 | $0.380 | 19% |

Best reducing tees (the ones Tommur never quoted): 1"x3/4"x1" **48%**, 1"x3/4"x3/4" **43%**, 3/4"x3/4"x1" **41%**.

## Counter (do this before anyone else quotes)

To hit **50%** on the 1/2" elbow: FOB ≤ **$0.11**. To match their own catalog: **$0.10** (landed ~$0.15, ~54%).

Reply to Lettie Chen:

1. Honor published **B121290 $0.10** (or at least **$0.12**) on 9,000 pcs.
2. Same move on 3/4" elbow toward **~$0.22 FOB** (50% band vs $0.66 sell).
3. NSF-61 / cUPC **certificates in Zhenpeng’s name**, plus Solvay PPSU grade (Acudel / Radel).
4. Confirm reducing-tee orientation is **end × end × branch** matching Gator `PPRT*`.
5. Quote **copper F1807 rings** 1/2" / 3/4" / 1" (NJPD `EPCR*`).
6. Drop the ±1% FX reopen — lock USD for 60 days.
7. Ask FOB on a **mixed container** with Tommur pipe (or their own 20 ft sticks if they ever make them). They do not sell pipe on this PI.

Do not walk the whole factory over $0.172. Walk the **50% story** on the catalog $0.10. This quote still beats Tommur DDP by **15–48%** landed on every matched fitting.

## What this does not replace

- **Pipe:** keep **Tommur DDP** 20 ft red/blue ($0.10 / $0.18 / $0.31 per ft).
- **Rings:** still Olde / JKL / Zhenpeng add-on.
- **King Smart Monday FOB:** still goes in the same sheet. USA warehouse on `king-smart.cn/products/46.html` stays out.
- **Green Valve:** PVC only, unrelated.

Do not place the fittings PO until King Smart FOB is in (and until the B121290 counter comes back). Spec is right; price is usable; 50% is not.
