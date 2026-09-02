# RFQ contacts + what to send each factory

Company: **All Pro Building Supplies LLC** (NJ — phone on site 732-734-1123)  
Ask every factory for: **FOB** (name the port), **MOQ by SKU**, **lead time**, **carton packing**, and **NSF / cUPC listing URL or certificate PDF for each SKU family**.

Ready-to-attach CSVs are in [`rfq/`](rfq/). Qty columns are prefilled from your `Factory_Order_PVC_PEX_45HQ.csv` where that file had a line; blank qty = still want a unit price / MOQ.

---

## 1) ERA — PVC + CPVC (primary plastics quote)

**Send:** [`rfq/RFQ_ERA_PVC_CPVC.csv`](rfq/RFQ_ERA_PVC_CPVC.csv)  
**Scope:** All catalog **PVC** (pipe + DWV fittings) + all **CPVC** pipe (Sch 80, SDR-11, SDR-13.5).  
**Do not send:** PEX, copper, insulation.

| | |
|---|---|
| Company | ERA Piping (Zhejiang) Co., Ltd. / ERA Co., Ltd. |
| Email | `info@era.com.cn` |
| Phone | +86-576-84279933 |
| WhatsApp | +86-13738606600 or +86-13957618295 (FAQ) |
| Address | No.1118 Huangjiao Rd, Jiangkou, Huangyan, Taizhou, Zhejiang, China |
| Web | https://www.erapipefittings.com/contactus.html |
| Alibaba | Search “ERA PIPING (ZHEJIANG)” / Era Co., Ltd. |

**Subject:** RFQ — ASTM PVC DWV + Sch40 pipe + CPVC (US NSF/UPC) — 45′HQ  
**Ask specifically:** NSF/ANSI 14 & 61 + cUPC marks on the SKUs quoted; ASTM D2665 / D1785 / D2466 / F441 / D2846 as applicable.

---

## 2) LESSO — PVC only (two tracks)

### A) LESSO America (US stock / landed pricing)

**Send:** [`rfq/RFQ_LESSO_PVC.csv`](rfq/RFQ_LESSO_PVC.csv)  
**Scope:** All catalog **PVC** only. Lesso part codes are in the CSV where you already mapped them.  
**Do not send:** CPVC, PEX, copper.

| | |
|---|---|
| Company | LESSO America, Inc. |
| HQ | 1010 Railroad Street, Corona, CA 92882 |
| Main | (951) 547-6888 · Toll-free (888) 988-8839 |
| Customer service | `sabrinapaz@lessoamerica.com` · (951) 547-6832 |
| Sales (Northeast — best start for NJ) | `billfisher@lessoamerica.com` · (309) 369-8454 |
| Sales (Northeast alt) | `williamyu@lessoamerica.com` · (949) 231-9837 |
| Web | https://www.lessoamerica.com/contact.html |

**Subject:** Distributor / import RFQ — PVC DWV + Sch40 assortment (cNSFus / cUPC)  
**Ask:** Warehouse pricing vs container FOB from China parent; lead times from Corona / TX / MI / FL.

### B) China LESSO Group (factory FOB parallel)

Same CSV: [`rfq/RFQ_LESSO_PVC.csv`](rfq/RFQ_LESSO_PVC.csv)

| | |
|---|---|
| Email | `oversea@lesso.com` |
| Web | https://www.lesso.com |
| Alibaba | Guangdong Liansu Technology Industrial Co., Ltd. |

---

## 3) Tommur / TOMEX — control quote (plastics you already buy)

**Send:** [`rfq/RFQ_TOMMUR_PVC_CPVC_PEX.csv`](rfq/RFQ_TOMMUR_PVC_CPVC_PEX.csv)  
**Scope:** **PVC + CPVC + PEX** (same families as current Tommur relationship).  
**Do not send:** copper (use Hailiang), insulation.

| | |
|---|---|
| Company | Tommur Industry (Shanghai) Co., Ltd. (TOMEX / TOMEEX) |
| Contact | Vivian Yu |
| Email | `contact@tomex.com.cn` · `contact@tomeex.com` · RFQ also `market01@tomex.com.cn` |
| Phone / WhatsApp | +86-21-20986526 · +86-18016050068 |
| Address | No.1 Longxian Road, Fengxian District, Shanghai |
| Web | https://www.tomeex.com/contactus.html · https://www.tommur.com |
| Alibaba | shtommur.en.alibaba.com |

