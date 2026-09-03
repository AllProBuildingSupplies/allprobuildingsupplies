/** All Pro OS Phone — separate shell. Same Worker APIs as desktop ops.html. */

import {
  $,
  api,
  confirmAct,
  esc,
  findProduct,
  flash,
  go,
  invalidateCatalog,
  loadCatalog,
  num,
  ops,
  token,
  val,
} from '../ops/lib.js';
import {
  ibLineTemplate,
  poLineTemplate,
  viewCustomer,
  viewCustomers,
  viewDriver,
  viewExceptions,
  viewFinance,
  viewFloorStock,
  viewFloorTasks,
  viewInboundDesk,
  viewInboundList,
  viewInventory,
  viewLoad,
  viewLoads,
  viewMore,
  viewOrderDesk,
  viewOrdersList,
  viewPoDesk,
  viewProduct,
  viewPurchasingList,
  viewShipment,
  viewShipments,
  viewToday,
} from './views.js';

const ROLES = ['owner', 'sales', 'warehouse', 'dispatch', 'driver', 'finance'];

function API() {
  return (window.APBS_API_BASE || '').replace(/\/$/, '');
}

function keepQuery(href) {
  const q = location.search || '';
  if (!q) return href;
  if (href.includes('?')) return href;
  return href + q;
}

