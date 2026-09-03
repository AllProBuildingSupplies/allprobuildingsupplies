/** Phone OS views — cards and big taps. Same /api/ops as desktop, different UI. */

import {
  $,
  api,
  custName,
  esc,
  field,
  findProduct,
  loadCatalog,
  money,
  ops,
  selectField,
  val,
} from '../ops/lib.js';

export function pill(status) {
  const st = String(status || '').replace(/\s+/g, '_');
  return `<span class="m-pill ${esc(st)}">${esc(st.replace(/_/g, ' ') || '—')}</span>`;
}

export function chips(items, active) {
  return `<div class="m-chips">${items
    .map(
      ([href, label, id]) =>
        `<a href="#/${href}" class="${id === active ? 'is-on' : ''}">${esc(label)}</a>`
    )
    .join('')}</div>`;
}

export function stepper(name, value, extra = '') {
  return `<div class="m-stepper">
    <button type="button" data-step="-1" aria-label="Less">−</button>
    <input class="data-input" name="${esc(name)}" type="number" inputmode="numeric" value="${esc(value)}" ${extra}>
    <button type="button" data-step="1" aria-label="More">+</button>
  </div>`;
}

function empty(msg) {
  return `<div class="m-empty">${esc(msg)}</div>`;
}

export async function viewToday() {
  const data = await ops('/inbox');
  const k = data.kpis || {};
  const tiles = [
    ['pendingConfirm', 'To confirm', 'orders'],
    ['pickTasks', 'Picks', 'floor'],
    ['putawayTasks', 'Putaway', 'floor'],
    ['inboundOpen', 'Dock', 'floor/dock'],
    ['needLoad', 'Need truck', 'run/shipments'],
    ['arOpen', 'Open AR', 'more/finance'],
    ['exceptions', 'Exceptions', 'more/exceptions'],
    ['onHold', 'On hold', 'more/customers'],
  ];
  const pipeline = (data.orders || []).slice(0, 8);
  return `
    <p class="m-help">Work for today. Floor is warehouse + dock. Run is the truck. Paper POs live under More.</p>
    <div class="m-kpis">
      ${tiles
        .map(
          ([key, label, href]) =>
            `<button class="m-kpi" data-go="${href}"><b>${esc(k[key] ?? 0)}</b><span>${esc(label)}</span></button>`
        )
        .join('')}
    </div>
    <div class="m-section">Open pipeline</div>
    ${
      pipeline.length
        ? pipeline
            .map(
              (o) => `<button class="m-card" data-go="orders/${esc(o.id)}">
          <div class="m-row"><h3>${esc(o.id)}</h3><span>${money(o.total)}</span></div>
          <div class="m-meta">${esc(custName(o.customer))} · ${pill(o.fulfillment || o.status)} ${pill(o.paymentStatus)}</div>
        </button>`
            )
            .join('')
        : empty('Nothing in the pipeline.')
    }`;
}

export async function viewOrdersList() {
  const q = (($('ops-search') && $('ops-search').value) || '').trim();
  const list = await ops('/orders?status=all&limit=80' + (q ? '&q=' + encodeURIComponent(q) : ''));
  const rows = (list || [])
    .map(
      (o) => `<button class="m-card" data-go="orders/${esc(o.id)}">
        <div class="m-row"><h3>${esc(o.id)}</h3><span>${money(o.total)}</span></div>
        <div class="m-meta">${esc(custName(o.customer))}${o.po ? ' · PO ' + esc(o.po) : ''}</div>
        <div style="margin-top:8px">${pill(o.fulfillment || o.status)} ${pill(o.paymentStatus)}</div>
      </button>`
    )
    .join('');
  return `${rows || empty('No orders yet.')}
    <button class="m-fab" data-go="orders/new" aria-label="New order">+</button>`;
}

function lineCard(it) {
  return `<div class="m-line" data-oline>
    <div class="m-row"><strong>${esc(it.code || '')}</strong><button type="button" class="m-icon-btn" data-rm-line aria-label="Remove">×</button></div>
    <div class="m-meta">${esc(it.description || '')} ${esc(it.size || '')} · ${money(it.unitPrice)}</div>
    <input type="hidden" name="code" value="${esc(it.code || '')}">
    <input type="hidden" name="size" value="${esc(it.size || '')}">
    <input type="hidden" name="description" value="${esc(it.description || '')}">
    <input type="hidden" name="unitPrice" value="${esc(it.unitPrice || 0)}">
    <input type="hidden" name="qtyShipped" value="${esc(it.qtyShipped || 0)}">
    <label>Qty ${stepper('qty', it.qty || 1, 'min="1"')}</label>
  </div>`;
}

