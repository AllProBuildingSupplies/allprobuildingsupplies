const API = () => (window.APBS_API_BASE || '').replace(/\/$/, '');

function token() {
  return sessionStorage.getItem('apbs_admin_token') || '';
}

function headers() {
  return window.apbsAdminHeaders
    ? window.apbsAdminHeaders({ 'Content-Type': 'application/json' })
    : { 'Content-Type': 'application/json' };
}

async function ops(path, opts = {}) {
  const r = await fetch(API() + '/ops' + path, {
    ...opts,
    headers: { ...headers(), ...(opts.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) {
    sessionStorage.removeItem('apbs_admin_token');
    location.reload();
    throw new Error('Unauthorized');
  }
  if (!r.ok) throw new Error(data.error || data.detail || 'HTTP ' + r.status);
  return data;
}

function $(id) {
  return document.getElementById(id);
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function money(n) {
  return '$' + (Number(n) || 0).toFixed(2);
}

function pill(status) {
  const st = String(status || '').replace(/\s+/g, '_');
  return `<span class="ops-pill ${esc(st)}">${esc(st.replace(/_/g, ' ') || '—')}</span>`;
}

function custName(c) {
  if (!c) return '—';
  return c.company || c.name || [c.fname, c.lname].filter(Boolean).join(' ') || c.email || '—';
}

function flash(msg, isErr) {
  const el = $('ops-flash');
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || '';
  el.style.borderColor = isErr ? '#c45' : '';
}

function route() {
  const hash = (location.hash || '#/inbox').replace(/^#/, '');
  const parts = hash.split('/').filter(Boolean);
  return { parts, view: parts[0] || 'inbox', id: parts[1] || '' };
}

const ROLES = ['owner', 'sales', 'warehouse', 'dispatch', 'driver', 'finance'];

async function login(password) {
  const r = await fetch(API() + '/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Login failed');
  sessionStorage.setItem('apbs_admin_token', data.token);
}

const PALETTE = [
  { id: 'inbox', label: 'Go to Inbox', run: () => go('inbox') },
  { id: 'orders', label: 'Go to Orders', run: () => go('orders') },
  { id: 'warehouse', label: 'Go to Warehouse tasks', run: () => go('warehouse') },
  { id: 'shipments', label: 'Go to Shipments', run: () => go('shipments') },
  { id: 'loads', label: 'Go to Loads', run: () => go('loads') },
  { id: 'driver', label: 'Go to Driver run', run: () => go('driver') },
  { id: 'inbound', label: 'Go to Inbound dock', run: () => go('inbound') },
  { id: 'purchasing', label: 'Go to Purchasing', run: () => go('purchasing') },
  { id: 'inventory', label: 'Go to Inventory', run: () => go('inventory') },
  { id: 'finance', label: 'Go to Finance / AR', run: () => go('finance') },
  { id: 'exceptions', label: 'Go to Exceptions', run: () => go('exceptions') },
  { id: 'customers', label: 'Go to Customers / credit', run: () => go('customers') },
];

function go(path) {
  location.hash = '#/' + path.replace(/^\//, '');
}

function setNav(view) {
  document.querySelectorAll('.ops-nav a').forEach((a) => {
    a.classList.toggle('is-on', a.getAttribute('data-nav') === view);
  });
  const titles = {
    inbox: 'Inbox',
    orders: 'Orders',
    warehouse: 'Warehouse',
    shipments: 'Shipments',
    loads: 'Loads',
    driver: 'Driver',
    inbound: 'Inbound',
    purchasing: 'Purchasing',
    inventory: 'Inventory',
    finance: 'Finance',
    exceptions: 'Exceptions',
    customers: 'Customers',
  };
  $('ops-crumb').textContent = titles[view] || 'All Pro OS';
}

async function render() {
  flash('');
  const { view, id } = route();
  setNav(view);
  const root = $('ops-view');
  try {
    if (view === 'inbox') return void (root.innerHTML = await viewInbox());
    if (view === 'orders' && id) return void (root.innerHTML = await viewOrder(id));
    if (view === 'orders') return void (root.innerHTML = await viewOrders());
    if (view === 'warehouse') return void (root.innerHTML = await viewWarehouse());
    if (view === 'waves' && id) return void (root.innerHTML = await viewWave(id));
    if (view === 'shipments' && id) return void (root.innerHTML = await viewShipment(id));
    if (view === 'shipments') return void (root.innerHTML = await viewShipments());
    if (view === 'loads' && id) return void (root.innerHTML = await viewLoad(id));
    if (view === 'loads') return void (root.innerHTML = await viewLoads());
    if (view === 'driver') return void (root.innerHTML = await viewDriver());
    if (view === 'inbound' && id) return void (root.innerHTML = await viewInbound(id));
    if (view === 'inbound') return void (root.innerHTML = await viewInbounds());
    if (view === 'purchasing' && id) return void (root.innerHTML = await viewPo(id));
    if (view === 'purchasing') return void (root.innerHTML = await viewPurchasing());
    if (view === 'inventory') return void (root.innerHTML = await viewInventory());
    if (view === 'finance') return void (root.innerHTML = await viewFinance());
    if (view === 'exceptions') return void (root.innerHTML = await viewExceptions());
    if (view === 'customers') return void (root.innerHTML = await viewCustomers());
    root.innerHTML = await viewInbox();
  } catch (e) {
    root.innerHTML = `<div class="ops-empty">${esc(e.message)}</div>`;
  }
}

function orderRow(o) {
  return `<tr data-go="orders/${esc(o.id)}">
    <td>${esc(o.id)}</td>
    <td>${esc(custName(o.customer))}</td>
    <td>${esc(o.po || '')}</td>
    <td class="num">${money(o.total)}</td>
    <td>${pill(o.fulfillment || o.status)}</td>
    <td>${pill(o.paymentStatus || '')}</td>
  </tr>`;
}

async function viewInbox() {
  const data = await ops('/inbox');
  const k = data.kpis || {};
  const kpis = [
    ['pendingConfirm', 'Confirm', 'orders'],
    ['pickTasks', 'Pick tasks', 'warehouse'],
    ['putawayTasks', 'Putaway', 'warehouse'],
    ['needLoad', 'Need a load', 'shipments'],
    ['inboundOpen', 'Inbound', 'inbound'],
    ['arOpen', 'Open AR', 'finance'],
    ['exceptions', 'Exceptions', 'exceptions'],
    ['onHold', 'On hold', 'exceptions'],
  ];
  return `
    <div class="ops-row"><h1 class="ops-h1">What needs you</h1>
      <span class="ops-sub">Work queues — not modules. Press ⌘K.</span></div>
    <div class="ops-kpis">
      ${kpis
        .map(
          ([key, label, href]) =>
            `<button class="ops-kpi" data-go="${href}"><b>${esc(k[key] ?? 0)}</b><span>${esc(label)}</span></button>`
        )
        .join('')}
    </div>
    <div class="ops-card">
      <h3>Open pipeline</h3>
      ${table(
        ['Order', 'Customer', 'PO', 'Total', 'Fulfillment', 'Pay'],
        (data.orders || []).map(orderRow)
      )}
    </div>`;
}

function table(headers, rows) {
  if (!rows.length) return `<div class="ops-empty">Nothing here yet.</div>`;
  return `<div style="overflow:auto"><table class="ops-table">
    <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table></div>`;
}

async function viewOrders() {
  const list = await ops('/orders?status=open');
  return `
    <div class="ops-row"><h1 class="ops-h1">Orders</h1>
      <span class="ops-sub">Confirm → allocate → pick → pack → load → POD</span></div>
    ${table(
      ['Order', 'Customer', 'PO', 'Total', 'Fulfillment', 'Pay'],
      (list || []).map(orderRow)
    )}`;
}

async function viewOrder(id) {
  const o = await ops('/orders/' + encodeURIComponent(id));
  const actions = (o.nextActions || [])
    .map((a) => `<button class="ops-btn ops-btn-gold" data-act="${esc(a.id)}" data-order="${esc(o.id)}">${esc(a.label)}</button>`)
    .join('');
  const lines = (o.items || [])
    .map(
      (it) => `<tr>
        <td>${esc(it.code)}<div class="ops-sub">${esc(it.description)} ${esc(it.size)}</div></td>
        <td class="num">${it.qty}</td>
        <td class="num">${it.qtyAllocated}</td>
        <td class="num">${it.qtyPicked}</td>
        <td class="num">${it.qtyShipped}</td>
        <td class="num">${it.qtyRemaining}</td>
        <td class="num">${money(it.unitPrice)}</td>
        <td class="ops-sub">ATP ${it.atp ? it.atp.available : '—'}${it.atp && it.atp.inbound ? ' +IB ' + it.atp.inbound : ''}</td>
      </tr>`
    )
    .join('');
  const ships = (o.shipments || [])
    .map(
      (s) =>
        `<div><a href="#/shipments/${esc(s.id)}">${esc(s.id)}</a> ${pill(s.status)} ${esc(s.method || '')}</div>`
    )
    .join('') || '<div class="ops-sub">No outbound shipments yet.</div>';
  const tl = (o.timeline || [])
    .map(
      (e) =>
        `<li><strong>${esc(e.action)}</strong> ${esc(e.from_status)} → ${esc(e.to_status)} <span>${esc(e.actor)}</span></li>`
    )
    .join('');
  return `
    <div class="ops-row">
      <div><h1 class="ops-h1">${esc(o.id)}</h1>
        <div class="ops-sub">${esc(custName(o.customer))} · ${pill(o.fulfillment)} ${pill(o.paymentStatus)}</div></div>
      <div class="ops-btn-row">${actions}
        <button class="ops-btn" data-act="wave" data-order="${esc(o.id)}">Release wave</button>
      </div>
    </div>
    <div class="ops-grid-2">
      <div class="ops-card">
        <h3>Lines</h3>
        ${table(['SKU', 'Ord', 'Alloc', 'Pick', 'Ship', 'Left', 'Price', 'ATP'], [lines])}
      </div>
      <div>
        <div class="ops-card" style="margin-bottom:12px">
          <h3>Promise</h3>
          <dl class="ops-dl">
            <dt>Method</dt><dd>${esc(o.delivery && o.delivery.method)}</dd>
            <dt>Address</dt><dd>${esc(o.delivery && o.delivery.address)}</dd>
            <dt>PO</dt><dd>${esc(o.po)}</dd>
            <dt>Promised</dt><dd>${esc(o.promisedAt || '—')}</dd>
            <dt>Hold</dt><dd>${esc(o.holdReason || '—')}</dd>
          </dl>
        </div>
        <div class="ops-card" style="margin-bottom:12px"><h3>Shipments</h3>${ships}</div>
        <div class="ops-card"><h3>Timeline</h3><ul class="ops-timeline">${tl || '<li>No events yet</li>'}</ul></div>
      </div>
    </div>`;
}

async function viewWarehouse() {
  const [tasks, waves] = await Promise.all([ops('/tasks?status=open'), ops('/waves')]);
  const cards = (tasks || [])
    .map((t) => {
      const left = Math.max(0, (t.qty_expected || 0) - (t.qty_done || 0));
      return `<div class="ops-task">
        <div class="ops-task-main">
          ${pill(t.type)} ${pill(t.status)}
          <div><code>${esc(t.code)}</code> ${esc(t.size)} · ${esc(t.description || '')}</div>
          <div class="ops-sub">${esc(t.order_id || t.inbound_id || '')} · ${esc(t.from_location)} → ${esc(t.to_location)} · ${left} left</div>
        </div>
        <div>
          <input class="ops-big-qty" type="number" min="0" value="${left}" data-qty="${esc(t.id)}"/>
          <div class="ops-btn-row">
            <button class="ops-btn ops-btn-gold" data-task-done="${esc(t.id)}">Done</button>
            <button class="ops-btn" data-task-short="${esc(t.id)}">Short</button>
          </div>
        </div>
      </div>`;
    })
    .join('');
  const waveRows = (waves || [])
    .map((w) => `<tr data-go="waves/${esc(w.id)}"><td>${esc(w.id)}</td><td>${pill(w.status)}</td><td>${esc(w.note || '')}</td></tr>`)
    .join('');
  return `
    <div class="ops-row"><h1 class="ops-h1">Warehouse</h1>
      <span class="ops-sub">Phone-sized tasks. Scan / type qty, tap Done.</span></div>
    ${cards || '<div class="ops-empty">No open tasks. Confirm an order and release a wave.</div>'}
    <div class="ops-card" style="margin-top:18px"><h3>Waves</h3>${table(['Wave', 'Status', 'Note'], waveRows ? [waveRows] : [])}</div>`;
}

async function viewWave(id) {
  const w = await ops('/waves/' + encodeURIComponent(id));
  return `<div class="ops-row"><h1 class="ops-h1">${esc(w.id)}</h1>${pill(w.status)}</div>
    <p class="ops-sub">${esc(w.note || '')}</p>
    ${table(
      ['Task', 'Type', 'SKU', 'Qty', 'Status'],
      (w.tasks || []).map(
        (t) =>
          `<tr><td>${esc(t.id)}</td><td>${esc(t.type)}</td><td>${esc(t.code)} ${esc(t.size)}</td><td>${t.qty_done}/${t.qty_expected}</td><td>${pill(t.status)}</td></tr>`
      )
    )}`;
}

async function viewShipments() {
  const list = await ops('/shipments');
  const rows = (list || []).map(
    (s) => `<tr data-go="shipments/${esc(s.id)}">
      <td>${esc(s.id)}</td><td>${esc(s.order_id)}</td><td>${esc(custName(s.customer))}</td>
      <td>${pill(s.status)}</td><td>${esc(s.load_id || '—')}</td></tr>`
  );
  return `<div class="ops-row"><h1 class="ops-h1">Outbound shipments</h1>
    <span class="ops-sub">First-class OB documents — not JSON on the order.</span></div>
    ${table(['Shipment', 'Order', 'Customer', 'Status', 'Load'], rows)}`;
}

async function viewShipment(id) {
  const s = await ops('/shipments/' + encodeURIComponent(id));
  const lines = (s.lines || [])
    .map((l) => `<tr><td>${esc(l.code)} ${esc(l.size)}</td><td>${esc(l.description)}</td><td class="num">${l.qty}</td><td class="num">${money(l.unit_price)}</td></tr>`)
    .join('');
  return `<div class="ops-row">
      <div><h1 class="ops-h1">${esc(s.id)}</h1>
        <div class="ops-sub">Order <a href="#/orders/${esc(s.order_id)}">${esc(s.order_id)}</a> · ${pill(s.status)}</div></div>
      <div class="ops-btn-row">
        <button class="ops-btn" data-ship-stage="${esc(s.id)}">Stage dock</button>
        <button class="ops-btn ops-btn-gold" data-ship-invoice="${esc(s.id)}">Mark invoiced</button>
      </div>
    </div>
    <div class="ops-card">
      <h3>Lines</h3>
      ${table(['SKU', 'Desc', 'Qty', 'Price'], lines ? [lines] : [])}
      <p class="ops-sub" style="margin-top:10px">Load ${esc(s.load_id || 'not assigned')} · ${esc(s.method || '')}</p>
    </div>`;
}

async function viewLoads() {
  const [list, allShips] = await Promise.all([ops('/loads'), ops('/shipments')]);
  const unassigned = (allShips || []).filter((s) => !s.load_id && ['packed', 'staged'].includes(s.status));
  const rows = (list || []).map(
    (l) => `<tr data-go="loads/${esc(l.id)}"><td>${esc(l.id)}</td><td>${esc(l.run_date)}</td><td>${esc(l.truck)}</td>
      <td>${pill(l.status)}</td><td>${(l.stops || []).length} stops</td></tr>`
  );
  const opts = unassigned
    .map((s) => `<option value="${esc(s.id)}">${esc(s.id)} · ${esc(s.order_id)}</option>`)
    .join('');
  return `<div class="ops-row"><h1 class="ops-h1">Loads</h1>
      <button class="ops-btn ops-btn-gold" id="ops-new-load">New load today</button></div>
    ${table(['Load', 'Date', 'Truck', 'Status', 'Stops'], rows)}
    <div class="ops-card" style="margin-top:16px">
      <h3>Packed, not on a truck</h3>
      ${unassigned.length ? `<select id="ops-loose-ship" class="data-input">${opts}</select>
        <p class="ops-sub">Open a load, then add the shipment as a stop.</p>` : '<div class="ops-sub">All packed shipments are assigned.</div>'}
    </div>`;
}

async function viewLoad(id) {
  const [l, allShips] = await Promise.all([
    ops('/loads/' + encodeURIComponent(id)),
    ops('/shipments'),
  ]);
  const ships = (allShips || []).filter((s) => !s.load_id && ['packed', 'staged'].includes(s.status));
  const opts = ships.map((s) => `<option value="${esc(s.id)}">${esc(s.id)} · ${esc(s.order_id)}</option>`).join('');
  const stops = (l.stops || [])
    .map(
      (st) => `<tr>
        <td>${st.seq}</td>
        <td><a href="#/shipments/${esc(st.shipment_id)}">${esc(st.shipment_id)}</a></td>
        <td>${esc(st.customer_name)}</td>
        <td>${esc(st.address)}</td>
        <td>${pill(st.stop_type)}</td>
        <td>${pill(st.status)}</td>
      </tr>`
    )
    .join('');
  return `<div class="ops-row">
      <div><h1 class="ops-h1">${esc(l.id)}</h1>
        <div class="ops-sub">${esc(l.run_date)} · ${esc(l.truck || 'no truck')} · ${pill(l.status)}</div></div>
      <div class="ops-btn-row">
        <button class="ops-btn ops-btn-gold" data-load-depart="${esc(l.id)}">Depart</button>
        <a class="ops-btn" href="#/driver">Driver view</a>
      </div>
    </div>
    <div class="ops-card" style="margin-bottom:12px">
      <h3>Add stop</h3>
      <div class="ops-btn-row">
        <select id="ops-add-ship" class="data-input">${opts || '<option value="">No packed shipments</option>'}</select>
        <button class="ops-btn" data-load-add="${esc(l.id)}">Add to load</button>
      </div>
    </div>
    ${table(['#', 'Shipment', 'Customer', 'Address', 'Type', 'Status'], stops ? [stops] : [])}`;
}

async function viewDriver() {
  const run = await ops('/driver/run');
  const blocks = (run.loads || [])
    .map((l) => {
      const stops = (l.stops || [])
        .map((st) => {
          const q = encodeURIComponent(st.address || '');
          return `<div class="ops-task">
            <div class="ops-task-main">
              <div>${pill(st.stop_type)} ${pill(st.status)} <strong>${esc(st.customer_name || st.order_id)}</strong></div>
              <div class="ops-sub">${esc(st.address)} · ${esc(st.shipment_id)}</div>
              ${st.address ? `<a class="ops-quiet" href="https://maps.google.com/?q=${q}" target="_blank" rel="noopener">Map</a>` : ''}
            </div>
            ${st.status === 'pending' ? `<div class="ops-btn-row">
              <button class="ops-btn ops-btn-gold" data-pod="${st.id}">POD</button>
              <button class="ops-btn" data-refuse="${st.id}">Refuse</button>
            </div>` : ''}
          </div>`;
        })
        .join('');
      return `<div class="ops-card" style="margin-bottom:14px"><h3>${esc(l.id)} · ${esc(l.truck || '')}</h3>${stops}</div>`;
    })
    .join('');
  return `<div class="ops-row"><h1 class="ops-h1">Driver run</h1><span class="ops-sub">${esc(run.date)}</span></div>
    ${blocks || '<div class="ops-empty">No loads for today.</div>'}`;
}

async function viewInbounds() {
  const list = await ops('/inbound');
  const rows = (list || []).map((ib) => {
    const exp = (ib.lines || []).reduce((s, l) => s + (l.qty_expected || 0), 0);
    const rec = (ib.lines || []).reduce((s, l) => s + (l.qty_received || 0), 0);
    return `<tr data-go="inbound/${esc(ib.id)}"><td>${esc(ib.container_number || ib.id)}</td>
      <td>${pill(ib.status)}</td><td>${esc(ib.eta)}</td><td>${esc(ib.po_id || '')}</td>
      <td class="num">${rec}/${exp}</td></tr>`;
  });
  return `<div class="ops-row"><h1 class="ops-h1">Inbound</h1>
      <span class="ops-sub">Containers against POs — receive into RECEIVING, then putaway.</span></div>
    ${table(['Container', 'Status', 'ETA', 'PO', 'Recv'], rows)}`;
}

async function viewInbound(id) {
  const ib = await ops('/inbound/' + encodeURIComponent(id));
  const lines = (ib.lines || [])
    .map(
      (l) =>
        `<tr><td>${esc(l.code)} ${esc(l.size)}</td><td class="num">${l.qty_expected}</td><td class="num">${l.qty_received}</td></tr>`
    )
    .join('');
  return `<div class="ops-row">
      <div><h1 class="ops-h1">${esc(ib.container_number || ib.id)}</h1>${pill(ib.status)}</div>
      <div class="ops-btn-row">
        <button class="ops-btn" data-ib-arrive="${esc(ib.id)}">Mark arrived</button>
        <button class="ops-btn ops-btn-gold" data-ib-recv="${esc(ib.id)}">Receive all</button>
      </div>
    </div>
    <p class="ops-sub">PO ${esc(ib.po_id || '—')} · ETA ${esc(ib.eta || '—')}</p>
    ${table(['SKU', 'Expected', 'Received'], lines ? [lines] : [])}`;
}

async function viewPurchasing() {
  const list = await ops('/purchase-orders');
  const rows = (list || []).map(
    (p) =>
      `<tr data-go="purchasing/${esc(p.id)}"><td>${esc(p.id)}</td><td>${esc(p.vendor)}</td><td>${pill(p.status)}</td>
       <td>${esc(p.eta)}</td><td class="num">${money(p.landed_cost)}</td></tr>`
  );
  return `<div class="ops-row"><h1 class="ops-h1">Vendor POs</h1>
      <button class="ops-btn ops-btn-gold" id="ops-new-po">New PO</button></div>
    ${table(['PO', 'Vendor', 'Status', 'ETA', 'Landed'], rows)}
    <p class="ops-sub">Tommur / Lesso factory orders. Landed cost = lines + freight + duty.</p>`;
}

async function viewPo(id) {
  const po = await ops('/purchase-orders/' + encodeURIComponent(id));
  const lines = (po.lines || [])
    .map(
      (l) =>
        `<tr><td>${esc(l.code)} ${esc(l.size)}</td><td class="num">${l.qty_ordered}</td><td class="num">${l.qty_received}</td><td class="num">${money(l.unit_cost)}</td></tr>`
    )
    .join('');
  return `<div class="ops-row">
      <div><h1 class="ops-h1">${esc(po.id)}</h1>${pill(po.status)} · ${esc(po.vendor)}</div>
      <button class="ops-btn" data-po-send="${esc(po.id)}">Mark sent</button>
    </div>
    <p class="ops-sub">Freight ${money(po.freight)} · Duty ${money(po.duty)} · Landed ${money(po.landed_cost)}</p>
    ${table(['SKU', 'Ordered', 'Received', 'Cost'], lines ? [lines] : [])}`;
}

async function viewInventory() {
  const q = ($('ops-search') && $('ops-search').value) || '';
  const rows = await ops('/inventory?q=' + encodeURIComponent(q));
  const body = (rows || []).map(
    (p) => `<tr>
      <td>${esc(p.code)}<div class="ops-sub">${esc(p.description)} ${esc(p.size)}</div></td>
      <td class="num">${p.available}</td>
      <td class="num">${p.floor}</td>
      <td class="num">${p.allocated}</td>
      <td class="num">${p.inbound}</td>
      <td class="num">${p.atp}</td>
      <td><input class="ops-big-qty" style="width:72px;height:34px;font-size:16px" data-count-sku="${esc(p.code)}" data-count-size="${esc(p.size)}" placeholder="count"/></td>
    </tr>`
  );
  return `<div class="ops-row"><h1 class="ops-h1">Inventory / ATP</h1>
      <span class="ops-sub">Available is what the catalog can sell. Floor is warehouse location qty.</span></div>
    ${table(['SKU', 'Avail', 'Floor', 'Alloc', 'Inbound', 'ATP', 'Cycle count'], body)}`;
}

async function viewFinance() {
  const rows = await ops('/finance/ar');
  const open = (rows || []).filter((r) => ['unpaid', 'partial'].includes(String(r.paymentStatus || 'unpaid').toLowerCase()));
  const body = (rows || []).map(
    (r) => `<tr data-go="orders/${esc(r.id)}">
      <td>${esc(r.id)}</td><td>${esc(custName(r.customer))}</td>
      <td class="num">${money(r.total)}</td><td>${pill(r.paymentStatus)}</td><td>${pill(r.fulfillment)}</td></tr>`
  );
  const amt = open.reduce((s, r) => s + (Number(r.total) || 0), 0);
  return `<div class="ops-row"><h1 class="ops-h1">Accounts receivable</h1>
      <span class="ops-sub">${open.length} open · ${money(amt)}</span></div>
    ${table(['Order', 'Customer', 'Total', 'Pay', 'Fulfillment'], body)}
    <p class="ops-sub">Invoice-from-shipment: open a packed shipment and mark invoiced after POD. Banquest / Zelle still live on classic invoices.</p>`;
}

async function viewExceptions() {
  const list = await ops('/exceptions');
  const rows = (list || []).map(
    (e) => `<tr>
      <td>${pill(e.kind)}</td><td>${pill(e.status)}</td>
      <td>${esc(e.summary)}</td><td>${esc(e.entity_id)}</td>
      <td>${e.status === 'open' ? `<button class="ops-btn" data-exc="${e.id}">Resolve</button>` : ''}</td>
    </tr>`
  );
  return `<div class="ops-row"><h1 class="ops-h1">Exceptions</h1>
      <a class="ops-btn" href="#/customers">Credit holds</a></div>
    ${table(['Kind', 'Status', 'Summary', 'Doc', ''], rows)}`;
}

async function viewCustomers() {
  const list = await ops('/customers');
  const rows = (list || []).map(
    (u) => `<tr>
      <td>${esc(u.company || '')}</td><td>${esc(u.email)}</td>
      <td class="num">${money(u.credit_limit)}</td>
      <td>${pill(u.credit_hold ? 'hold' : 'ok')}</td>
      <td><button class="ops-btn" data-credit="${esc(u.email)}" data-hold="${u.credit_hold ? 0 : 1}">${u.credit_hold ? 'Release' : 'Hold'}</button></td>
    </tr>`
  );
  return `<div class="ops-row"><h1 class="ops-h1">Customers / credit</h1></div>
    ${table(['Company', 'Email', 'Limit', 'Hold', ''], rows)}`;
}

async function onAction(orderId, act) {
  flash('');
  try {
    if (act === 'confirm') await ops(`/orders/${encodeURIComponent(orderId)}/confirm`, { method: 'POST', body: '{}' });
    if (act === 'hold') {
      const reason = prompt('Hold reason') || 'Held';
      await ops(`/orders/${encodeURIComponent(orderId)}/hold`, { method: 'POST', body: JSON.stringify({ reason }) });
    }
    if (act === 'release-hold') await ops(`/orders/${encodeURIComponent(orderId)}/release-hold`, { method: 'POST', body: '{}' });
    if (act === 'allocate') await ops(`/orders/${encodeURIComponent(orderId)}/allocate`, { method: 'POST', body: '{}' });
    if (act === 'pick' || act === 'wave') {
      await ops(`/orders/${encodeURIComponent(orderId)}/wave`, { method: 'POST', body: '{}' });
      go('warehouse');
      return;
    }
    if (act === 'pack') {
      const r = await ops(`/orders/${encodeURIComponent(orderId)}/pack`, { method: 'POST', body: '{}' });
      if (r.shipmentId) go('shipments/' + r.shipmentId);
      else await render();
      return;
    }
    if (act === 'invoice') go('shipments');
    flash('Saved.');
    await render();
  } catch (e) {
    flash(e.message, true);
  }
}

function qtyForTask(id) {
  const el = document.querySelector(`[data-qty="${CSS.escape(id)}"]`);
  return el ? parseInt(el.value, 10) : undefined;
}

async function handleClick(e) {
  const t = e.target.closest('[data-go],[data-act],[data-task-done],[data-task-short],[data-ship-stage],[data-ship-invoice],[data-load-depart],[data-load-add],[data-pod],[data-refuse],[data-ib-arrive],[data-ib-recv],[data-po-send],[data-exc],[data-credit],#ops-new-load,#ops-new-po');
  if (!t) return;
  if (t.id === 'ops-new-load') {
    const r = await ops('/loads', { method: 'POST', body: JSON.stringify({ runDate: new Date().toISOString().slice(0, 10) }) });
    go('loads/' + r.load.id);
    return;
  }
  if (t.id === 'ops-new-po') {
    const vendor = prompt('Vendor (Tommur / Lesso / other)', 'Tommur');
    if (!vendor) return;
    const code = prompt('First SKU code (optional)') || '';
    const size = code ? prompt('Size') || '' : '';
    const qty = code ? parseInt(prompt('Qty') || '0', 10) : 0;
    const freight = parseFloat(prompt('Freight $') || '0') || 0;
    const body = { vendor, freight, lines: code && qty ? [{ code, size, qty }] : [] };
    const r = await ops('/purchase-orders', { method: 'POST', body: JSON.stringify(body) });
    go('purchasing/' + r.po.id);
    return;
  }
  if (t.dataset.go) {
    go(t.dataset.go);
    return;
  }
  if (t.dataset.act) return onAction(t.dataset.order, t.dataset.act);
  try {
    if (t.dataset.taskDone) {
      await ops(`/tasks/${t.dataset.taskDone}/complete`, { method: 'POST', body: JSON.stringify({ qty: qtyForTask(t.dataset.taskDone) }) });
    }
    if (t.dataset.taskShort) {
      await ops(`/tasks/${t.dataset.taskShort}/short`, { method: 'POST', body: JSON.stringify({ qty: qtyForTask(t.dataset.taskShort), note: 'short' }) });
    }
    if (t.dataset.shipStage) await ops(`/shipments/${t.dataset.shipStage}/stage`, { method: 'POST', body: '{}' });
    if (t.dataset.shipInvoice) await ops(`/shipments/${t.dataset.shipInvoice}/invoice`, { method: 'POST', body: '{}' });
    if (t.dataset.loadDepart) await ops(`/loads/${t.dataset.loadDepart}/depart`, { method: 'POST', body: '{}' });
    if (t.dataset.loadAdd) {
      const sel = $('ops-add-ship');
      if (!sel || !sel.value) return;
      await ops(`/loads/${t.dataset.loadAdd}/stops`, { method: 'POST', body: JSON.stringify({ shipmentId: sel.value }) });
    }
    if (t.dataset.pod) {
      const name = prompt('Signed by') || 'Received';
      await ops(`/stops/${t.dataset.pod}/pod`, { method: 'POST', body: JSON.stringify({ signerName: name }) });
    }
    if (t.dataset.refuse) {
      const note = prompt('Refuse reason') || 'Refused';
      await ops(`/stops/${t.dataset.refuse}/refuse`, { method: 'POST', body: JSON.stringify({ note }) });
    }
    if (t.dataset.ibArrive) await ops(`/inbound/${t.dataset.ibArrive}/arrive`, { method: 'POST', body: '{}' });
    if (t.dataset.ibRecv) await ops(`/inbound/${t.dataset.ibRecv}/receive`, { method: 'POST', body: '{}' });
    if (t.dataset.poSend) await ops(`/purchase-orders/${t.dataset.poSend}/send`, { method: 'POST', body: '{}' });
    if (t.dataset.exc) await ops(`/exceptions/${t.dataset.exc}/resolve`, { method: 'POST', body: '{}' });
    if (t.dataset.credit) {
      await ops(`/customers/${encodeURIComponent(t.dataset.credit)}/credit`, {
        method: 'POST',
        body: JSON.stringify({ creditHold: t.dataset.hold === '1' }),
      });
    }
    await render();
  } catch (err) {
    flash(err.message, true);
  }
}

async function handleCount(e) {
  const el = e.target.closest('[data-count-sku]');
  if (!el || e.key !== 'Enter') return;
  try {
    await ops('/counts', {
      method: 'POST',
      body: JSON.stringify({ code: el.dataset.countSku, size: el.dataset.countSize, qty: parseInt(el.value, 10) }),
    });
    flash('Count saved');
    await render();
  } catch (err) {
    flash(err.message, true);
  }
}

function openPalette() {
  $('ops-palette').classList.add('is-open');
  $('ops-palette').hidden = false;
  $('ops-palette-input').value = '';
  drawPalette('');
  $('ops-palette-input').focus();
}

function drawPalette(q) {
  const n = q.trim().toLowerCase();
  const items = PALETTE.filter((p) => !n || p.label.toLowerCase().includes(n) || p.id.includes(n));
  $('ops-palette-list').innerHTML = items
    .map((p, i) => `<button class="ops-pal-item${i === 0 ? ' is-on' : ''}" data-pal="${p.id}">${esc(p.label)}</button>`)
    .join('');
}

function bindPalette() {
  $('ops-cmd-open').addEventListener('click', openPalette);
  $('ops-palette').addEventListener('click', (e) => {
    if (e.target.id === 'ops-palette') {
      $('ops-palette').classList.remove('is-open');
      $('ops-palette').hidden = true;
    }
  });
  $('ops-palette-input').addEventListener('input', (e) => drawPalette(e.target.value));
  $('ops-palette-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pal]');
    if (!btn) return;
    const item = PALETTE.find((p) => p.id === btn.dataset.pal);
    $('ops-palette').classList.remove('is-open');
    $('ops-palette').hidden = true;
    if (item) item.run();
  });
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openPalette();
    }
    if (e.key === 'Escape') {
      $('ops-palette').classList.remove('is-open');
      $('ops-palette').hidden = true;
    }
  });
}

async function bootApp() {
  $('ops-login').hidden = true;
  $('ops-app').hidden = false;
  if (window.apbsBindThemeToggles) window.apbsBindThemeToggles();
  const roleSel = $('ops-role');
  roleSel.innerHTML = ROLES.map((r) => `<option value="${r}">${r}</option>`).join('');
  try {
    const me = await ops('/me');
    roleSel.value = me.role || 'owner';
  } catch (_) {}
  roleSel.addEventListener('change', async () => {
    await ops('/me', { method: 'POST', body: JSON.stringify({ role: roleSel.value }) });
  });
  $('ops-view').addEventListener('click', handleClick);
  $('ops-view').addEventListener('keydown', handleCount);
  $('ops-menu').addEventListener('click', () => $('ops-app').classList.toggle('is-nav'));
  bindPalette();
  $('ops-search').addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim();
    if (!q) return;
    const res = await ops('/search?q=' + encodeURIComponent(q));
    if (res.orders && res.orders[0]) return go('orders/' + res.orders[0].id);
    if (res.shipments && res.shipments[0]) return go('shipments/' + res.shipments[0].id);
    if (res.loads && res.loads[0]) return go('loads/' + res.loads[0].id);
    if (res.pos && res.pos[0]) return go('purchasing/' + res.pos[0].id);
    if (res.inbound && res.inbound[0]) return go('inbound/' + res.inbound[0].id);
    flash('No matches', true);
  });
  window.addEventListener('hashchange', render);
  await render();
}

window.opsDoLogin = async function opsDoLogin() {
  const err = $('ops-login-err');
  if (err) err.hidden = true;
  try {
    await login($('ops-pin').value);
    await bootApp();
  } catch (e) {
    if (err) {
      err.hidden = false;
      err.textContent = e.message;
    }
  }
};

async function start() {
  if (window.apbsShowTestBanner) window.apbsShowTestBanner();
  const themeSlot = document.querySelector('.ops-login-theme');
  if (themeSlot && window.apbsThemeToggleHtml && !themeSlot.querySelector('[data-theme-toggle]')) {
    themeSlot.innerHTML = window.apbsThemeToggleHtml();
  }
  if (window.apbsBindThemeToggles) window.apbsBindThemeToggles();
  $('ops-login-btn').addEventListener('click', window.opsDoLogin);
  $('ops-pin').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') window.opsDoLogin();
  });
  if (token()) {
    try {
      await ops('/me');
      return bootApp();
    } catch (_) {}
  }
  $('ops-login').hidden = false;
  $('ops-app').hidden = true;
}

start();
