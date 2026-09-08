# Palconn (Leela Wang) — full plumbing RFQ

Catalog: `palconn/2026_PALCONN_North_American_Market_Catalog.pdf` (44 pp, received 8 Sep 2026 from Leela Wang). NSF / cUPC / CSA logos on the approvals page. Founded 2007; Weifang Palconn Plastics Technology Co., Ltd, Yinma Industrial Zone, Weifang, Shandong 261317.

**Send her:** `Palconn_Full_Catalog_RFQ_SEND.xlsx` + `Palconn_RFQ_SEND.txt`.  
**Keep:** `Palconn_Full_Catalog_RFQ_COMPARE.xlsx` (internal — site sell, Tommur FOB/DDP, Zhenpeng PPSU REV). Do not forward the compare file.

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