export async function viewOrderDesk(id) {
  const creating = id === 'new';
  const o = creating
    ? { id: '', items: [], customer: {}, delivery: { method: 'delivery' }, paymentStatus: 'unpaid', status: 'pending' }
    : await ops('/orders/' + encodeURIComponent(id));
  const users = await ops('/customers').catch(() => []);
  const custOpts = ['<option value="">— Select account —</option>']
    .concat(
      (users || []).map((u) => {
        const on =
          o.customer && o.customer.email && String(u.email).toLowerCase() === String(o.customer.email).toLowerCase()
            ? ' selected'
            : '';
        const lab = (u.company ? u.company + ' — ' : '') + [u.fname, u.lname].filter(Boolean).join(' ');
        return `<option value="${esc(u.email)}"${on}>${esc(lab || u.email)}</option>`;
      })
    )
    .join('');
  let savedAddrs = [];
  const custEmail = (o.customer && o.customer.email) || '';
  if (custEmail) {
    try {
      const addr = await api('/admin/addresses?email=' + encodeURIComponent(custEmail));
      savedAddrs = addr.addresses || [];
    } catch (_) {}
  }
  const ship = (o.delivery && o.delivery.address) || '';
  const savedOpts = ['<option value="">— Type or pick saved —</option>']
    .concat(
      savedAddrs.map((a) => {
        const full = a.fullAddress || a.full_address || '';
        const lab = [a.label, full].filter(Boolean).join(' — ');
        const on = full && full === ship ? ' selected' : '';
        return `<option value="${esc(full)}"${on}>${esc(lab)}</option>`;
      })
    )
    .join('');
  const actions = (o.nextActions || [])
    .filter((a) => ['confirm', 'allocate', 'pack', 'hold', 'release-hold'].includes(a.id))
    .map((a) => `<button class="m-btn m-btn-gold" data-act="${esc(a.id)}" data-order="${esc(o.id)}">${esc(a.label)}</button>`)
    .join('');
  const lines = (o.items || []).map(lineCard).join('');
  const ships = (o.shipments || [])
    .map((s) => `<button class="m-card" data-go="run/shipments/${esc(s.id)}">${esc(s.id)} ${pill(s.status)}</button>`)
    .join('');
  return `
    <p class="m-help">${creating ? 'Pick a customer, add SKUs, save. Confirm and pick live on this order after save.' : 'Save first if you edit. Confirm → wave → pack from the gold buttons.'}</p>
    <div class="m-form">
      <input type="hidden" id="o-id" value="${esc(o.id)}">
      <input type="hidden" id="o-placed" value="${esc(o.placedAt || '')}">
      <input type="hidden" id="o-status" value="${esc(o.status || 'pending')}">
      <input type="hidden" id="o-pay" value="${esc(o.paymentStatus || 'unpaid')}">
      <label>Customer<select class="data-input" id="o-cust">${custOpts}</select></label>
      ${field('o-name', 'Contact', `value="${esc((o.customer && o.customer.name) || '')}"`)}
      ${field('o-company', 'Company', `value="${esc((o.customer && o.customer.company) || '')}"`)}
      ${field('o-email', 'Email', `value="${esc((o.customer && o.customer.email) || '')}"`)}
      ${field('o-phone', 'Phone', `type="tel" value="${esc((o.customer && o.customer.phone) || '')}"`)}
      ${selectField('o-method', 'Method', ['delivery', 'pickup'], (o.delivery && o.delivery.method) || 'delivery')}
      <label>Saved address<select class="data-input" id="o-saved-addr">${savedOpts}</select></label>
      <label>Ship to<textarea class="data-input" id="o-address" rows="2">${esc(ship)}</textarea></label>
      <label class="m-check"><input type="checkbox" id="o-save-addr" checked> Add new ship-to to address book</label>
      ${field('o-po', 'Customer PO', `value="${esc(o.po || '')}"`)}
      <label>Notes<textarea class="data-input" id="o-notes" rows="2">${esc(o.notes || '')}</textarea></label>
    </div>
    <div class="m-section">Lines</div>
    <input class="data-input" id="sku-q" placeholder="Search SKU or description" style="margin-bottom:8px">
    <div id="sku-hits" class="m-hits" hidden></div>
    <div class="m-actions m-split" style="margin-bottom:12px">
      ${stepper('sku-qty', 1, 'id="sku-qty" min="1"')}
      <button class="m-btn m-btn-gold" data-add-hit>Add SKU</button>
    </div>
    <div id="ops-lines-body">${lines || ''}</div>
    <div class="m-actions">
      <button class="m-btn m-btn-gold" data-save-order>Save order</button>
      ${creating ? '' : actions}
      ${creating ? '' : `<button class="m-btn" data-act="wave" data-order="${esc(o.id)}">Release wave</button>`}
      ${creating ? '' : `<button class="m-btn" data-mark-paid="${esc(o.id)}">Mark paid</button>`}
    </div>
    ${creating || !ships ? '' : `<div class="m-section">Shipments</div>${ships}`}`;
}