function mRoute() {
  const hash = (location.hash || '#/today').replace(/^#/, '');
  const parts = hash.split('/').filter(Boolean);
  return { parts, view: parts[0] || 'today', id: parts[1] || '', extra: parts.slice(2) };
}

function setTab(view) {
  document.querySelectorAll('.m-tabbar [data-tab]').forEach((a) => {
    a.classList.toggle('is-on', a.getAttribute('data-tab') === view);
  });
  const titles = {
    today: ['Today', 'What needs you'],
    orders: ['Orders', 'Sales desk'],
    floor: ['Floor', 'Warehouse & dock'],
    run: ['Run', 'Truck & POD'],
    more: ['More', 'Office tools'],
  };
  const t = titles[view] || titles.today;
  $('m-kicker').textContent = t[1];
  $('m-title').textContent = t[0];
}

function qtyForTask(id) {
  const el = document.querySelector(`[data-qty="${CSS.escape(id)}"]`);
  return el ? parseInt(el.value, 10) : undefined;
}

function collectOrderPayload() {
  const items = [];
  document.querySelectorAll('[data-oline]').forEach((row) => {
    const code = row.querySelector('[name=code]').value.trim();
    const qty = parseInt(row.querySelector('[name=qty]').value, 10) || 0;
    if (!code || qty < 1) return;
    items.push({
      code,
      size: row.querySelector('[name=size]').value.trim(),
      description: row.querySelector('[name=description]').value.trim(),
      qty,
      qtyShipped: parseInt(row.querySelector('[name=qtyShipped]').value, 10) || 0,
      unitPrice: parseFloat(row.querySelector('[name=unitPrice]').value) || 0,
    });
  });
  const name = val('o-name');
  const company = val('o-company');
  const method = val('o-method') || 'delivery';
  const addr = val('o-address');
  const saveAddr = $('o-save-addr') && $('o-save-addr').checked && method !== 'pickup' && addr && addr.toUpperCase() !== 'PICKUP';
  return {
    id: val('o-id'),
    status: val('o-status') || 'pending',
    placedAt: val('o-placed') || new Date().toISOString(),
    customer: {
      name: name || company,
      company,
      email: val('o-email').toLowerCase(),
      phone: val('o-phone'),
    },
    delivery: { method, address: addr },
    po: val('o-po'),
    notes: val('o-notes'),
    paymentStatus: val('o-pay') || 'unpaid',
    paymentMethod: '',
    paymentNote: '',
    paidAt: null,
    shipments: [],
    saveAddress: !!saveAddr,
    items,
  };
}

function collectIbLines() {
  const lines = [];
  document.querySelectorAll('[data-ibline]').forEach((row) => {
    const code = (row.querySelector('[name=code]') || {}).value;
    const qty = parseInt((row.querySelector('[name=qty]') || {}).value, 10) || 0;
    if (!String(code || '').trim() || qty < 1) return;
    const recvEl = row.querySelector('[name=recv]');
    lines.push({
      code: String(code).trim(),
      size: String((row.querySelector('[name=size]') || {}).value || '').trim(),
      qty,
      recvNow: recvEl ? parseInt(recvEl.value, 10) || 0 : 0,
    });
  });
  return lines;
}

function collectPoLines() {
  const lines = [];
  document.querySelectorAll('[data-poline]').forEach((row) => {
    const code = (row.querySelector('[name=code]') || {}).value;
    const qty = parseInt((row.querySelector('[name=qty]') || {}).value, 10) || 0;
    if (!String(code || '').trim() || qty < 1) return;
    lines.push({
      code: String(code).trim(),
      size: String((row.querySelector('[name=size]') || {}).value || '').trim(),
      description: String((row.querySelector('[name=description]') || {}).value || '').trim(),
      qty,
      unitCost: parseFloat((row.querySelector('[name=unitCost]') || {}).value) || 0,
    });
  });
  return lines;
}

function closeSheet() {
  $('m-sheet').hidden = true;
  $('m-sheet-card').innerHTML = '';
}

function openSheet(html) {
  $('m-sheet-card').innerHTML = html;
  $('m-sheet').hidden = false;
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

let renderGen = 0;

async function render() {
  const gen = ++renderGen;
  flash('');
  const { view, id, extra } = mRoute();
  const tab = ['today', 'orders', 'floor', 'run', 'more'].includes(view) ? view : 'today';
  setTab(tab);
  const root = $('ops-view');
  try {
    let html = '';
    if (view === 'today' || !view) html = await viewToday();
    else if (view === 'orders' && id === 'new') html = await viewOrderDesk('new');
    else if (view === 'orders' && id) html = await viewOrderDesk(id);
    else if (view === 'orders') html = await viewOrdersList();
    else if (view === 'floor' && id === 'dock' && extra[0]) html = await viewInboundDesk(extra[0]);
    else if (view === 'floor' && id === 'dock') html = await viewInboundList();
    else if (view === 'floor' && id === 'stock') html = await viewFloorStock();
    else if (view === 'floor') html = await viewFloorTasks();
    else if (view === 'run' && id === 'loads' && extra[0]) html = await viewLoad(extra[0]);
    else if (view === 'run' && id === 'loads') html = await viewLoads();
    else if (view === 'run' && id === 'shipments' && extra[0]) html = await viewShipment(extra[0]);
    else if (view === 'run' && id === 'shipments') html = await viewShipments();
    else if (view === 'run') html = await viewDriver();
    else if (view === 'more' && id === 'purchasing' && extra[0]) html = await viewPoDesk(extra[0]);
    else if (view === 'more' && id === 'purchasing') html = await viewPurchasingList();
    else if (view === 'more' && id === 'inventory' && extra[0] === 'edit') html = await viewProduct('edit', extra.slice(1));
    else if (view === 'more' && id === 'inventory' && extra[0] === 'new') html = await viewProduct('new', []);
    else if (view === 'more' && id === 'inventory') html = await viewInventory();
    else if (view === 'more' && id === 'finance') html = await viewFinance(extra[0] || 'open');
    else if (view === 'more' && id === 'customers' && extra[0]) html = await viewCustomer(extra[0]);
    else if (view === 'more' && id === 'customers') html = await viewCustomers();
    else if (view === 'more' && id === 'exceptions') html = await viewExceptions();
    else if (view === 'more') html = await viewMore();
    else html = await viewToday();
    if (gen !== renderGen) return;
    root.innerHTML = html;
    if (view === 'more' && !id) {
      bindRole();
      const desk = $('m-desk-link');
      if (desk) desk.href = keepQuery('ops.html');
    }
  } catch (e) {
    if (gen !== renderGen) return;
    root.innerHTML = `<div class="m-empty">${esc(e.message)}</div>`;
  }
}

async function after(okMsg) {
  await render();
  if (okMsg) flash(okMsg);
}

async function onAction(orderId, act) {
  if (act === 'confirm') await ops(`/orders/${encodeURIComponent(orderId)}/confirm`, { method: 'POST', body: '{}' });
  if (act === 'hold') {
    const reason = val('m-sheet-note') || 'Held';
    await ops(`/orders/${encodeURIComponent(orderId)}/hold`, { method: 'POST', body: JSON.stringify({ reason }) });
  }
  if (act === 'release-hold') await ops(`/orders/${encodeURIComponent(orderId)}/release-hold`, { method: 'POST', body: '{}' });
  if (act === 'allocate') await ops(`/orders/${encodeURIComponent(orderId)}/allocate`, { method: 'POST', body: '{}' });
  if (act === 'pick' || act === 'wave') {
    await ops(`/orders/${encodeURIComponent(orderId)}/wave`, { method: 'POST', body: '{}' });
    go('floor');
    flash('Wave released — pick on Floor');
    return;
  }
  if (act === 'pack') {
    const r = await ops(`/orders/${encodeURIComponent(orderId)}/pack`, { method: 'POST', body: '{}' });
    if (r.shipmentId) {
      go('run/shipments/' + r.shipmentId);
      flash('Packed');
      return;
    }
  }
  await after('Saved');
}

async function fillCustomerFromSelect() {
  const email = val('o-cust');
  if (!email) return;
  const users = await ops('/customers');
  const u = (users || []).find((x) => String(x.email).toLowerCase() === email.toLowerCase());
  if (!u) return;
  if ($('o-name')) $('o-name').value = [u.fname, u.lname].filter(Boolean).join(' ');
  if ($('o-company')) $('o-company').value = u.company || '';
  if ($('o-email')) $('o-email').value = u.email || '';
  if ($('o-phone')) $('o-phone').value = u.phone || '';
  try {
    const addr = await api('/admin/addresses?email=' + encodeURIComponent(email));
    const list = addr.addresses || [];
    const sel = $('o-saved-addr');
    if (sel) {
      sel.innerHTML =
        '<option value="">— Type or pick saved —</option>' +
        list
          .map((a) => {
            const full = a.fullAddress || a.full_address || '';
            return `<option value="${esc(full)}">${esc([a.label, full].filter(Boolean).join(' — '))}</option>`;
          })
          .join('');
    }
    const def = list.find((a) => a.isDefault || a.is_default) || list[0];
    if (def && $('o-address')) {
      const full = def.fullAddress || def.full_address || '';
      $('o-address').value = full;
      if (sel) sel.value = full;
    }
  } catch (_) {}
}

async function searchSkuHits() {
  const q = val('sku-q').toLowerCase();
  const box = $('sku-hits');
  if (!box) return;
  if (q.length < 2) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  const catalog = await loadCatalog();
  const hits = catalog
    .filter((p) => [p.code, p.description, p.size, p.tommur_code, p.lesso_code].join(' ').toLowerCase().includes(q))
    .slice(0, 8);
  box.hidden = !hits.length;
  box.innerHTML = hits
    .map(
      (p, i) =>
        `<button type="button" class="${i === 0 ? 'is-on' : ''}" data-code="${esc(p.code)}" data-size="${esc(p.size || '')}">
          <code>${esc(p.code)}</code> ${esc(p.size || '')} · ${esc(p.description || '')}</button>`
    )
    .join('');
}

async function addCatalogHit() {
  const hit = document.querySelector('#sku-hits button.is-on') || document.querySelector('#sku-hits button');
  const catalog = await loadCatalog();
  let prod = null;
  if (hit) prod = findProduct(catalog, hit.dataset.code, hit.dataset.size);
  if (!prod) throw new Error('Pick a product from search');
  const qty = parseInt(val('sku-qty') || '1', 10) || 1;
  const wrap = $('ops-lines-body');
  if (!wrap) throw new Error('Lines missing');
  wrap.insertAdjacentHTML(
    'beforeend',
    `<div class="m-line" data-oline>
      <div class="m-row"><strong>${esc(prod.code)}</strong><button type="button" class="m-icon-btn" data-rm-line aria-label="Remove">×</button></div>
      <div class="m-meta">${esc(prod.description || '')} ${esc(prod.size || '')} · $${Number(prod.price || 0).toFixed(2)}</div>
      <input type="hidden" name="code" value="${esc(prod.code)}">
      <input type="hidden" name="size" value="${esc(prod.size || '')}">
      <input type="hidden" name="description" value="${esc(prod.description || '')}">
      <input type="hidden" name="unitPrice" value="${esc(prod.price || 0)}">
      <input type="hidden" name="qtyShipped" value="0">
      <label>Qty <div class="m-stepper">
        <button type="button" data-step="-1">−</button>
        <input class="data-input" name="qty" type="number" value="${qty}" min="1">
        <button type="button" data-step="1">+</button>
      </div></label>
    </div>`
  );
  if ($('sku-q')) $('sku-q').value = '';
  if ($('sku-hits')) $('sku-hits').hidden = true;
}

async function saveCustomer(mode) {
  const fname = val('c-fname');
  const lname = val('c-lname');
  const email = val('c-email').toLowerCase();
  if (!fname || !lname || !email) throw new Error('First name, last name, and email are required');
  const plain = val('c-password');
  const payload = {
    fname,
    lname,
    email,
    phone: val('c-phone'),
    company: val('c-company'),
    status: val('c-status') || 'pending',
    canOrderPieces: val('c-pcs') === 'true',
  };
  if (mode === 'new') {
    payload.id = 'USR-' + Date.now().toString(36).toUpperCase();
    payload.password = await window.apbsHashPassword(plain || 'Welcome1!');
    const r = await api('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
    const credit = num('c-credit', 0);
    if (credit) {
      await ops(`/customers/${encodeURIComponent(email)}/credit`, {
        method: 'POST',
        body: JSON.stringify({ creditLimit: credit }),
      });
    }
    flash('Customer created');
    go('more/customers/' + (r.id || payload.id));
    return;
  }
  payload.id = val('c-id');
  payload.password = plain ? await window.apbsHashPassword(plain) : '********';
  await api('/admin/users', { method: 'PUT', body: JSON.stringify(payload) });
  await ops(`/customers/${encodeURIComponent(email)}/credit`, {
    method: 'POST',
    body: JSON.stringify({ creditLimit: num('c-credit', 0) }),
  });
  await after('Customer saved');
}

async function handleClick(e) {
  const stepBtn = e.target.closest('[data-step]');
  if (stepBtn) {
    const wrap = stepBtn.closest('.m-stepper');
    const input = wrap && wrap.querySelector('input');
    if (input) {
      const n = (parseInt(input.value, 10) || 0) + parseInt(stepBtn.dataset.step, 10);
      input.value = Math.max(0, n);
    }
    e.preventDefault();
    return;
  }
  const t = e.target.closest(
    '[data-go],[data-act],[data-task-done],[data-task-short],[data-ship-stage],[data-ship-invoice],[data-load-depart],[data-load-add],[data-pod],[data-refuse],[data-ib-arrive],[data-ib-recv],[data-po-send],[data-exc],[data-credit],#ops-new-load,[data-save-customer],[data-save-address],[data-del-addr],[data-save-product],[data-stock-receive],[data-stock-adjust],[data-save-order],[data-add-hit],[data-rm-line],[data-mark-paid],[data-save-po],[data-add-poline],[data-rm-poline],[data-save-inbound],[data-add-ibline],[data-ib-recv-form],[data-count-save],[data-sheet-ok],[data-sheet-cancel],[data-sheet-refuse]'
  );
  if (!t) return;
  if (t.dataset.go) {
    go(t.dataset.go);
    return;
  }
  try {
    if (t.id === 'ops-new-load') {
      const r = await ops('/loads', { method: 'POST', body: JSON.stringify({ runDate: new Date().toISOString().slice(0, 10) }) });
      go('run/loads/' + r.load.id);
      return;
    }
    if (t.dataset.act) {
      if (t.dataset.act === 'hold') {
        openSheet(`<h2>Hold order</h2><label>Reason<input class="data-input" id="m-sheet-note" value="Held"></label>
          <div class="m-actions"><button class="m-btn m-btn-gold" data-sheet-ok="hold" data-order="${esc(t.dataset.order)}">Hold</button>
          <button class="m-btn" data-sheet-cancel>Cancel</button></div>`);
        return;
      }
      await onAction(t.dataset.order, t.dataset.act);
      return;
    }
    if (t.dataset.taskDone) {
      await ops(`/tasks/${t.dataset.taskDone}/complete`, { method: 'POST', body: JSON.stringify({ qty: qtyForTask(t.dataset.taskDone) }) });
      await after('Task done');
      return;
    }
    if (t.dataset.taskShort) {
      await ops(`/tasks/${t.dataset.taskShort}/short`, { method: 'POST', body: JSON.stringify({ qty: qtyForTask(t.dataset.taskShort), note: 'short' }) });
      await after('Marked short');
      return;
    }
    if (t.dataset.shipStage) {
      await ops(`/shipments/${t.dataset.shipStage}/stage`, { method: 'POST', body: '{}' });
      await after('Staged');
      return;
    }
    if (t.dataset.shipInvoice) {
      await ops(`/shipments/${t.dataset.shipInvoice}/invoice`, { method: 'POST', body: '{}' });
      await after('Marked invoiced');
      return;
    }
    if (t.dataset.loadDepart) {
      await ops(`/loads/${t.dataset.loadDepart}/depart`, { method: 'POST', body: '{}' });
      await after('Departed');
      return;
    }
    if (t.dataset.loadAdd) {
      const sel = $('ops-add-ship');
      if (!sel || !sel.value) return;
      await ops(`/loads/${t.dataset.loadAdd}/stops`, { method: 'POST', body: JSON.stringify({ shipmentId: sel.value }) });
      await after('Stop added');
      return;
    }
    if (t.dataset.pod) {
      openSheet(`<h2>Proof of delivery</h2>
        <label>Signed by<input class="data-input" id="m-sheet-note" value="Received" autocomplete="name"></label>
        <div class="m-actions">
          <button class="m-btn m-btn-gold" data-sheet-ok="pod" data-stop="${esc(t.dataset.pod)}">Delivered</button>
          <button class="m-btn" data-sheet-cancel>Cancel</button>
        </div>`);
      return;
    }
    if (t.dataset.refuse) {
      openSheet(`<h2>Refuse stop</h2>
        <label>Reason<input class="data-input" id="m-sheet-note" value="Refused"></label>
        <div class="m-actions">
          <button class="m-btn m-btn-danger" data-sheet-ok="refuse" data-stop="${esc(t.dataset.refuse)}">Refuse</button>
          <button class="m-btn" data-sheet-cancel>Cancel</button>
        </div>`);
      return;
    }
    if (t.dataset.sheetCancel != null) {
      closeSheet();
      return;
    }
    if (t.dataset.sheetOk === 'pod') {
      const name = val('m-sheet-note') || 'Received';
      closeSheet();
      await ops(`/stops/${t.dataset.stop}/pod`, { method: 'POST', body: JSON.stringify({ signerName: name }) });
      await after('POD saved');
      return;
    }
    if (t.dataset.sheetOk === 'refuse') {
      const note = val('m-sheet-note') || 'Refused';
      closeSheet();
      await ops(`/stops/${t.dataset.stop}/refuse`, { method: 'POST', body: JSON.stringify({ note }) });
      await after('Marked refused');
      return;
    }
    if (t.dataset.sheetOk === 'hold') {
      closeSheet();
      await onAction(t.dataset.order, 'hold');
      return;
    }
    if (t.dataset.ibArrive) {
      await ops(`/inbound/${t.dataset.ibArrive}/arrive`, { method: 'POST', body: '{}' });
      await after('Marked arrived');
      return;
    }
    if (t.dataset.ibRecv) {
      await ops(`/inbound/${t.dataset.ibRecv}/receive`, { method: 'POST', body: '{}' });
      await after('Received into RECEIVING');
      return;
    }
    if (t.dataset.ibRecvForm) {
      const lines = [];
      document.querySelectorAll('[data-ibline]').forEach((row) => {
        const qty = parseInt((row.querySelector('[name=recv]') || {}).value, 10) || 0;
        if (qty < 1) return;
        lines.push({
          code: String((row.querySelector('[name=code]') || {}).value || '').trim(),
          size: String((row.querySelector('[name=size]') || {}).value || '').trim(),
          qty,
        });
      });
      if (!lines.length) throw new Error('Enter receive qty on at least one line');
      await ops(`/inbound/${encodeURIComponent(t.dataset.ibRecvForm)}/receive`, {
        method: 'POST',
        body: JSON.stringify({ lines }),
      });
      await after('Received into RECEIVING');
      return;
    }
    if (t.dataset.saveInbound) {
      const lines = collectIbLines();
      const body = {
        id: t.dataset.saveInbound === 'new' ? undefined : t.dataset.saveInbound,
        containerNumber: val('ib-container'),
        carrier: val('ib-carrier'),
        eta: val('ib-eta'),
        poId: val('ib-po'),
        notes: val('ib-notes'),
        lines,
      };
      const r = await ops('/inbound', { method: 'POST', body: JSON.stringify(body) });
      go('floor/dock/' + (r.inbound && r.inbound.id ? r.inbound.id : t.dataset.saveInbound));
      flash('Inbound saved');
      return;
    }
    if (t.dataset.addIbline != null) {
      const box = $('ops-ib-lines');
      if (box) box.insertAdjacentHTML('beforeend', ibLineTemplate());
      return;
    }
    if (t.dataset.poSend) {
      await ops(`/purchase-orders/${t.dataset.poSend}/send`, { method: 'POST', body: '{}' });
      await after('Marked sent');
      return;
    }
    if (t.dataset.savePo) {
      const body = {
        vendor: val('po-vendor'),
        eta: val('po-eta'),
        freight: num('po-freight', 0),
        duty: num('po-duty', 0),
        notes: val('po-notes'),
        lines: collectPoLines(),
      };
      if (t.dataset.savePo === 'new') {
        const r = await ops('/purchase-orders', { method: 'POST', body: JSON.stringify(body) });
        go('more/purchasing/' + r.po.id);
        flash('PO created');
      } else {
        await ops('/purchase-orders/' + encodeURIComponent(t.dataset.savePo), { method: 'PUT', body: JSON.stringify(body) });
        await after('PO saved');
      }
      return;
    }
    if (t.dataset.addPoline != null) {
      const box = $('ops-po-lines');
      if (box) box.insertAdjacentHTML('beforeend', poLineTemplate());
      return;
    }
    if (t.dataset.rmPoline != null) {
      const row = t.closest('[data-poline]');
      if (row) row.remove();
      return;
    }
    if (t.dataset.exc) {
      await ops(`/exceptions/${t.dataset.exc}/resolve`, { method: 'POST', body: '{}' });
      await after('Resolved');
      return;
    }
    if (t.dataset.credit) {
      await ops(`/customers/${encodeURIComponent(t.dataset.credit)}/credit`, {
        method: 'POST',
        body: JSON.stringify({ creditHold: t.dataset.hold === '1' }),
      });
      await after('Credit updated');
      return;
    }
    if (t.dataset.saveCustomer) {
      await saveCustomer(t.dataset.saveCustomer);
      return;
    }
    if (t.dataset.saveAddress) {
      const full = val('a-full');
      if (!full) throw new Error('Address is required');
      await api('/admin/addresses', {
        method: 'POST',
        body: JSON.stringify({
          email: t.dataset.saveAddress,
          label: val('a-label'),
          phone: val('a-phone'),
          fullAddress: full,
          isDefault: $('a-default') && $('a-default').checked,
        }),
      });
      await after('Address saved');
      return;
    }
    if (t.dataset.delAddr) {
      await api('/admin/addresses?id=' + encodeURIComponent(t.dataset.delAddr), { method: 'DELETE' });
      await after('Address deleted');
      return;
    }
    if (t.dataset.saveProduct != null) {
      const p = {
        code: val('p-code'),
        size: val('p-size'),
        description: val('p-desc'),
        pack: num('p-pack', 0),
        qty: num('p-qty', 0),
        price: num('p-price', 0),
      };
      if (!p.code || !p.size) throw new Error('Code and size are required');
      await api('/admin/products', { method: 'PUT', body: JSON.stringify(p) });
      invalidateCatalog();
      go('more/inventory/edit/' + encodeURIComponent(p.code) + '/' + encodeURIComponent(p.size));
      flash('Product saved');
      return;
    }
    if (t.dataset.stockReceive != null) {
      const code = val('st-code');
      const size = val('st-size');
      const qty = num('st-qty', 0);
      if (!code || !size || qty < 1) throw new Error('SKU, size, and positive qty required');
      await api('/admin/products/receive', { method: 'POST', body: JSON.stringify({ items: [{ code, size, qty }] }) });
      invalidateCatalog();
      await after('Received ' + qty);
      return;
    }
    if (t.dataset.stockAdjust) {
      const code = val('st-code');
      const size = val('st-size');
      let delta = num('st-qty', 0);
      if (t.dataset.stockAdjust === 'minus') delta = -Math.abs(delta);
      if (!code || !size || !delta) throw new Error('SKU, size, and non-zero qty required');
      await api('/admin/products/adjust', { method: 'POST', body: JSON.stringify({ items: [{ code, size, delta }] }) });
      invalidateCatalog();
      await after('Adjusted ' + delta);
      return;
    }
    if (t.dataset.saveOrder != null) {
      const payload = collectOrderPayload();
      if (!payload.customer.email && !payload.customer.name) throw new Error('Customer name or email is required');
      const r = await api('/admin/orders', { method: 'POST', body: JSON.stringify(payload) });
      go('orders/' + (r.orderId || payload.id));
      flash('Order saved');
      return;
    }
    if (t.dataset.addHit != null) {
      await addCatalogHit();
      return;
    }
    if (t.dataset.rmLine != null) {
      const row = t.closest('[data-oline]');
      if (row) row.remove();
      return;
    }
    if (t.dataset.markPaid) {
      await api('/admin/orders/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ id: t.dataset.markPaid, paymentStatus: 'paid', paymentMethod: 'other' }),
      });
      await after('Marked paid');
      return;
    }
    if (t.dataset.countSave) {
      const input = document.querySelector(`[data-count-sku="${CSS.escape(t.dataset.countSave)}"][data-count-size="${CSS.escape(t.dataset.size || '')}"]`);
      const qty = input ? parseInt(input.value, 10) : NaN;
      if (!Number.isFinite(qty)) throw new Error('Enter a count qty');
      await ops('/counts', { method: 'POST', body: JSON.stringify({ code: t.dataset.countSave, size: t.dataset.size, qty }) });
      await after('Count saved');
      return;
    }
  } catch (err) {
    flash(err.message, true);
  }
}

function bindRole() {
  const roleSel = $('ops-role');
  if (!roleSel || roleSel.dataset.bound) return;
  roleSel.dataset.bound = '1';
  roleSel.innerHTML = ROLES.map((r) => `<option value="${r}">${r}</option>`).join('');
  ops('/me')
    .then((me) => {
      roleSel.value = me.role || 'owner';
    })
    .catch(() => {});
  roleSel.addEventListener('change', async () => {
    await ops('/me', { method: 'POST', body: JSON.stringify({ role: roleSel.value }) });
    flash('Role set to ' + roleSel.value);
  });
}

async function bootApp() {
  $('ops-login').hidden = true;
  $('ops-app').hidden = false;
  if (window.apbsBindThemeToggles) window.apbsBindThemeToggles();
  const deskLogin = $('m-desk-from-login');
  if (deskLogin) deskLogin.href = keepQuery('ops.html');
  $('ops-view').addEventListener('click', handleClick);
  $('m-sheet').addEventListener('click', (e) => {
    if (e.target.id === 'm-sheet') closeSheet();
    else handleClick(e);
  });
  $('ops-view').addEventListener('change', async (e) => {
    if (e.target && e.target.id === 'o-cust') await fillCustomerFromSelect();
    if (e.target && e.target.id === 'o-saved-addr' && $('o-address') && e.target.value) $('o-address').value = e.target.value;
    if (e.target && e.target.id === 'o-method' && e.target.value === 'pickup' && $('o-address')) $('o-address').value = 'PICKUP';
  });
  $('ops-view').addEventListener('input', (e) => {
    if (e.target && e.target.id === 'sku-q') searchSkuHits();
  });
  $('ops-view').addEventListener('click', (e) => {
    const hit = e.target.closest('#sku-hits button');
    if (!hit) return;
    document.querySelectorAll('#sku-hits button').forEach((b) => b.classList.toggle('is-on', b === hit));
  });
  $('m-search-btn').addEventListener('click', () => {
    const bar = $('m-search-bar');
    bar.hidden = !bar.hidden;
    if (!bar.hidden) $('ops-search').focus();
  });
  $('ops-search').addEventListener('keydown', async (e) => {
    if (e.key !== 'Enter') return;
    const q = e.target.value.trim();
    if (!q) return;
    const { view, id } = mRoute();
    if (view === 'orders' || (view === 'more' && (id === 'inventory' || id === 'customers'))) {
      await render();
      return;
    }
    const res = await ops('/search?q=' + encodeURIComponent(q));
    if (res.orders && res.orders[0]) return go('orders/' + res.orders[0].id);
    if (res.shipments && res.shipments[0]) return go('run/shipments/' + res.shipments[0].id);
    if (res.loads && res.loads[0]) return go('run/loads/' + res.loads[0].id);
    if (res.pos && res.pos[0]) return go('more/purchasing/' + res.pos[0].id);
    flash('No match', true);
  });
  window.addEventListener('hashchange', render);
  if (!location.hash || location.hash === '#') location.hash = '#/today';
  else await render();
}

window.opsDoLogin = async function opsDoLogin() {
  const err = $('ops-login-err');
  err.hidden = true;
  try {
    await login($('ops-pin').value);
    await bootApp();
  } catch (e) {
    err.textContent = e.message;
    err.hidden = false;
  }
};

$('ops-login-btn').addEventListener('click', () => window.opsDoLogin());
$('ops-pin').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') window.opsDoLogin();
});
const deskFromLogin = $('m-desk-from-login');
if (deskFromLogin) deskFromLogin.href = keepQuery('ops.html');

if (token()) bootApp();
else $('ops-login').hidden = false;
