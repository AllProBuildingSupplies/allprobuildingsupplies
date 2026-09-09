# Palconn (Leela Wang) — full plumbing RFQ

Catalog: `palconn/2026_PALCONN_North_American_Market_Catalog.pdf` (44 pp, received 8 Sep 2026 from Leela Wang). NSF / cUPC / CSA logos on the approvals page. Founded 2007; Weifang Palconn Plastics Technology Co., Ltd, Yinma Industrial Zone, Weifang, Shandong 261317.

**Quote in (8 Sep 2026):** `palconn/20260908 Palconn_Full_Catalog_RFQ_SEND.xlsx` — 118 of 167 lines priced. NSF / UPC / CSA claimed. Plastic **25 days**, brass/boxes **50 days**. Internal compare: `palconn/Palconn_Leela_quote_COMPARE.xlsx` (do not forward). Ocean **$10k/40ft**.

### Verdict (no PO until the combined lock)

| Line | Verdict |
|---|---|
| **PEX-B pipe ½/¾/1"** | **Palconn.** First real pipe mill. FOB **$0.082 / $0.159 / $0.259 per ft** (~10% under Tommur FOB). Same price stick or 100 ft coil. Landed ½" stick **~$0.13/ft** vs site $0.37. MOQ 30k ft (½+¾) / 20k ft (1"). She did not quote 10 ft or 300/500 ft coils |
| **F1807 brass + rings/clamps + PEX valves + outlet boxes** | **Palconn.** No other mill. ½" elbow FOB **$0.49** (landed ~$0.71). Rings **$0.14**, SS clamps **$0.065**. Valves $2.38–$4.37. WM box $12.99 / WHA $20.99 / ice $7.09. MOQ 3,000 most fittings (valves 1,000, boxes 300, rings 10–30k). Lead **50 days** |
| **F2159 PPSU** | **Keep Zhenpeng REV.** Mixed: Palconn ½" elbow **$0.156** vs Zhenpeng **$0.167** (−6.6%); Palconn 1" elbow **$0.624** vs Zhenpeng **$0.574** (+9%). Couplings cheaper at Zhenpeng. Do not unwind the REV PI for nickels. Palconn fills SKUs Zhenpeng did not quote (plugs, adapters, drop-ear). 1" F adapter **blank** |
| **PVC Sch 40 1½–4" + F891 foam** | Quoted **per 20 ft stick**. 1½" solid FOB **$6.96** ($0.35/ft); foam 1½" **$5.04**. No CBM/MOQ on pipe. ½–1" and 6–10" **not quoted**. Tommur still the pipe mill until we have Tommur FOB on these sizes and Palconn CBM |
| **PVC DWV** | **Keep Tommur.** Palconn higher FOB on 37 of 41 overlaps (+8% to +112%). Missing the movers: **1½" and 2" 90s**, all street, all 1/16, most P-traps, all increasers, 6"+. Tree is too thin to replace Tommur |
| **CPVC D2846** | Not on her return sheet |

**No Palconn PO yet.** When the combined window opens: Palconn = **PEX-B pipe + F1807**; Zhenpeng = **PPSU pallet on the Tommur 45'HQ**; Tommur = **PVC/DWV**.

**Send her:** `Palconn_Full_Catalog_RFQ_SEND.xlsx` + `Palconn_RFQ_SEND.txt`.  
**Keep:** `Palconn_Full_Catalog_RFQ_COMPARE.xlsx` and `Palconn_Leela_quote_COMPARE.xlsx` internal.

Rebuild: `python3 cursor/product-pricing-analysis/palconn/build_palconn_full_rfq.py`

Tommur stays the PVC/DWV mill and Zhenpeng stays the PPSU mill until Palconn lands cheaper. **No Palconn PO** until this quote is in and compared.

**PEX sizes:** **½ / ¾ / 1" only.** Site still lists 1¼ / 1½ / 2" — those stay off the mill sheet (do not restock).

## What they have (catalog map)

| Catalog | Line | On this RFQ? |
|---|---|---|
| p.4 | PEX potable pipe — coils + 10 / 20 ft sticks, red/white/blue | **Yes — ½ / ¾ / 1" PEX-B** |
| p.5 | EVOH oxygen-barrier PEX | No |
| p.6–8 | ASTM F1807 brass crimp + rings/clamps | **Yes — ½ / ¾ / 1"** (not on the live site) |
| p.9–11 | Brass valves; F1807 PEX×PEX valves | **Yes — PEX×PEX ½ / ¾ / 1"** |
| p.13–14 | ASTM F2159 PPSU crimp | **Yes — price-check vs Zhenpeng REV** |
| p.16–18 | ASTM F1960 expansion | No — do not PO a second PEX system on the first order |
| p.21 | Push-fit | No |
| p.24–25 | PEX-AL-PEX | No |
| p.26–28 | Radiant manifolds | No |
| p.30 | Washer / ice-maker outlet boxes, ½" F1807 | **Yes** |
| p.31 | Tools | No |
| p.32–38 | ASTM D1785 Sch 40 UPVC **pipe** + pressure fittings | **Pipe yes** (sizes we already sell). Pressure fittings no — our water line is PEX, not PVC pressure |
| p.39+ | ASTM D2665 DWV | **Yes — every DWV SKU on our site.** Catalog is thinner (mostly 1½–4"); 6–10" and street/long-sweep/closet-flange stay on the sheet as “quote if you manufacture” |
| — | ASTM F891 foam-core | **Yes if they extrude it** (on site + inbound) |
| — | ASTM D2846 SDR-11 CPVC + CTS fittings | **Yes if they manufacture it** (NJ potable). Not in the 2026 NA catalog. No Sch 80 |

## Site vs RFQ

Live plumbing on `assets/products.csv`: PVC 107, PEX 15, CPVC 21.

- **Sent:** all PVC Sch 40 pipe, all foam-core pipe, all PVC DWV fittings, PEX-B ½/¾/1" (sticks + coils), full F2159 ½/¾/1" want-list, full F1807 ½/¾/1", outlet boxes, CPVC SDR-11 ½–2" + CTS fittings (quote-if).
- **Not sent:** PEX 1¼–2" pipe and fittings; CPVC Sch 80; CPVC SDR-13.5; PVC Sch 40 pressure fittings; EVOH / PEX-AL-PEX / manifolds / push-fit / tools.

The compare workbook `Site_plumbing` tab lists every live PVC/PEX/CPVC SKU with On_Palconn_RFQ Yes/No.

## Walkaway (internal)

Zhenpeng ½" PPSU elbow REV **$0.167 FOB**. Palconn PPSU has to beat that landed (~×1.43 China duty) or we keep Zhenpeng for plastic and only buy Palconn **pipe + brass + rings**. PVC/DWV has to beat Tommur landed or we keep Tommur. No PO until the RFQ is back.