export async function viewFloorTasks() {
  const tasks = await ops('/tasks?status=open');
  const cards = (tasks || [])
    .map((t) => {
      const left = Math.max(0, (t.qty_expected || 0) - (t.qty_done || 0));
      return `<div class="m-card">
        <div>${pill(t.type)} ${pill(t.status)}</div>
        <h3 style="margin-top:8px"><code>${esc(t.code)}</code> ${esc(t.size || '')}</h3>
        <div class="m-meta">${esc(t.description || '')}<br>${esc(t.order_id || t.inbound_id || '')} · ${esc(t.from_location)} → ${esc(t.to_location)}</div>
        <div style="margin-top:12px">${stepper('qty', left, `data-qty="${esc(t.id)}" min="0"`)}</div>
        <div class="m-actions m-split">
          <button class="m-btn m-btn-gold" data-task-done="${esc(t.id)}">Done</button>
          <button class="m-btn" data-task-short="${esc(t.id)}">Short</button>
        </div>
      </div>`;
    })
    .join('');
  return `${chips(
    [
      ['floor', 'Tasks', 'tasks'],
      ['floor/dock', 'Dock', 'dock'],
      ['floor/stock', 'Stock', 'stock'],
    ],
    'tasks'
  )}
    <p class="m-help">Picks and putaways. Done moves the qty. Short opens an exception.</p>
    ${cards || empty('No open warehouse tasks.')}`;
}

export async function viewInboundList() {
  const list = await ops('/inbound');
  const rows = (list || [])
    .map((ib) => {
      const exp = (ib.lines || []).reduce((s, l) => s + (l.qty_expected || 0), 0);
      const rec = (ib.lines || []).reduce((s, l) => s + (l.qty_received || 0), 0);
      return `<button class="m-card" data-go="floor/dock/${esc(ib.id)}">
        <div class="m-row"><h3>${esc(ib.container_number || ib.id)}</h3>${pill(ib.status)}</div>
        <div class="m-meta">${esc(ib.eta || 'No ETA')} · PO ${esc(ib.po_id || 'none')} · ${rec}/${exp} recv</div>
      </button>`;
    })
    .join('');
  return `${chips(
    [
      ['floor', 'Tasks', 'tasks'],
      ['floor/dock', 'Dock', 'dock'],
      ['floor/stock', 'Stock', 'stock'],
    ],
    'dock'
  )}
    <p class="m-help">Physical containers. Link a vendor PO if you have one — Purchasing is the paper order, this is the dock.</p>
    <div class="m-actions"><button class="m-btn m-btn-gold" data-go="floor/dock/new">New inbound</button></div>
    ${rows || empty('No inbound containers.')}`;
}

export async function viewInboundDesk(id) {
  const creating = id === 'new';
  const pos = await ops('/purchase-orders').catch(() => []);
  const ib = creating
    ? { id: '', container_number: '', carrier: '', eta: '', po_id: '', notes: '', status: 'in_transit', lines: [{}] }
    : await ops('/inbound/' + encodeURIComponent(id));
  const poOpts = ['<option value="">— none —</option>']
    .concat((pos || []).map((p) => `<option value="${esc(p.id)}"${p.id === ib.po_id ? ' selected' : ''}>${esc(p.id)} ${esc(p.vendor || '')}</option>`))
    .join('');
  const lines = (ib.lines && ib.lines.length ? ib.lines : [{}])
    .map(
      (l) => `<div class="m-line" data-ibline>
        <label>SKU<input class="data-input" name="code" value="${esc(l.code || '')}"></label>
        <label>Size<input class="data-input" name="size" value="${esc(l.size || '')}"></label>
        <label>Expected ${stepper('qty', l.qty_expected || l.qty || 1, 'min="1"')}</label>
        <div class="m-meta">Already received ${esc(l.qty_received != null ? l.qty_received : 0)}</div>
        <label>Recv now ${stepper('recv', '', 'min="0" placeholder="0"')}</label>
      </div>`
    )
    .join('');
  return `
    ${chips(
      [
        ['floor', 'Tasks', 'tasks'],
        ['floor/dock', 'Dock', 'dock'],
        ['floor/stock', 'Stock', 'stock'],
      ],
      'dock'
    )}
    <div class="m-form">
      ${field('ib-container', 'Container #', `value="${esc(ib.container_number || '')}"`)}
      ${field('ib-carrier', 'Carrier', `value="${esc(ib.carrier || '')}"`)}
      ${field('ib-eta', 'ETA', `value="${esc(ib.eta || '')}" placeholder="YYYY-MM-DD"`)}
      <label>Vendor PO<select class="data-input" id="ib-po">${poOpts}</select></label>
      <label>Notes<textarea class="data-input" id="ib-notes" rows="2">${esc(ib.notes || '')}</textarea></label>
    </div>
    <div class="m-section">Expected lines</div>
    <div id="ops-ib-lines">${lines}</div>
    <button class="m-btn m-btn-ghost" data-add-ibline type="button">Add line</button>
    <div class="m-actions">
      <button class="m-btn m-btn-gold" data-save-inbound="${creating ? 'new' : esc(ib.id)}">Save</button>
      ${creating ? '' : `<button class="m-btn" data-ib-arrive="${esc(ib.id)}">Mark arrived</button>`}
      ${creating ? '' : `<button class="m-btn m-btn-gold" data-ib-recv-form="${esc(ib.id)}">Receive entered qty</button>`}
      ${creating ? '' : `<button class="m-btn" data-ib-recv="${esc(ib.id)}">Receive remaining</button>`}
    </div>`;
}

