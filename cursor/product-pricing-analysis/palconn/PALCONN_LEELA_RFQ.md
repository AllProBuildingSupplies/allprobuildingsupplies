# Palconn (Leela Wang) — full plumbing RFQ

Catalog: `palconn/2026_PALCONN_North_American_Market_Catalog.pdf` (44 pp, received 8 Sep 2026 from Leela Wang). NSF / cUPC / CSA logos on the approvals page. Founded 2007; Weifang Palconn Plastics Technology Co., Ltd, Yinma Industrial Zone, Weifang, Shandong 261317.

**Quote 8 Sep:** `palconn/20260908 Palconn_Full_Catalog_RFQ_SEND.xlsx` — 118 of 167 lines priced.  
**Quote 10 Sep:** `palconn/20260910 Palconn_Full_Catalog_RFQ_SEND.xlsx` — **84 lines** (PEX + PVC pipe only). PPSU **−5%**, PEX-B **−1.2%**, F1807 unchanged, PVC pipe **MOQ / CBM / GW filled**, six extra F2159 reducing tees. DWV and CPVC **omitted**. 1" F2159 female adapter still **blank**. Internal: `palconn/Palconn_Leela_quote_COMPARE.xlsx` (do not forward). Side-by-side mill sheet: `Three_Mill_FOB_Landed.xlsx`. Ocean **$10k / 67.7 CBM**. Rebuild: `python3 cursor/product-pricing-analysis/palconn/build_palconn_quote_compare.py`.

Send next: `palconn/Palconn_10Sep_quote_ack_SEND.txt`.

### Verdict (no PO until the combined lock)

| Line | Verdict |
|---|---|
| **PEX-B pipe ½/¾/1"** | **Palconn.** FOB **$0.081 / $0.157 / $0.256 per ft** (was $0.082 / $0.159 / $0.259). Still ~11% under Tommur FOB **$0.0915 / $0.1717 / $0.2941**. Same price stick or 100 ft coil. Landed ½" stick **~$0.129/ft** vs site $0.37. MOQ 30k ft (½+¾) / 20k ft (1"). No 10 ft or 300/500 ft coils |
| **F1807 brass + rings/clamps + PEX valves + outlet boxes** | **Palconn.** Unchanged. ½" elbow FOB **$0.49** (landed **~$0.71**). Rings **$0.14**, SS clamps **$0.065**. Valves $2.38–$4.37. WM box $12.99 / WHA $20.99 / ice $7.09. MOQ 3,000 most fittings (valves 1,000, boxes 300, rings 10–30k). Lead **50 days** |
| **F2159 PPSU** | **Keep Zhenpeng REV.** Palconn cut **5%**. Now cheaper FOB than Zhenpeng on **8 of 9** overlaps (½" elbow **$0.148** vs **$0.167**). **1" elbow still Zhenpeng** (**$0.574** vs Palconn **$0.593**). Do not unwind the packed REV pallet for a 5% haircut — Solvay resin, rides the Tommur 45'HQ. Palconn fills plugs / adapters / drop-ear / extra tees Zhenpeng did not quote. 1" F adapter **still blank** |
| **PVC Sch 40 1½–4" + F891 foam** | **Keep Tommur.** CBM is in (one 20 ft stick per carton; GW matches one length). Landed at $10k/40ft: 2" solid **~$16.04** vs site **$14.75**; 3" **~$33.40** vs **$27.50**; 4" **~$49.15** vs **$50**. Foam 2–4" also lands **above** site. ½–1" and 6–10" **not quoted**. MOQ 1,100–1,600 sticks |
| **PVC DWV** | **Keep Tommur.** Not on the 10 Sep sheet. 8 Sep was already higher FOB and missing 1½" / 2" 90s, street, 1/16, most traps, increasers, 6"+ |
| **CPVC D2846** | Not quoted |

**No Palconn PO yet.** When the combined window opens: Palconn = **PEX-B pipe + F1807**; Zhenpeng = **PPSU pallet on the Tommur 45'HQ**; Tommur = **PVC pipe + DWV**.

**Send her:** `Palconn_10Sep_quote_ack_SEND.txt`.  
**Keep:** compare workbooks internal.

**PEX sizes:** **½ / ¾ / 1" only.** Site still lists 1¼ / 1½ / 2" — those stay off the mill sheet.

## 10 Sep vs 8 Sep

| Family | What changed |
|---|---|
| PEX-B | −1.2% FOB. Pack / CBM / MOQ same |
| F2159 PPSU | **−5%** every priced SKU. Six new reducing-tee configs. 1" F adapter still `//` |
| F1807 + boxes | No change |
| PVC pipe | FOB same. **MOQ, pack=20 ft, CBM, GW** filled — this is what lets us land it |
| DWV + CPVC | Dropped off the return. Still not a Palconn buy |

## PVC pipe landed (20 ft stick, CBM now in)

Ocean = `$10,000 / 67.7` × CBM per stick. GW on the sheet matches one 20 ft length (2" solid ~6.6 kg).

| Stick | FOB | CBM | Ocean | Landed | Site (20 ft) |
|---|---:|---:|---:|---:|---:|
| 1½" solid | $6.96 | 0.012 | $1.77 | **$11.73** | $1.03 on site looks **$/ft** (qty 0), not a stick price |
| 2" solid | $9.36 | 0.018 | $2.66 | **$16.04** | **$14.75** — over |
| 3" solid | $19.43 | 0.038 | $5.61 | **$33.40** | **$27.50** — over |
| 4" solid | $27.66 | 0.065 | $9.60 | **$49.15** | $50.00 — tight |
| 1½" foam | $5.04 | 0.012 | $1.77 | **$8.98** | $9.25 — tight |
| 2" foam | $6.77 | 0.018 | $2.66 | **$12.34** | **$11.00** — over |
| 3" foam | $14.06 | 0.038 | $5.61 | **$25.72** | **$19.00** — over |
| 4" foam | $20.02 | 0.065 | $9.60 | **$38.22** | **$27.60** — over |

Without CBM the 8 Sep duty-only math made 2" solid look like $13.38 vs $14.75. **Ocean on a 20 ft stick eats that.** Do not buy Palconn PVC pipe.

## What they have (catalog map)

| Catalog | Line | On this RFQ? |
|---|---|---|
| p.4 | PEX potable pipe — coils + 10 / 20 ft sticks, red/white/blue | **Yes — ½ / ¾ / 1" PEX-B** (20 ft + 100 ft only) |
| p.6–8 | ASTM F1807 brass crimp + rings/clamps | **Yes — ½ / ¾ / 1"** |
| p.9–11 | Brass valves; F1807 PEX×PEX valves | **Yes** |
| p.13–14 | ASTM F2159 PPSU crimp | **Yes — 5% off 8 Sep; still keep Zhenpeng REV** |
| p.30 | Washer / ice-maker outlet boxes, ½" F1807 | **Yes** |
| p.32–38 | ASTM D1785 Sch 40 UPVC **pipe** | **1½–4" only**, CBM in, **do not buy** |
| — | ASTM F891 foam-core | **1½–4"**, **do not buy** |
| p.39+ | ASTM D2665 DWV | **Not on 10 Sep return** |
| — | ASTM D2846 SDR-11 CPVC | **Not quoted** |

## Walkaway (internal)

Zhenpeng ½" PPSU elbow REV **$0.167 FOB**. Palconn is now **$0.148** — wins FOB, but do not unwind the REV PI. PVC pipe has to beat **site stick prices after ocean**, not duty-only — it does not. DWV has to beat Tommur FOB — still not quoted. No PO until the combined lock.
