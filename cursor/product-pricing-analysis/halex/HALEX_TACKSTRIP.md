# Suqian Halex — carpet tackstrip (Fred Liang)

Mill: **Suqian Halex Flooring Products Co., Ltd** (Halex Corp Asia). Fudan Road, west district, Sucheng ETDZ, Suqian, Jiangsu. ~1.2M boxes/yr, 12 US nailing machines. MIC: https://sqhalex.en.made-in-china.com

**Quote in (9 Sep 2026):** `halex/Carpet tackstrip Prices to All Pro Building Supplies LLC 20260909.xlsx`  
**Internal compare (do not forward):** `halex/Halex_Fred_quote_COMPARE.xlsx`  
**Send next:** `halex/Halex_Fred_quote_ack_SEND.txt` — thank-you, mixed 40HQ, samples DHL to Livingston.  
First RFQ (already sent): `halex/Halex_Fred_company_and_RFQ_SEND.txt`.

**No PO until the combined mill window.** Samples still outstanding. Anerte gripper stays backup only. Do not add storefront SKUs yet.

## Contact (from Fred’s 7 Sep 2026 email)

Email screenshot: `halex/Fred_Liang_email_2026-09-07.jpg`

| | |
|---|---|
| Fred Liang | Sales Manager |
| Email | **fliang@halexcorpasia.com** |
| Tel | +86 527 8427 **1690** |
| Fax | +86 527 8427 1333 |
| Mobile | **+86 158 9630 5619** |
| Older switchboard on MIC | +86 527 8427 1555 (keep; this email used 1690) |

## Verdict (no PO yet)

Tackstrip **clears** the US 100-pack at **$10,000 / 40HQ** ocean. First accessory line that still works at this freight. Carpet and pad do not.

| Fred SKU | Spec | FOB Shanghai $/box | boxes / 40HQ | Landed $/box | Landed $/LF | US 100-pack | Beat |
|---|---|---:|---:|---:|---:|---:|---:|
| **SGR-120** | 7/8" poplar, 13GA × 3/4" RS wood nails | **10.74** | 1740 | **~$21.11** | **$0.053** | HD-320-P-8 **$28.65** | **~$7.54** |
| **SGR-340** | extra-wide, 12GA × 11/16" concrete | **11.97** | 1540 | **~$23.61** | **$0.059** | HD-340-P-8 **$37.47** | **~$13.86** |
| **SGR-360** | extra-wide, 12GA × 11/16" dual-purpose | **12.07** | 1540 | **~$23.75** | **$0.059** | vs HD-340 **$37.47** | **~$13.72** |

Landed = FOB × **1.43** (planning China duty) + **$10,000 / boxes in that 40HQ**. 100 pcs/box = **400 LF**. Confirm HTS with the broker (wood + nails); do not invent a different stack.

**Stock SGR-120 + SGR-360.** Dual is **$0.10 FOB / box** over concrete-only — one extra-wide SKU covers wood and slab. Skip SGR-340 unless Fred will not mix dual.

MOQ is a **full 40HQ** (~**$18.4–18.7k FOB** on a single SKU; mixed sketch **400 × SGR-120 + 1140 × SGR-360 ≈ $18,056 FOB**, ~70 CBM). Not 100 boxes. Lead **2–3 weeks** after deposit. Palletized + hand-stack to fill. CARB/EPA **Yes**. Pins ~**60°**, 52 pins + 9 nails per strip. Poplar 1220 mm.

Suggested mix is packing math — confirm CBM/GW with Fred in the ack. Samples: one box SGR-120 and one box SGR-360, DHL to **1600 Livingston Ave**, not Hope Hill.

US check (public Home Depot, same mill brand, retail):  
https://www.homedepot.com/p/203301542 (wood $28.65) · https://www.homedepot.com/p/203301576 (concrete $37.47). SGR-120 is 21.6 mm (~7/8"); HD-320 is listed 1 in.

Rebuild: `python3 cursor/product-pricing-analysis/halex/build_halex_compare.py`

## Fred’s sheet (as quoted)

| SKU | Description | Wood | Nails | pcs/box | MOQ | boxes/pallet | CBM/pallet | GW kg/pallet | boxes/40HQ | CBM/40HQ | Lead | FOB Shanghai |
|---|---|---|---|---:|---|---:|---:|---:|---|---:|---|---:|
| SGR-120 | REGULAR WIDE WOOD 3/4" RS | poplar 1220 × 21.6 × 6.5 mm | 13GA × 3/4" RS wood, 9/strip | 100 | **40HQ (SKUs mixed)** | 40 | 1.72 | 418 | 1740 (36 pallets + 300 hand-stack) | 73 | 2–3 weeks | **10.74** |
| SGR-340 | EXTRA WIDE CONC 11/16" | poplar 1220 × 23.5 × 6.5 mm | 12GA × 11/16" concrete, 9/strip | 100 | (same) | 36 | 1.70 | 450 | 1540 (36 pallets + 244 hand-stack) | 71.7 | 2–3 weeks | **11.97** |
| SGR-360 | EXTRA WIDE Dual-Purpose 11/16" | poplar 1220 × 23.5 × 6.5 mm | 12GA × 11/16" dual-purpose, 9/strip | 100 | (same) | 36 | 1.70 | 450 | 1540 (36 pallets + 244 hand-stack) | 71.7 | 2–3 weeks | **12.07** |

Loading way on all three: **palletized + hand stack to fill**.

## Walkaway (internal)

FOB × ~1.43 + **$10,000 / 40HQ** vs the US 100-pack. One Memphis unit is ~200 LF — not a mill order. 40HQ is warehouse stock for the carpet program. Unlike carpet/pad, this quote **does** beat the US box. Still no PO until glass / carpet / pad / copper quotes are in, then order together.