export async function viewFloorStock() {
  return `${chips(
    [
      ['floor', 'Tasks', 'tasks'],
      ['floor/dock', 'Dock', 'dock'],
      ['floor/stock', 'Stock', 'stock'],
    ],
    'stock'
  )}
    <p class="m-help">Quick receive or adjust on the floor. Full catalog is under More → Inventory.</p>
    <div class="m-form">
      ${field('st-code', 'SKU', 'placeholder="Code" autocomplete="off"')}
      ${field('st-size', 'Size', '')}
      <label>Qty ${stepper('st-qty', 1, 'id="st-qty" min="1"')}</label>
    </div>
    <div class="m-actions">
      <button class="m-btn m-btn-gold" data-stock-receive>Receive +</button>
      <div class="m-actions m-split" style="margin:0">
        <button class="m-btn" data-stock-adjust="plus">Adjust +</button>
        <button class="m-btn" data-stock-adjust="minus">Adjust −</button>
      </div>
    </div>`;
}

export async function viewDriver() {
  const run = await ops('/driver/run');
  const blocks = (run.loads || [])
    .map((l) => {
      const stops = (l.stops || [])
        .map((st) => {
          const q = encodeURIComponent(st.address || '');
          return `<div class="m-card">
            <div>${pill(st.stop_type)} ${pill(st.status)}</div>
            <h3 style="margin-top:8px">${esc(st.customer_name || st.order_id)}</h3>
            <div class="m-meta">${esc(st.address || 'No address')} · ${esc(st.shipment_id)}</div>
            ${st.address ? `<div class="m-actions" style="margin-top:10px"><a class="m-btn" href="https://maps.google.com/?q=${q}" target="_blank" rel="noopener">Open maps</a></div>` : ''}
            ${
              st.status === 'pending'
                ? `<div class="m-actions m-split">
              <button class="m-btn m-btn-gold" data-pod="${st.id}">POD</button>
              <button class="m-btn m-btn-danger" data-refuse="${st.id}">Refuse</button>
            </div>`
                : ''
            }
          </div>`;
        })
        .join('');
      return `<div class="m-section">${esc(l.id)} · ${esc(l.truck || 'truck')}</div>${stops || empty('No stops.')}`;
    })
    .join('');
  return `${chips(
    [
      ['run', 'Driver', 'driver'],
      ['run/loads', 'Loads', 'loads'],
      ['run/shipments', 'Shipments', 'shipments'],
    ],
    'driver'
  )}
    <p class="m-help">${esc(run.date)} — POD asks who signed. Refuse sends it back to packed and opens Exceptions.</p>
    ${blocks || empty('No loads for today. Build one under Loads.')}`;
}

export async function viewLoads() {
  const list = await ops('/loads');
  const rows = (list || [])
    .map(
      (l) => `<button class="m-card" data-go="run/loads/${esc(l.id)}">
        <div class="m-row"><h3>${esc(l.id)}</h3>${pill(l.status)}</div>
        <div class="m-meta">${esc(l.run_date)} · ${esc(l.truck || 'no truck')} · ${(l.stops || []).length} stops</div>
      </button>`
    )
    .join('');
  return `${chips(
    [
      ['run', 'Driver', 'driver'],
      ['run/loads', 'Loads', 'loads'],
      ['run/shipments', 'Shipments', 'shipments'],
    ],
    'loads'
  )}
    <p class="m-help">Dispatch: make a truck for today, add packed shipments, then Depart.</p>
    <div class="m-actions"><button class="m-btn m-btn-gold" id="ops-new-load">New load today</button></div>
    ${rows || empty('No loads yet.')}`;
}