**Subject:** Updated RFQ — PVC / CPVC / PEX container (please attach NSF listing docs per SKU)  
**Ask hard:** NSF company file # / listing URLs. If they can’t produce them, you still get the price baseline.

---

## 4) Rifeng — PEX only

**Send:** [`rfq/RFQ_RIFENG_PEX.csv`](rfq/RFQ_RIFENG_PEX.csv)  
**Scope:** **PEX-B pipe + PEX elbows + PEX reducers** only (15 catalog lines).  
**Do not send:** PVC, CPVC, copper.

| | |
|---|---|
| Company | Rifeng Enterprise Group Co., Ltd. |
| Email | `overseas@rifeng.com` · `marketing@rifeng.com` |
| Phone | +86-757-8228-1137 · 400-111-0211 |
| Address | No.16 Zumiao Road, Chancheng, Foshan, Guangdong 528000, China |
| Web | https://rifeng.com/contact-us/ |

**Subject:** RFQ — ASTM F876/F877 PEX-B + fittings, NSF 14/61 for USA  
**Ask:** PEX type (A/B), chlorine class, barrier vs non-barrier, listed fitting standard (F1807 / F2159 / etc.), NSF listing printouts.

---

## 5) Hailiang USA — copper only

**Send:** [`rfq/RFQ_HAILIANG_COPPER.csv`](rfq/RFQ_HAILIANG_COPPER.csv)  
**Scope:** All catalog **copper** (Type K soft + Type L hard pipe, elbows, tees, couplings, reducers, stub-outs, Cu-to-PEX adapters).  
**Do not send:** plastics.

| | |
|---|---|
| Company | Hailiang America Corporation |
| Email | `sales@hailiangusa.com` |
| Phone | 877-515-4522 |
| Fax | 877-595-4522 |
| Address | 1001 James Drive, Suite B38, Leesport, PA 19533 |
| Web | https://www.hailiangusa.com/contact.php |
| China mill (optional parallel) | Zhejiang Hailiang — Made-in-China / Alibaba; pricing usually LME Cu + fab |

**Subject:** RFQ — ASTM B88 Type K/L tube + ASME B16.22 wrought fittings, NSF 61  
**Ask:** FOB vs delivered NJ/PA; NSF 61 listing confirmation; lead-free / marking.

---

## What *not* to RFQ yet

| Item | Why |
|---|---|
| **Insulation** | Different commodity; not ERA/LESSO/Rifeng/Hailiang core |
| Sending **full catalog to everyone** | Wastes their time and muddies quotes — keep scopes above |

Optional qty helper (already used to prefill): [`rfq/QTY_TEMPLATE_Factory_Order_PVC_PEX_45HQ.csv`](rfq/QTY_TEMPLATE_Factory_Order_PVC_PEX_45HQ.csv)

---

## Copy-paste email body (use for all)

```
Hello,

We are All Pro Building Supplies LLC, a US B2B plumbing distributor.
Please quote the attached CSV for a mixed 40'/45'HQ (or your MOQ if higher).

Please include for each line:
1) Unit price (state FOB port or DDP US)
2) MOQ / carton qty
3) Lead time
4) Carton dimensions & kg if available
5) Applicable ASTM + NSF/ANSI (14/61) and/or cUPC listing documentation

We need products suitable for US code / potable or DWV as marked.
Company: All Pro Building Supplies LLC
Phone: 732-734-1123
Website: https://allprobuildingsupplies.com

Thank you,
[Your name]
```

Attach only that supplier’s CSV from the list above.

---

## Send order (suggested)

1. **ERA** + **Tommur** same day (plastics price + cert bake-off)  
2. **LESSO America** (CC China `oversea@lesso.com` if you want factory FOB too)  
3. **Rifeng** (PEX)  
4. **Hailiang USA** (copper)

Compare apples-to-apples on **landed** cost + whether they actually attach NSF docs.
