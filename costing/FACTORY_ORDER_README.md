# Factory Order — 3-Month High-Margin Container

## Files
- `Factory_Order_3Mo_Container.xlsx` — projection report (Summary, Factory_Order, Filled_Container_Order, Full_Projection, TopUp, Assumptions)
- `Factory_Order_For_Tommur.csv` — **core** 3-month money-maker reorder only (~60% of a 45'HQ)
- `Factory_Order_For_Tommur_FILLED.csv` — **send this to Tommur** — core + deepen top sellers to ~90% of a 45'HQ

## Method
1. Live sales, on-hand qty, and open backorders from production.
2. Inbound Containers 3 + 4 applied first against backorders.
3. Money-makers = competitive margin ≥30% **or** PVC DWV fittings.
4. Order = carton-rounded gap to reach 3 months of historical monthly sales (plus any BO shortfall C3/C4 won’t cover).
5. Filled package adds ~2 extra months on top sellers to use remaining cube.

## Container
Use a **45'HQ**. Core alone underfills; filled package is ~90% of 45'HQ and **over** a 40'.

## Rebuild
```bash
# requires /tmp/plan_orders.json products/backorders from a live pull
python3 scripts/build_factory_order_projection.py
```