export async function viewLoad(id) {
  const [l, allShips] = await Promise.all([ops('/loads/' + encodeURIComponent(id)), ops('/shipments')]);
  const ships = (allShips || []).filter((s) => !s.load_id && ['packed', 'staged'].includes(s.status));
  const opts = ships.map((s) => `<option value="${esc(s.id)}">${esc(s.id)} · ${esc(s.order_id)}</option>`).join('');
  const stops = (l.stops || [])
    .map(
      (st) => `<button class="m-card" data-go="run/shipments/${esc(st.shipment_id)}">
        <div class="m-row"><h3>#${esc(st.seq)} ${esc(st.shipment_id)}</h3>${pill(st.status)}</div>
        <div class="m-meta">${esc(st.customer_name)} · ${esc(st.address)}</div>
      </button>`
    )
    .join('');
  return `${chips(
    [
      ['run', 'Driver', 'driver'],
      ['run/loads', 'Loads', 'loads'],
      ['run/shipments', 'Shipments', 'shipments'],
    ],
    'loads'
  )}
    <div class="m-row" style="margin-bottom:8px"><h3>${esc(l.id)}</h3>${pill(l.status)}</div>
    <div class="m-meta">${esc(l.run_date)} · ${esc(l.truck || 'no truck')}</div>
    <div class="m-actions m-split">
      <button class="m-btn m-btn-gold" data-load-depart="${esc(l.id)}">Depart</button>
      <button class="m-btn" data-go="run">Driver view</button>
    </div>
    <div class="m-section">Add stop</div>
    <select id="ops-add-ship" class="data-input">${opts || '<option value="">No packed shipments</option>'}</select>
    <div class="m-actions"><button class="m-btn" data-load-add="${esc(l.id)}">Add to load</button></div>
    <div class="m-section">Stops</div>
    ${stops || empty('No stops yet.')}`;
}

function shipmentInvoiced(s) {
  return !!(s && String(s.invoiced_at || s.invoice_doc_id || '').trim());
}

export async function viewShipments() {
  const list = await ops('/shipments');
  const rows = (list || [])
    .map(
      (s) => `<button class="m-card" data-go="run/shipments/${esc(s.id)}">
        <div class="m-row"><h3>${esc(s.id)}</h3>${pill(s.status)}${shipmentInvoiced(s) ? pill('invoiced') : ''}</div>
        <div class="m-meta">${esc(s.order_id)} · ${esc(custName(s.customer))} · ${esc(s.load_id || 'no load')}</div>
      </button>`
    )
    .join('');
  return `${chips(
    [
      ['run', 'Driver', 'driver'],
      ['run/loads', 'Loads', 'loads'],
      ['run/shipments', 'Shipments', 'shipments'],
    ],
    'shipments'
  )}
    ${rows || empty('No outbound shipments.')}`;
}

export async function viewShipment(id) {
  const s = await ops('/shipments/' + encodeURIComponent(id));
  const invoiced = shipmentInvoiced(s);
  const lines = (s.lines || [])
    .map(
      (l) => `<div class="m-line"><strong>${esc(l.code)}</strong> ${esc(l.size || '')}<div class="m-meta">${esc(l.description)} · qty ${esc(l.qty)} · ${money(l.unit_price)}</div></div>`
    )
    .join('');
  return `${chips(
    [
      ['run', 'Driver', 'driver'],
      ['run/loads', 'Loads', 'loads'],
      ['run/shipments', 'Shipments', 'shipments'],
    ],
    'shipments'
  )}
    <div class="m-row"><h3>${esc(s.id)}</h3></div>
    <div class="m-meta">Order <button class="m-btn-ghost" data-go="orders/${esc(s.order_id)}" style="display:inline;min-height:auto;padding:0;width:auto;border:0;color:var(--gold)">${esc(s.order_id)}</button> · ${pill(s.status)}${invoiced ? ' ' + pill('invoiced') : ''}</div>
    <div class="m-actions">
      <button class="m-btn" data-ship-stage="${esc(s.id)}">Stage dock</button>
      ${
        invoiced
          ? `<div class="m-meta">Invoiced${s.invoiced_at ? ' ' + esc(String(s.invoiced_at).slice(0, 10)) : ''}</div>`
          : `<button class="m-btn m-btn-gold" data-ship-invoice="${esc(s.id)}">Mark invoiced</button>`
      }
    </div>
    <div class="m-section">Lines</div>
    ${lines || empty('No lines.')}
    <p class="m-help">Mark invoiced flags the shipment. Email / PDF invoices stay on desktop OS.</p>`;
}

