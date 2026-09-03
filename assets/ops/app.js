import {
  $,
  custName,
  esc,
  flash,
  go,
  money,
  ops,
  pill,
  route,
  table,
  token,
} from './lib.js';
import {
  bindDesk,
  handleDeskChange,
  handleDeskClick,
  handleDeskInput,
  handleHitsClick,
  viewCustomer,
  viewCustomers,
  viewFinanceDesk,
  viewInboundDesk,
  viewInboundList,
  viewInventory,
  viewOrderDesk,
  viewOrdersList,
  viewPoDesk,
  viewProduct,
  viewPurchasingList,
  viewWarehouseStock,
} from './desk.js';

function API() {
  return (window.APBS_API_BASE || '').replace(/\/$/, '');
}

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
  { id: 'new-order', label: 'New sales order', run: () => go('orders/new') },
  { id: 'warehouse', label: 'Go to Warehouse tasks', run: () => go('warehouse') },
  { id: 'stock', label: 'Go to Warehouse stock', run: () => go('warehouse/stock') },
  { id: 'shipments', label: 'Go to Shipments', run: () => go('shipments') },
  { id: 'loads', label: 'Go to Loads', run: () => go('loads') },
  { id: 'driver', label: 'Go to Driver run', run: () => go('driver') },
  { id: 'inbound', label: 'Go to Inbound dock', run: () => go('inbound') },
  { id: 'new-inbound', label: 'New inbound container', run: () => go('inbound/new') },
  { id: 'purchasing', label: 'Go to Purchasing', run: () => go('purchasing') },
  { id: 'new-po', label: 'New vendor PO', run: () => go('purchasing/new') },
  { id: 'inventory', label: 'Go to Inventory / catalog', run: () => go('inventory') },
  { id: 'new-sku', label: 'New product SKU', run: () => go('inventory/new') },
  { id: 'finance', label: 'Go to Finance / AR', run: () => go('finance') },
  { id: 'exceptions', label: 'Go to Exceptions', run: () => go('exceptions') },
  { id: 'customers', label: 'Go to Customers', run: () => go('customers') },
  { id: 'new-customer', label: 'New customer', run: () => go('customers/new') },
];

