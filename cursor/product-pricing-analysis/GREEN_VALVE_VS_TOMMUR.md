# Green Valve PI vs Tommur (misnamed “Zhenpeng” PDF)

The uploaded file `All products - Ningbo Zhenpeng Plumbing Fittings Co., Ltd_.pdf` is **not Zhenpeng**. It is a **proforma invoice** from **Zhejiang Green Valve and Fitting Co., Ltd.** (Taizhou).

| | |
|--|--|
| Seller | Zhejiang Green Valve and Fitting Co., Ltd. |
| PI | **YMF26060303X** dated **2026/6/3**, buyer Baruch Grossman |
| Incoterm | **EXW our factory** (Taizhou) — not FOB, not DDP |
| Addr | NO.525 Tengyun Road, Jiaojiang, Taizhou, Zhejiang 318000 |
| Tel | 0086-576-88123188 / 15867653812 / 15867628609 |
| Bank | Agricultural Bank of China Zhejiang Branch `19911014040002072` SWIFT `ABOCCNBJ110` |
| PI total | EXW **$240,505.87** (~28,030 pcs). Almost all money is **6m pipe (~$237.8k)**. Fittings ~**$2.7k**. |
| Payment | 30% deposit / 70% before ship, 45 days |
| Quality | Subject to seller samples |
| Contents | **PVC DWV fittings + PVC/DWV pipe. Zero PEX / F2159.** |

Zhenpeng (Cixi) is still the factory to email for Everflow-style **F2159 poly-alloy**. This PI does not replace that RFQ.

Rebuild: `python3 cursor/product-pricing-analysis/build_green_valve_vs_tommur.py` → `GreenValve_vs_Tommur.xlsx`.

## How EXW was landed

Tommur DDP already includes ocean + US duty. Green Valve is factory-gate, so a fair compare is:

**EXW × 1.03 inland (Taizhou → Ningbo ≈ FOB) × 1.428 duty (5.3% MFN + 25% Sec 301 + 12.5% FLIP) + Tommur-sheet freight/pc.**

That is why EXW looking “half of Tommur FOB” does **not** automatically mean half of Tommur DDP. Duty eats a lot. On this PI the factory is cheap enough that **landed still beats Tommur DDP on every matched fitting except the 2" P-trap**.

## Fittings — Green is cheaper than Tommur

Matched SKUs (90° SxS = Tommur 1/4 BEND HxH; 45° SxS = Tommur 1/8 BEND HxH; tee = sanitary tee; Y-tee = wye). **Plug ≠ Tommur CAP SOC** — those four rows are shown in the sheet but ignored here.

| Item | Size | Green EXW | Tommur FOB | EXW vs FOB | Green landed | Tommur DDP | Landed vs DDP |
|--|--|--:|--:|--:|--:|--:|--:|
| Coupling | 1-1/2" | $0.065 | $0.113 | **−42%** | $0.105 | $0.12 | **−12%** |
| Coupling | 2" | $0.098 | $0.170 | −42% | $0.162 | $0.17 | −4% |
| Coupling | 3" | $0.265 | $0.522 | −49% | $0.435 | $0.55 | −21% |
| Coupling | 4" | $0.449 | $0.894 | −50% | $0.769 | $0.95 | −19% |
| 90 elbow | 1-1/2" | $0.133 | $0.231 | −42% | $0.223 | $0.27 | −18% |
| 90 elbow | 2" | $0.203 | $0.373 | −46% | $0.353 | $0.43 | −18% |
| 90 elbow | 3" | $0.466 | $1.105 | **−58%** | $0.837 | $1.27 | **−34%** |
| 90 elbow | 4" | $0.953 | $2.106 | −55% | $1.673 | $2.22 | −25% |
| 45 elbow | 1-1/2" | $0.111 | $0.213 | −48% | $0.181 | $0.23 | −21% |
| 45 elbow | 2" | $0.166 | $0.306 | −46% | $0.281 | $0.35 | −20% |
| 45 elbow | 3" | $0.356 | $0.909 | **−61%** | $0.632 | $1.05 | **−40%** |
| 45 elbow | 4" | $0.739 | $1.623 | −54% | $1.339 | $1.87 | −28% |
| Sanitary tee | 1-1/2" | $0.183 | $0.346 | −47% | $0.307 | $0.36 | −15% |
| Sanitary tee | 2" | $0.295 | $0.485 | −39% | $0.512 | $0.52 | −2% |
| Sanitary tee | 3" | $0.745 | $1.503 | −50% | $1.277 | $1.70 | −25% |
| Sanitary tee | 4" | $1.324 | $2.851 | −54% | $2.395 | $3.16 | −24% |
| Wye | 1-1/2" | $0.231 | $0.430 | −46% | $0.385 | $0.45 | −15% |
| Wye | 2" | $0.365 | $0.596 | −39% | $0.610 | $0.63 | −3% |
| Wye | 3" | $0.939 | $1.797 | −48% | $1.633 | $2.07 | −21% |
| Wye | 4" | $1.665 | $3.275 | −49% | $2.922 | $3.77 | −22% |
| Reducing wye | 4x4x2" | $1.026 | $1.896 | −46% | $1.780 | $2.18 | −18% |
| P-trap | 2" | $0.869 | $0.943 | −8% | $1.400 | $0.99 | **+41% — Tommur DDP wins** |

**Headline:** Green EXW is typically **40–50% below Tommur FOB** (3" elbows even more). After 42.8% duty + freight, Green landed is still **~12–35% under Tommur DDP** on the money SKUs. Tightest: 2" coupling (−4%) and 2" tee (−2%). Only the 2" P-trap loses to Tommur DDP.

All Pro website PVC margins on Tommur DDP are already ~50–80%. Green landed lifts those a few points; it does **not** unlock the NJPD PEX problem (1/2" elbow Tommur DDP $0.49 vs sell $0.33).

## Pipe — the real PI, no Tommur DDP to beat

Tommur KEEP list has **no PVC pipe DDP**. Convert 6m sticks ÷ 19.685 ft. Landed/ft ≈ EXW/ft × 1.03 × 1.428 + $0.06 freight (rough).

| Item | Size | EXW / 6m | EXW / ft | Landed / ft est | Line EXW |
|--|--|--:|--:|--:|--:|
| SCH40 | 2" | $9.551 | $0.485 | ~$0.77 | $28,653 |
| SCH40 | 3" | $19.836 | $1.008 | ~$1.54 | $59,508 |
| SCH40 | 4" | $28.237 | $1.434 | ~$2.17 | $84,711 |
| DWV thin-wall | 2" | $4.068 | $0.207 | ~$0.36 | $12,204 |
| DWV thin-wall | 3" | $7.527 | $0.382 | ~$0.62 | $22,581 |
| DWV thin-wall | 4" | $10.063 | $0.511 | ~$0.81 | $30,189 |

Caveats: US catalog is usually **10/20 ft sticks**, not 6m. MOQ is **3000 sticks × 6m per size**. Confirm **ASTM D1785 / D2665 + NSF**. DWV thin-wall is a different product from SCH40.

## What to do with this

- **PVC fittings:** Green Valve is a real cost-down vs Tommur DDP if samples pass (ASTM D2665, NSF, dimensions). Ask FOB Ningbo (not EXW) and US-length cartons.
- **PVC pipe:** only if you actually sell 6m / will recut, and NSF is on the mill’s name.
- **PEX / NJPD:** ignore this PI. Still email **Lettie Chen at Zhenpeng** for F2159. Keep **Tommur DDP for 20 ft PEX-B sticks**.