export async function viewMore() {
  return `
    <p class="m-help">Office tools. Daily floor work is the other four tabs.</p>
    <div class="m-section">Money & accounts</div>
    <button class="m-list-btn" data-go="more/finance"><span>Finance / AR<small>Mark paid</small></span>›</button>
    <button class="m-list-btn" data-go="more/customers"><span>Customers<small>Accounts, credit, addresses</small></span>›</button>
    <button class="m-list-btn" data-go="more/exceptions"><span>Exceptions<small>Holds, shorts, refused</small></span>›</button>
    <div class="m-section">Buying</div>
    <button class="m-list-btn" data-go="more/purchasing"><span>Purchasing<small>Vendor POs — paper, not the dock</small></span>›</button>
    <button class="m-list-btn" data-go="more/inventory"><span>Inventory<small>Catalog, cycle count</small></span>›</button>
    <div class="m-section">This phone</div>
    <label class="m-form" style="margin:0 0 12px">Role
      <select id="ops-role" class="data-input"></select>
    </label>
    <a class="m-list-btn" id="m-desk-link" href="ops.html"><span>Desktop OS<small>Full desk, invoices, CSV</small></span>›</a>
    <a class="m-list-btn" href="admin.html"><span>Classic admin<small>Fallback</small></span>›</a>`;
}

export async function viewPurchasingList() {
  const list = await ops('/purchase-orders');
  const rows = (list || [])
    .map(
      (p) => `<button class="m-card" data-go="more/purchasing/${esc(p.id)}">
        <div class="m-row"><h3>${esc(p.id)}</h3>${pill(p.status)}</div>
        <div class="m-meta">${esc(p.vendor)} · ETA ${esc(p.eta || '—')} · ${money(p.landed_cost)}</div>
      </button>`
    )
    .join('');
  return `<p class="m-help">Factory paper (Tommur / Lesso). Mark sent does not email the vendor. Receiving is Floor → Dock.</p>
    <div class="m-actions"><button class="m-btn m-btn-gold" data-go="more/purchasing/new">New PO</button></div>
    ${rows || empty('No vendor POs.')}`;
}

function poLine(l) {
  return `<div class="m-line" data-poline>
    <label>SKU<input class="data-input" name="code" value="${esc(l.code || '')}"></label>
    <label>Size<input class="data-input" name="size" value="${esc(l.size || '')}"></label>
    <label>Description<input class="data-input" name="description" value="${esc(l.description || '')}"></label>
    <label>Qty ${stepper('qty', l.qty_ordered || l.qty || 1, 'min="1"')}</label>
    <label>Unit cost<input class="data-input" name="unitCost" type="number" step="0.01" value="${esc(l.unit_cost || l.unitCost || 0)}"></label>
    <button type="button" class="m-btn m-btn-ghost" data-rm-poline>Remove line</button>
  </div>`;
}

export async function viewPoDesk(id) {
  const creating = id === 'new';
  const po = creating
    ? { id: 'new', vendor: 'Tommur', freight: 0, duty: 0, eta: '', notes: '', lines: [{}] }
    : await ops('/purchase-orders/' + encodeURIComponent(id));
  const lines = (po.lines && po.lines.length ? po.lines : [{}]).map(poLine).join('');
  return `
    <div class="m-form">
      ${field('po-vendor', 'Vendor', `value="${esc(po.vendor || '')}"`)}
      ${field('po-eta', 'ETA', `value="${esc(po.eta || '')}" placeholder="YYYY-MM-DD"`)}
      ${field('po-freight', 'Freight $', `type="number" step="0.01" value="${esc(po.freight || 0)}"`)}
      ${field('po-duty', 'Duty $', `type="number" step="0.01" value="${esc(po.duty || 0)}"`)}
      <label>Notes<textarea class="data-input" id="po-notes" rows="2">${esc(po.notes || '')}</textarea></label>
    </div>
    <div class="m-section">Lines</div>
    <div id="ops-po-lines">${lines}</div>
    <button class="m-btn m-btn-ghost" data-add-poline type="button">Add line</button>
    <div class="m-actions">
      <button class="m-btn m-btn-gold" data-save-po="${esc(po.id)}">Save PO</button>
      ${creating ? '' : `<button class="m-btn" data-po-send="${esc(po.id)}">Mark sent</button>`}
    </div>`;
}