const ROLES = ['owner', 'sales', 'warehouse', 'dispatch', 'driver', 'finance'];

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
  const { view, id, extra } = route();
  setNav(view === 'waves' ? 'warehouse' : view);
  const root = $('ops-view');
  try {
    if (view === 'inbox') return void (root.innerHTML = await viewInbox());
    if (view === 'orders' && id === 'new') return void (root.innerHTML = await viewOrderDesk('new', ''));
    if (view === 'orders' && id) return void (root.innerHTML = await viewOrderWorkspace(id));
    if (view === 'orders') return void (root.innerHTML = await viewOrdersList());
    if (view === 'warehouse' && id === 'stock') return void (root.innerHTML = await viewWarehouseStock());
    if (view === 'warehouse') return void (root.innerHTML = await viewWarehouse());
    if (view === 'waves' && id) return void (root.innerHTML = await viewWave(id));
    if (view === 'shipments' && id) return void (root.innerHTML = await viewShipment(id));
    if (view === 'shipments') return void (root.innerHTML = await viewShipments());
    if (view === 'loads' && id) return void (root.innerHTML = await viewLoad(id));
    if (view === 'loads') return void (root.innerHTML = await viewLoads());
    if (view === 'driver') return void (root.innerHTML = await viewDriver());
    if (view === 'inbound' && (id === 'new' || id)) return void (root.innerHTML = await viewInboundDesk(id || 'new'));
    if (view === 'inbound') return void (root.innerHTML = await viewInboundList());
    if (view === 'purchasing' && (id === 'new' || id)) return void (root.innerHTML = await viewPoDesk(id || 'new'));
    if (view === 'purchasing') return void (root.innerHTML = await viewPurchasingList());
    if (view === 'inventory' && id === 'new') return void (root.innerHTML = await viewProduct('new', extra));
    if (view === 'inventory' && id === 'edit') return void (root.innerHTML = await viewProduct('edit', extra));
    if (view === 'inventory') return void (root.innerHTML = await viewInventory());
    if (view === 'finance') return void (root.innerHTML = await viewFinanceDesk(id || 'open'));
    if (view === 'exceptions') return void (root.innerHTML = await viewExceptions());
    if (view === 'customers' && (id === 'new' || id)) return void (root.innerHTML = await viewCustomer(id || 'new'));
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
    ['onHold', 'On hold', 'customers'],
  ];
  return `
    <div class="ops-row"><h1 class="ops-h1">What needs you</h1>
      <span class="ops-sub">Work queues — not modules. Press ⌘K. New order / customer live in the palette.</span></div>
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

async function viewOrderWorkspace(id) {
  const o = await ops('/orders/' + encodeURIComponent(id));
  const lines = (o.items || [])
    .map(
      (it) => `<tr>
        <td>${esc(it.code)}<div class="ops-sub">${esc(it.description)} ${esc(it.size)}</div></td>
        <td class="num">${it.qty}</td>
        <td class="num">${it.qtyAllocated}</td>
        <td class="num">${it.qtyPicked}</td>
        <td class="num">${it.qtyShipped}</td>
        <td class="num">${it.qtyRemaining}</td>
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
  const fulfillmentHtml = `
    <div class="ops-grid-2" style="margin-top:16px">
      <div class="ops-card">
        <h3>Fulfillment</h3>
        ${table(['SKU', 'Ord', 'Alloc', 'Pick', 'Ship', 'Left', 'ATP'], lines ? [lines] : [])}
      </div>
      <div>
        <div class="ops-card" style="margin-bottom:12px"><h3>Outbound</h3>${ships}</div>
        <div class="ops-card"><h3>Timeline</h3><ul class="ops-timeline">${tl || '<li>No events yet</li>'}</ul></div>
      </div>
    </div>`;
  return viewOrderDesk(id, fulfillmentHtml);
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
      <div class="ops-tabs">
        <a href="#/warehouse" class="is-on">Tasks</a>
        <a href="#/warehouse/stock">Stock</a>
      </div></div>
    <p class="ops-sub">Phone-sized tasks. Scan / type qty, tap Done. Receive and adjust on Stock.</p>
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
      <td>${pill(s.status)}${shipmentInvoiced(s) ? ' ' + pill('invoiced') : ''}</td>
      <td>${esc(s.load_id || '—')}</td></tr>`
  );
  return `<div class="ops-row"><h1 class="ops-h1">Outbound shipments</h1>
    <span class="ops-sub">First-class OB documents — not JSON on the order.</span></div>
    ${table(['Shipment', 'Order', 'Customer', 'Status', 'Load'], rows)}`;
}

function shipmentInvoiced(s) {
  return !!(s && (s.invoiced_at || (s.invoice_doc_id && String(s.invoice_doc_id).trim())));
}

async function viewShipment(id) {
  const s = await ops('/shipments/' + encodeURIComponent(id));
  const lines = (s.lines || [])
    .map((l) => `<tr><td>${esc(l.code)} ${esc(l.size)}</td><td>${esc(l.description)}</td><td class="num">${l.qty}</td><td class="num">${money(l.unit_price)}</td></tr>`)
    .join('');
  const invoiced = shipmentInvoiced(s);
  return `<div class="ops-row">
      <div><h1 class="ops-h1">${esc(s.id)}</h1>
        <div class="ops-sub">Order <a href="#/orders/${esc(s.order_id)}">${esc(s.order_id)}</a> · ${pill(s.status)}${invoiced ? ' ' + pill('invoiced') : ''}</div></div>
      <div class="ops-btn-row">
        <button class="ops-btn" data-ship-stage="${esc(s.id)}">Stage dock</button>
        ${
          invoiced
            ? `<span class="ops-sub">Invoiced${s.invoiced_at ? ' ' + esc(String(s.invoiced_at).slice(0, 10)) : ''}</span>`
            : `<button class="ops-btn ops-btn-gold" data-ship-invoice="${esc(s.id)}">Mark invoiced</button>`
        }
        <a class="ops-btn" href="#/orders/${esc(s.order_id)}">Invoice / email</a>
      </div>
    </div>
    <div class="ops-card">
      <h3>Lines</h3>
      ${table(['SKU', 'Desc', 'Qty', 'Price'], lines ? [lines] : [])}
      <p class="ops-sub" style="margin-top:10px">Load ${esc(s.load_id || 'not assigned')} · ${esc(s.method || '')}. Mark invoiced flags the shipment; use Invoice / email to send the PDF.</p>
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
      <a class="ops-btn" href="#/customers">Customers / credit</a></div>
    ${table(['Kind', 'Status', 'Summary', 'Doc', ''], rows)}`;
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
    if (act === 'invoice') {
      const el = document.getElementById('doc-type');
      if (el) el.value = 'invoice';
      flash('Use Documents on this order to email or print the invoice.');
      return;
    }
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
  if (handleHitsClick(e)) return;
  const t = e.target.closest(
    '[data-go],[data-act],[data-task-done],[data-task-short],[data-ship-stage],[data-ship-invoice],[data-load-depart],[data-load-add],[data-pod],[data-refuse],[data-ib-arrive],[data-ib-recv],[data-po-send],[data-exc],[data-credit],#ops-new-load,[data-save-customer],[data-del-customer],[data-save-address],[data-del-addr],[data-save-product],[data-del-product],[data-export-csv],[data-stock-receive],[data-stock-adjust],[data-save-order],[data-add-order-addr],[data-del-order],[data-add-hit],[data-rm-line],[data-mark-paid],[data-banquest],[data-send-doc],[data-print-doc],[data-save-po],[data-del-po],[data-add-poline],[data-rm-poline],[data-save-inbound],[data-add-ibline],[data-rm-ibline],[data-ib-recv-form],[data-ar-filter]'
  );
  if (!t) return;
  if (await handleDeskClick(t)) return;
  if (t.id === 'ops-new-load') {
    const r = await ops('/loads', { method: 'POST', body: JSON.stringify({ runDate: new Date().toISOString().slice(0, 10) }) });
    go('loads/' + r.load.id);
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
    if (t.dataset.shipInvoice) {
      await ops(`/shipments/${t.dataset.shipInvoice}/invoice`, { method: 'POST', body: '{}' });
      await render();
      flash('Marked invoiced');
      return;
    }
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
  bindDesk({ render });
  $('ops-view').addEventListener('click', handleClick);
  $('ops-view').addEventListener('keydown', handleCount);
  $('ops-view').addEventListener('change', async (e) => {
    if (await handleDeskChange(e)) return;
  });
  $('ops-view').addEventListener('input', (e) => {
    handleDeskInput(e);
  });
  $('ops-menu').addEventListener('click', () => $('ops-app').classList.toggle('is-nav'));
  bindPalette();
  $('ops-search').addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim();
    if (!q) return;
    const { view } = route();
    if (view === 'inventory' || view === 'customers' || view === 'orders') {
      await render();
      return;
    }
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