export async function viewInventory() {
  const q = (($('ops-search') && $('ops-search').value) || '').trim();
  const atp = await ops('/inventory?q=' + encodeURIComponent(q) + '&limit=40');
  const rows = (atp || [])
    .map(
      (p) => `<button class="m-card" data-go="more/inventory/edit/${encodeURIComponent(p.code)}/${encodeURIComponent(p.size || '')}">
        <div class="m-row"><h3>${esc(p.code)}</h3><span>${money(p.price)}</span></div>
        <div class="m-meta">${esc(p.description || '')} ${esc(p.size || '')}</div>
        <div class="m-meta">Avail ${esc(p.available)} · Floor ${esc(p.floor)} · IB ${esc(p.inbound || 0)}</div>
        <div class="m-actions m-split" style="margin-top:10px">
          ${stepper('count', '', `data-count-sku="${esc(p.code)}" data-count-size="${esc(p.size || '')}" placeholder="#"`)}
          <button class="m-btn" data-count-save="${esc(p.code)}" data-size="${esc(p.size || '')}">Count</button>
        </div>
      </button>`
    )
    .join('');
  return `<p class="m-help">Search, tap a SKU to edit. Cycle count: type the physical qty and tap Count.</p>
    <div class="m-actions"><button class="m-btn m-btn-gold" data-go="more/inventory/new">New SKU</button></div>
    ${rows || empty('No SKUs match.')}`;
}

export async function viewProduct(mode, extra) {
  const creating = mode === 'new';
  const code = creating ? '' : decodeURIComponent(extra[0] || '');
  const size = creating ? '' : decodeURIComponent(extra[1] || '');
  const prods = await loadCatalog();
  const p = creating ? {} : findProduct(prods, code, size) || { code, size };
  return `<div class="m-form">
      ${field('p-code', 'SKU', `value="${esc(p.code || '')}" ${creating ? '' : 'readonly'}`)}
      ${field('p-size', 'Size', `value="${esc(p.size || '')}"`)}
      ${field('p-desc', 'Description', `value="${esc(p.description || '')}"`)}
      ${field('p-qty', 'On-hand', `type="number" value="${esc(p.qty != null ? p.qty : p.stock != null ? p.stock : 0)}"`)}
      ${field('p-price', 'Price', `type="number" step="0.01" value="${esc(p.price != null ? p.price : '')}"`)}
      ${field('p-pack', 'Pack', `type="number" value="${esc(p.pack != null ? p.pack : '')}"`)}
    </div>
    <div class="m-actions"><button class="m-btn m-btn-gold" data-save-product>Save product</button></div>`;
}

export async function viewFinance(filter) {
  const f = ['open', 'paid', 'all'].includes(filter) ? filter : 'open';
  const rows = await ops('/finance/ar');
  const filtered = (rows || []).filter((r) => {
    const st = String(r.paymentStatus || 'unpaid').toLowerCase();
    if (f === 'open') return ['unpaid', 'partial'].includes(st);
    if (f === 'paid') return st === 'paid';
    return true;
  });
  const cards = filtered
    .map(
      (r) => `<div class="m-card">
        <button data-go="orders/${esc(r.id)}" class="m-btn-ghost" style="padding:0;min-height:0;border:0;width:auto;text-align:left">
          <div class="m-row"><h3>${esc(r.id)}</h3><span>${money(r.total)}</span></div>
          <div class="m-meta">${esc(custName(r.customer))}</div>
          <div style="margin-top:6px">${pill(r.paymentStatus)} ${pill(r.fulfillment)}</div>
        </button>
        ${
          String(r.paymentStatus || '').toLowerCase() !== 'paid'
            ? `<div class="m-actions"><button class="m-btn m-btn-gold" data-mark-paid="${esc(r.id)}">Mark paid</button></div>`
            : ''
        }
      </div>`
    )
    .join('');
  return `${chips(
    [
      ['more/finance/open', 'Open', 'open'],
      ['more/finance/paid', 'Paid', 'paid'],
      ['more/finance/all', 'All', 'all'],
    ],
    f
  )}
    ${cards || empty('No invoices in this filter.')}`;
}

export async function viewCustomers() {
  const list = await ops('/customers');
  const q = (($('ops-search') && $('ops-search').value) || '').toLowerCase();
  const rows = (list || [])
    .filter((u) => {
      if (!q) return true;
      return [u.company, u.email, u.fname, u.lname, u.phone].join(' ').toLowerCase().includes(q);
    })
    .map(
      (u) => `<button class="m-card" data-go="more/customers/${esc(u.id)}">
        <div class="m-row"><h3>${esc(u.company || [u.fname, u.lname].join(' '))}</h3>${pill(u.status)}</div>
        <div class="m-meta">${esc(u.email)} · ${pill(u.credit_hold ? 'hold' : 'ok')} · ${money(u.credit_limit)}</div>
      </button>`
    )
    .join('');
  return `<div class="m-actions"><button class="m-btn m-btn-gold" data-go="more/customers/new">New customer</button></div>
    ${rows || empty('No customers.')}`;
}

export async function viewCustomer(id) {
  const creating = id === 'new';
  let u = {
    id: '',
    fname: '',
    lname: '',
    email: '',
    phone: '',
    company: '',
    status: 'approved',
    canOrderPieces: 1,
    credit_limit: 0,
    credit_hold: 0,
  };
  let addresses = [];
  if (!creating) {
    const list = await ops('/customers');
    u = (list || []).find((x) => String(x.id) === String(id)) || u;
    try {
      const addr = await api('/admin/addresses?email=' + encodeURIComponent(u.email) + '&import=1');
      addresses = addr.addresses || [];
    } catch (_) {}
  }
  const addrCards = addresses
    .map(
      (a) => `<div class="m-line">
        <strong>${esc(a.label || 'Address')}</strong> ${a.isDefault || a.is_default ? pill('default') : ''}
        <div class="m-meta">${esc(a.fullAddress || a.full_address || '')}</div>
        <button class="m-btn m-btn-ghost" data-del-addr="${esc(a.id)}">Delete address</button>
      </div>`
    )
    .join('');
  return `<div class="m-form">
      <input type="hidden" id="c-id" value="${esc(u.id)}">
      ${field('c-fname', 'First name', `value="${esc(u.fname || '')}"`)}
      ${field('c-lname', 'Last name', `value="${esc(u.lname || '')}"`)}
      ${field('c-email', 'Email', `type="email" value="${esc(u.email || '')}"`)}
      ${field('c-phone', 'Phone', `type="tel" value="${esc(u.phone || '')}"`)}
      ${field('c-company', 'Company', `value="${esc(u.company || '')}"`)}
      ${selectField('c-status', 'Status', ['approved', 'pending', 'rejected'], u.status || 'pending')}
      ${selectField('c-pcs', 'Can order pieces', [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], u.canOrderPieces ? 'true' : 'false')}
      ${field('c-credit', 'Credit limit $', `type="number" step="0.01" value="${esc(u.credit_limit || 0)}"`)}
      ${field('c-password', 'Password', `type="password" placeholder="${creating ? 'Default Welcome1!' : 'Leave blank'}" autocomplete="new-password"`)}
    </div>
    <div class="m-actions">
      <button class="m-btn m-btn-gold" data-save-customer="${creating ? 'new' : 'edit'}">Save customer</button>
      ${
        creating
          ? ''
          : `<button class="m-btn" data-credit="${esc(u.email)}" data-hold="${u.credit_hold ? 0 : 1}">${
              u.credit_hold ? 'Release credit hold' : 'Place credit hold'
            }</button>`
      }
    </div>
    ${
      creating
        ? ''
        : `<div class="m-section">Address book</div>${addrCards || empty('No saved addresses.')}
    <div class="m-form" style="margin-top:12px">
      ${field('a-label', 'Label', 'placeholder="Jobsite"')}
      ${field('a-phone', 'Phone', '')}
      <label>Full address<textarea class="data-input" id="a-full" rows="3"></textarea></label>
      <label class="m-check"><input type="checkbox" id="a-default"> Default</label>
    </div>
    <div class="m-actions"><button class="m-btn m-btn-gold" data-save-address="${esc(u.email)}">Add address</button></div>`
    }`;
}

export async function viewExceptions() {
  const list = await ops('/exceptions');
  const rows = (list || [])
    .map(
      (e) => `<div class="m-card">
        <div>${pill(e.kind)} ${pill(e.status)}</div>
        <div class="m-meta" style="margin-top:8px">${esc(e.summary)} · ${esc(e.entity_id)}</div>
        ${e.status === 'open' ? `<div class="m-actions"><button class="m-btn" data-exc="${e.id}">Resolve</button></div>` : ''}
      </div>`
    )
    .join('');
  return `<p class="m-help">Resolve only closes the row. It does not undo a short pick or credit hold.</p>
    ${rows || empty('No exceptions.')}`;
}

export function ibLineTemplate() {
  return `<div class="m-line" data-ibline>
    <label>SKU<input class="data-input" name="code" value=""></label>
    <label>Size<input class="data-input" name="size" value=""></label>
    <label>Expected ${stepper('qty', 1, 'min="1"')}</label>
    <label>Recv now ${stepper('recv', '', 'min="0"')}</label>
  </div>`;
}

export function poLineTemplate() {
  return poLine({});
}
