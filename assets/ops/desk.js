/**
 * All Pro OS desk — customer / catalog / order capture / docs / purchasing.
 * Fulfillment (confirm → pick → pack → load → POD) stays in app.js.
 */

import {
  $,
  api,
  confirmAct,
  csvEscape,
  custName,
  downloadText,
  esc,
  field,
  findProduct,
  flash,
  go,
  invalidateCatalog,
  loadCatalog,
  money,
  num,
  ops,
  parseCSV,
  pill,
  readCsvFile,
  selectField,
  table,
  val,
} from './lib.js';

let rerender = async () => {};
let payMethodsCache = null;

export function bindDesk(hooks) {
  rerender = hooks.render || rerender;
}

async function payMethods() {
  if (payMethodsCache) return payMethodsCache;
  payMethodsCache = await api('/admin/payment-methods');
  if (window.APBSDocs) window.APBSDocs.setPaymentMethods(payMethodsCache);
  return payMethodsCache;
}

function userLabel(u) {
  const name = [u.fname, u.lname].filter(Boolean).join(' ');
  return (u.company ? u.company + ' — ' : '') + (name || u.email || '');
}

/* ---------------- Customers ---------------- */

export async function viewCustomers() {
  const list = await ops('/customers');
  const q = (($('ops-search') && $('ops-search').value) || '').toLowerCase();
  const rows = (list || [])
    .filter((u) => {
      if (!q) return true;
      return [u.company, u.email, u.fname, u.lname, u.phone].join(' ').toLowerCase().includes(q);
    })
    .map(
      (u) => `<tr data-go="customers/${esc(u.id)}">
        <td>${esc(u.company || '')}</td>
        <td>${esc([u.fname, u.lname].filter(Boolean).join(' '))}</td>
        <td>${esc(u.email)}</td>
        <td>${pill(u.status)}</td>
        <td>${pill(u.credit_hold ? 'hold' : 'ok')}</td>
        <td class="num">${money(u.credit_limit)}</td>
      </tr>`
    );
  return `
    <div class="ops-row"><h1 class="ops-h1">Customers</h1>
      <button class="ops-btn ops-btn-gold" data-go="customers/new">New customer</button></div>
    <p class="ops-sub">Accounts, approval, addresses, credit hold. Same records as classic Users.</p>
    ${table(['Company', 'Name', 'Email', 'Status', 'Credit', 'Limit'], rows)}`;
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
  const addrRows = addresses.map(
    (a) => `<tr>
      <td>${esc(a.label || '')}${a.isDefault || a.is_default ? ' ' + pill('default') : ''}</td>
      <td>${esc(a.fullAddress || a.full_address || '')}</td>
      <td>${esc(a.phone || '')}</td>
      <td><button class="ops-btn" data-del-addr="${esc(a.id)}">Delete</button></td>
    </tr>`
  );
  return `
    <div class="ops-row">
      <div><h1 class="ops-h1">${creating ? 'New customer' : esc(userLabel(u))}</h1>
        <div class="ops-sub">${creating ? 'Approved accounts can log in and order.' : esc(u.email)}</div></div>
      <div class="ops-btn-row">
        <button class="ops-btn" data-go="customers">Back</button>
        ${creating ? '' : `<button class="ops-btn ops-btn-danger" data-del-customer="${esc(u.id)}">Delete</button>`}
      </div>
    </div>
    <div class="ops-card ops-form">
      <h3>Account</h3>
      <input type="hidden" id="c-id" value="${esc(u.id)}">
      <div class="ops-fields">
        ${field('c-fname', 'First name', `value="${esc(u.fname || '')}"`)}
        ${field('c-lname', 'Last name', `value="${esc(u.lname || '')}"`)}
        ${field('c-email', 'Email', `type="email" value="${esc(u.email || '')}"`)}
        ${field('c-phone', 'Phone', `value="${esc(u.phone || '')}"`)}
        ${field('c-company', 'Company', `value="${esc(u.company || '')}"`)}
        ${selectField('c-status', 'Status', ['approved', 'pending', 'rejected'], u.status || 'pending')}
        ${selectField('c-pcs', 'Can order pieces', [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }], u.canOrderPieces ? 'true' : 'false')}
        ${field('c-credit', 'Credit limit $', `type="number" step="0.01" value="${esc(u.credit_limit || 0)}"`)}
        ${field('c-password', 'Password', `type="password" placeholder="${creating ? 'Default Welcome1!' : 'Leave blank to keep'}" autocomplete="new-password"`)}
      </div>
      <div class="ops-btn-row">
        <button class="ops-btn ops-btn-gold" data-save-customer="${creating ? 'new' : 'edit'}">Save customer</button>
        ${
          creating
            ? ''
            : `<button class="ops-btn" data-credit="${esc(u.email)}" data-hold="${u.credit_hold ? 0 : 1}">${
                u.credit_hold ? 'Release credit hold' : 'Place credit hold'
              }</button>`
        }
      </div>
    </div>
    ${
      creating
        ? ''
        : `<div class="ops-card ops-form" style="margin-top:16px">
      <h3>Address book</h3>
      ${table(['Label', 'Address', 'Phone', ''], addrRows, { nav: false })}
      <div class="ops-fields" style="margin-top:12px">
        ${field('a-label', 'Label', 'placeholder="Jobsite / warehouse"')}
        ${field('a-phone', 'Phone', '')}
        <label class="ops-span-2">Full address<textarea class="data-input" id="a-full" rows="3"></textarea></label>
      </div>
      <label class="ops-check"><input type="checkbox" id="a-default"> Default address</label>
      <div class="ops-btn-row">
        <button class="ops-btn ops-btn-gold" data-save-address="${esc(u.email)}">Add address</button>
      </div>
    </div>`
    }`;
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
    go('customers/' + (r.id || payload.id));
    return;
  }
  payload.id = val('c-id');
  payload.password = plain ? await window.apbsHashPassword(plain) : '********';
  await api('/admin/users', { method: 'PUT', body: JSON.stringify(payload) });
  await ops(`/customers/${encodeURIComponent(email)}/credit`, {
    method: 'POST',
    body: JSON.stringify({ creditLimit: num('c-credit', 0) }),
  });
  flash('Customer saved');
  await rerender();
}

/* ---------------- Catalog / inventory ---------------- */

export async function viewInventory() {
  const q = (($('ops-search') && $('ops-search').value) || '').trim();
  const [atp, prods] = await Promise.all([
    ops('/inventory?q=' + encodeURIComponent(q) + '&limit=80'),
    loadCatalog(),
  ]);
  const by = new Map();
  (prods || []).forEach((p) => by.set(String(p.code) + '\x1e' + String(p.size || ''), p));
  let rowsSrc = atp || [];
  if (q) {
    const n = q.toLowerCase();
    const extra = (prods || []).filter((p) =>
      [p.code, p.description, p.size, p.tommur_code, p.lesso_code, p.main_category]
        .join(' ')
        .toLowerCase()
        .includes(n)
    );
    const seen = new Set(rowsSrc.map((p) => String(p.code) + '\x1e' + String(p.size || '')));
    extra.forEach((p) => {
      const k = String(p.code) + '\x1e' + String(p.size || '');
      if (!seen.has(k)) {
        seen.add(k);
        rowsSrc.push({
          code: p.code,
          size: p.size,
          description: p.description,
          available: p.qty || p.stock || 0,
          floor: 0,
          allocated: 0,
          inbound: 0,
          atp: p.qty || p.stock || 0,
        });
      }
    });
  }
  const body = (rowsSrc || []).slice(0, 120).map((p) => {
    const cat = by.get(String(p.code) + '\x1e' + String(p.size || '')) || {};
    const price = cat.price != null ? cat.price : p.price;
    return `<tr>
      <td><a href="#/inventory/edit/${encodeURIComponent(p.code)}/${encodeURIComponent(p.size || '')}">${esc(p.code)}</a>
        <div class="ops-sub">${esc(p.description || cat.description || '')} ${esc(p.size || '')}</div></td>
      <td class="num">${p.available != null ? p.available : cat.qty || 0}</td>
      <td class="num">${p.floor != null ? p.floor : '—'}</td>
      <td class="num">${p.allocated || 0}</td>
      <td class="num">${p.inbound || 0}</td>
      <td class="num">${money(price)}</td>
      <td><input class="ops-big-qty" style="width:72px;height:34px;font-size:16px" data-count-sku="${esc(p.code)}" data-count-size="${esc(p.size || '')}" placeholder="count"/></td>
    </tr>`;
  });
  return `
    <div class="ops-row"><h1 class="ops-h1">Inventory / catalog</h1>
      <div class="ops-btn-row">
        <button class="ops-btn ops-btn-gold" data-go="inventory/new">New SKU</button>
        <button class="ops-btn" data-export-csv>Export CSV</button>
        <label class="ops-btn">Replace CSV<input type="file" accept=".csv,text/csv" hidden data-csv-replace></label>
        <label class="ops-btn">Receive CSV<input type="file" accept=".csv,text/csv" hidden data-csv-receive></label>
      </div>
    </div>
    <p class="ops-sub">Search SKU / description. Cycle count: type qty and press Enter. Receive / adjust live on Warehouse → Stock.</p>
    ${table(['SKU', 'Avail', 'Floor', 'Alloc', 'Inbound', 'Price', 'Cycle count'], body, { nav: false })}`;
}

export async function viewProduct(id, extra) {
  const creating = id === 'new';
  const code = creating ? '' : decodeURIComponent(extra[0] || id || '');
  const size = creating ? '' : decodeURIComponent(extra[1] || '');
  const prods = await loadCatalog();
  const p = creating ? {} : findProduct(prods, code, size) || { code, size };
  return `
    <div class="ops-row">
      <div><h1 class="ops-h1">${creating ? 'New product' : esc(p.code || '')}</h1>
        <div class="ops-sub">${esc(p.description || '')}</div></div>
      <div class="ops-btn-row">
        <button class="ops-btn" data-go="inventory">Back</button>
        ${creating ? '' : `<button class="ops-btn ops-btn-danger" data-del-product data-code="${esc(p.code)}" data-size="${esc(p.size || '')}">Delete SKU</button>`}
      </div>
    </div>
    <div class="ops-card ops-form">
      <div class="ops-fields">
        ${field('p-code', 'Code / SKU', `value="${esc(p.code || '')}" ${creating ? '' : 'readonly'}`)}
        ${field('p-size', 'Size', `value="${esc(p.size || '')}"`)}
        ${field('p-desc', 'Description', `value="${esc(p.description || '')}"`)}
        ${field('p-pack', 'Pack (pcs/ctn)', `type="number" value="${esc(p.pack != null ? p.pack : '')}"`)}
        ${field('p-qty', 'On-hand qty', `type="number" value="${esc(p.qty != null ? p.qty : p.stock != null ? p.stock : 0)}"`)}
        ${field('p-price', 'Price', `type="number" step="0.01" value="${esc(p.price != null ? p.price : '')}"`)}
        ${field('p-material', 'Material', `value="${esc(p.material || '')}"`)}
        ${field('p-main', 'Main category', `value="${esc(p.main_category || '')}"`)}
        ${field('p-sub', 'Sub category', `value="${esc(p.sub_category || '')}"`)}
        ${field('p-sub2', 'Sub-sub', `value="${esc(p.sub_sub_category || '')}"`)}
        ${field('p-tommur', 'Tommur code', `value="${esc(p.tommur_code || '')}"`)}
        ${field('p-lesso', 'Lesso code', `value="${esc(p.lesso_code || '')}"`)}
        ${field('p-image', 'Image URL', `value="${esc(p.image || '')}"`)}
      </div>
      <div class="ops-btn-row"><button class="ops-btn ops-btn-gold" data-save-product>Save product</button></div>
    </div>`;
}

function collectProduct() {
  return {
    code: val('p-code'),
    size: val('p-size'),
    description: val('p-desc'),
    pack: num('p-pack', 0),
    qty: num('p-qty', 0),
    price: num('p-price', 0),
    material: val('p-material'),
    main_category: val('p-main'),
    sub_category: val('p-sub'),
    sub_sub_category: val('p-sub2'),
    tommur_code: val('p-tommur'),
    lesso_code: val('p-lesso'),
    image: val('p-image'),
  };
}

async function exportCatalogCsv() {
  const prods = await loadCatalog();
  const headers = [
    'Material',
    'Code',
    'Tommur-Code',
    'Lesso-Code',
    'Description',
    'Size',
    'Pack',
    'Qty',
    'AddQty',
    'Price',
    'Image',
    'main_category',
    'sub_category',
    'sub_sub_category',
    'sub_sub_sub_category',
  ];
  const lines = [headers.join(',')];
  prods.forEach((p) => {
    lines.push(
      [
        csvEscape(p.material || ''),
        csvEscape(p.code),
        csvEscape(p.tommur_code || ''),
        csvEscape(p.lesso_code || ''),
        csvEscape(p.description || ''),
        csvEscape(p.size || ''),
        csvEscape(p.pack != null ? p.pack : ''),
        csvEscape(p.qty != null ? p.qty : p.stock != null ? p.stock : 0),
        '',
        csvEscape(p.price != null ? p.price : ''),
        csvEscape(p.image || ''),
        csvEscape(p.main_category || ''),
        csvEscape(p.sub_category || ''),
        csvEscape(p.sub_sub_category || ''),
        csvEscape(p.sub_sub_sub_category || ''),
      ].join(',')
    );
  });
  downloadText('apbs-inventory-' + new Date().toISOString().slice(0, 10) + '.csv', lines.join('\n') + '\n');
}

function productCsvHeaderMap(headerRow) {
  const map = {};
  (headerRow || []).forEach((h, i) => {
    const key = String(h || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '');
    if (key === 'code' || key === 'sku') map.code = i;
    else if (key === 'size') map.size = i;
    else if (key === 'description' || key === 'desc') map.description = i;
    else if (key === 'pack') map.pack = i;
    else if (key === 'qty' || key === 'quantity' || key === 'stock') map.qty = i;
    else if (key === 'addqty' || key === 'receiveqty') map.addQty = i;
    else if (key === 'price') map.price = i;
    else if (key === 'image') map.image = i;
    else if (key === 'material') map.material = i;
    else if (key === 'tommurcode' || key === 'tommur-code' || key === 'tommur') map.tommur_code = i;
    else if (key === 'lessocode' || key === 'lesso-code' || key === 'lesso') map.lesso_code = i;
    else if (key === 'maincategory' || key === 'main_category') map.main_category = i;
    else if (key === 'subcategory' || key === 'sub_category') map.sub_category = i;
  });
  return map;
}

async function handleProductCsv(file, mode) {
  const text = await readCsvFile(file);
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('CSV is empty');
  const map = productCsvHeaderMap(rows[0]);
  const start = map.code != null ? 1 : 0;
  if (map.code == null) throw new Error('CSV needs a Code column');
  const products = [];
  const receive = [];
  for (let i = start; i < rows.length; i++) {
    const cols = rows[i] || [];
    const code = String(cols[map.code] || '').trim();
    const size = String(map.size != null ? cols[map.size] : '').trim();
    if (!code) continue;
    const addQty = map.addQty != null ? parseInt(cols[map.addQty], 10) : 0;
    products.push({
      code,
      size,
      description: map.description != null ? cols[map.description] : '',
      pack: map.pack != null ? cols[map.pack] : '',
      qty: map.qty != null ? cols[map.qty] : 0,
      price: map.price != null ? cols[map.price] : '',
      image: map.image != null ? cols[map.image] : '',
      material: map.material != null ? cols[map.material] : '',
      tommur_code: map.tommur_code != null ? cols[map.tommur_code] : '',
      lesso_code: map.lesso_code != null ? cols[map.lesso_code] : '',
      main_category: map.main_category != null ? cols[map.main_category] : '',
      sub_category: map.sub_category != null ? cols[map.sub_category] : '',
    });
    if (Number.isFinite(addQty) && addQty > 0) receive.push({ code, size, qty: addQty });
  }
  if (mode === 'replace') {
    if (!confirmAct('Replace the entire catalog with this CSV (' + products.length + ' rows)?')) return;
    await api('/admin/products/sync', { method: 'POST', body: JSON.stringify(products) });
    flash('Catalog replaced (' + products.length + ' SKUs)');
  } else {
    await api('/admin/products/bulk-update', { method: 'POST', body: JSON.stringify({ products }) });
    if (receive.length) {
      await api('/admin/products/receive', { method: 'POST', body: JSON.stringify({ items: receive }) });
    }
    flash('Updated ' + products.length + ' SKUs' + (receive.length ? ', received ' + receive.length : ''));
  }
  invalidateCatalog();
  await rerender();
}

/* ---------------- Warehouse stock / pick list ---------------- */

export async function viewWarehouseStock() {
  const [movements, orders] = await Promise.all([
    api('/admin/stock/movements?limit=40'),
    api('/admin/orders'),
  ]);
  const pick = [];
  (orders || []).forEach((o) => {
    if (['delivered', 'cancelled'].includes(String(o.status || '').toLowerCase())) return;
    (o.items || []).forEach((it) => {
      const bo = it.qtyBackordered != null ? it.qtyBackordered : Math.max(0, (it.qty || 0) - (it.qtyShipped || 0));
      if (bo > 0) {
        pick.push(
          `<tr data-go="orders/${esc(o.id)}"><td>${esc(o.id)}</td><td>${esc(custName(o.customer))}</td>
           <td>${esc(it.code)} ${esc(it.size || '')}</td><td class="num">${bo}</td></tr>`
        );
      }
    });
  });
  const movRows = (movements.movements || []).map(
    (m) =>
      `<tr><td>${esc(m.created_at || '')}</td><td>${esc(m.code)} ${esc(m.size || '')}</td>
       <td>${esc(m.reason)}</td><td class="num">${m.delta}</td><td class="num">${m.qty_after}</td></tr>`
  );
  return `
    <div class="ops-row"><h1 class="ops-h1">Warehouse</h1>
      <div class="ops-tabs">
        <a href="#/warehouse">Tasks</a>
        <a href="#/warehouse/stock" class="is-on">Stock</a>
      </div></div>
    <div class="ops-grid-2">
      <div class="ops-card ops-form">
        <h3>Receive / adjust</h3>
        <div class="ops-fields">
          ${field('st-code', 'SKU', 'placeholder="Code"')}
          ${field('st-size', 'Size', '')}
          ${field('st-qty', 'Qty', 'type="number"')}
        </div>
        <div class="ops-btn-row">
          <button class="ops-btn ops-btn-gold" data-stock-receive>Receive +</button>
          <button class="ops-btn" data-stock-adjust="plus">Adjust +</button>
          <button class="ops-btn" data-stock-adjust="minus">Adjust −</button>
        </div>
        <p class="ops-sub">Receive adds pieces. Adjust +/− changes on-hand and floor balance (floors at 0).</p>
      </div>
      <div class="ops-card">
        <h3>Pick list — open backorders</h3>
        ${table(['Order', 'Customer', 'SKU', 'Due'], pick.length ? pick : [], { nav: true })}
      </div>
    </div>
    <div class="ops-card" style="margin-top:16px">
      <h3>Recent movements</h3>
      ${table(['When', 'SKU', 'Reason', 'Δ', 'After'], movRows, { nav: false })}
    </div>`;
}

/* ---------------- Orders capture ---------------- */

export async function viewOrdersList() {
  const q = (($('ops-search') && $('ops-search').value) || '').trim();
  const list = await ops('/orders?status=all&limit=120' + (q ? '&q=' + encodeURIComponent(q) : ''));
  const rows = (list || []).map(
    (o) => `<tr data-go="orders/${esc(o.id)}">
      <td>${esc(o.id)}</td>
      <td>${esc(custName(o.customer))}</td>
      <td>${esc(o.po || '')}</td>
      <td class="num">${money(o.total)}</td>
      <td>${pill(o.fulfillment || o.status)}</td>
      <td>${pill(o.paymentStatus || '')}</td>
    </tr>`
  );
  return `
    <div class="ops-row"><h1 class="ops-h1">Orders</h1>
      <button class="ops-btn ops-btn-gold" data-go="orders/new">New order</button></div>
    <p class="ops-sub">Create and edit sales orders here. Confirm → allocate → pick → pack on the order workspace.</p>
    ${table(['Order', 'Customer', 'PO', 'Total', 'Fulfillment', 'Pay'], rows)}`;
}

function editorTable(headers, rowsHtml, tbodyId) {
  return `<div style="overflow:auto"><table class="ops-table ops-static">
    <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody id="${esc(tbodyId)}">${(rowsHtml || []).join('')}</tbody>
  </table></div>`;
}

function lineRowHtml(it, idx) {
  return `<tr data-oline>
    <td><input class="data-input" name="code" value="${esc(it.code || '')}"></td>
    <td><input class="data-input" name="size" value="${esc(it.size || '')}"></td>
    <td><input class="data-input" name="description" value="${esc(it.description || '')}"></td>
    <td><input class="data-input" name="qty" type="number" min="1" value="${esc(it.qty || 1)}"></td>
    <td><input class="data-input" name="qtyShipped" type="number" min="0" value="${esc(it.qtyShipped || 0)}"></td>
    <td><input class="data-input" name="unitPrice" type="number" step="0.01" value="${esc(it.unitPrice || 0)}"></td>
    <td class="num">${money((it.qty || 0) * (it.unitPrice || 0))}</td>
    <td><button type="button" class="ops-btn" data-rm-line="${idx}">×</button></td>
  </tr>`;
}

function normAddr(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function orderCustomerEmail() {
  return val('o-email') || val('o-cust');
}

function savedAddressValues() {
  return Array.from(document.querySelectorAll('#o-saved-addr option[data-full]')).map((o) => o.getAttribute('data-full') || '');
}

function shipAddrIsNew() {
  const method = val('o-method') || 'delivery';
  const addr = val('o-address');
  if (!addr || method === 'pickup' || addr.toUpperCase() === 'PICKUP') return false;
  const n = normAddr(addr);
  return !savedAddressValues().some((a) => normAddr(a) === n);
}

function syncOrderAddressBookUi() {
  const wrap = $('o-addr-book-row');
  if (!wrap) return;
  const show = !!orderCustomerEmail() && shipAddrIsNew();
  wrap.hidden = !show;
}

function fillSavedAddressSelect(addresses, selectedFull) {
  const sel = $('o-saved-addr');
  if (!sel) return;
  const cur = selectedFull != null ? selectedFull : val('o-address');
  const opts = ['<option value="">— Type new or pick saved —</option>'];
  (addresses || []).forEach((a) => {
    const full = a.fullAddress || a.full_address || '';
    if (!full) return;
    const lab = [a.label, full].filter(Boolean).join(' — ');
    const on = normAddr(full) === normAddr(cur) ? ' selected' : '';
    opts.push(`<option value="${esc(full)}" data-full="${esc(full)}"${on}>${esc(lab)}</option>`);
  });
  sel.innerHTML = opts.join('');
  syncOrderAddressBookUi();
}

async function loadOrderSavedAddresses(email, selectedFull) {
  if (!email) {
    fillSavedAddressSelect([], selectedFull);
    return [];
  }
  try {
    const addr = await api('/admin/addresses?email=' + encodeURIComponent(email));
    const list = addr.addresses || [];
    fillSavedAddressSelect(list, selectedFull);
    return list;
  } catch (_) {
    fillSavedAddressSelect([], selectedFull);
    return [];
  }
}

function collectOrderPayload() {
  const items = [];
  document.querySelectorAll('[data-oline]').forEach((row) => {
    const code = row.querySelector('[name=code]').value.trim();
    const size = row.querySelector('[name=size]').value.trim();
    const qty = parseInt(row.querySelector('[name=qty]').value, 10) || 0;
    if (!code || qty < 1) return;
    items.push({
      code,
      size,
      description: row.querySelector('[name=description]').value.trim(),
      qty,
      qtyShipped: parseInt(row.querySelector('[name=qtyShipped]').value, 10) || 0,
      unitPrice: parseFloat(row.querySelector('[name=unitPrice]').value) || 0,
    });
  });
  const name = val('o-name');
  const company = val('o-company');
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
    delivery: { method: val('o-method') || 'delivery', address: val('o-address') },
    po: val('o-po'),
    notes: val('o-notes'),
    paymentStatus: val('o-pay') || 'unpaid',
    paymentMethod: val('o-pay-method'),
    paymentNote: val('o-pay-note'),
    paidAt: null,
    shipments: [],
    saveAddress: $('o-save-addr') ? $('o-save-addr').checked && shipAddrIsNew() : shipAddrIsNew(),
    items,
  };
}

function docsPanel(o) {
  const ships = (o.shipments || []).concat(o.docShipments || []);
  const seen = new Set();
  const opts = ['<option value="">Full order</option>'];
  ships.forEach((s) => {
    const id = s.id;
    if (!id || seen.has(id)) return;
    seen.add(id);
    opts.push(`<option value="${esc(id)}">${esc(id)}</option>`);
  });
  return `
    <div class="ops-card ops-form" style="margin-top:16px">
      <h3>Documents, email, pay</h3>
      <div class="ops-fields">
        ${selectField('doc-type', 'Format', [
          { value: 'invoice', label: 'Invoice' },
          { value: 'packing', label: 'Packing slip' },
          { value: 'confirm', label: 'Order copy' },
          { value: 'deliver', label: 'Delivered' },
        ], 'invoice')}
        <label>Shipment<select class="data-input" id="doc-ship">${opts.join('')}</select></label>
        <label class="ops-span-2">Note<textarea class="data-input" id="doc-note" rows="2"></textarea></label>
        ${field('doc-to', 'To (comma-separated)', `value="${esc((o.customer && o.customer.email) || '')}"`)}
        ${field('doc-cc', 'CC', 'value="orders@allprobuildingsupplies.com"')}
      </div>
      <div class="ops-btn-row">
        <button class="ops-btn ops-btn-gold" data-send-doc="${esc(o.id)}">Email</button>
        <button class="ops-btn" data-print-doc="${esc(o.id)}">Print / PDF</button>
        <button class="ops-btn" data-mark-paid="${esc(o.id)}">Mark paid</button>
        <button class="ops-btn" data-banquest="${esc(o.id)}">Pay via card (Banquest)</button>
      </div>
      <p class="ops-sub">Same invoice HTML/PDF and /api/admin/email/send as classic admin. Email degrades if Graph/EmailJS secrets are unset.</p>
    </div>`;
}

export async function viewOrderDesk(id, fulfillmentHtml) {
  const creating = id === 'new';
  let o;
  let users = [];
  try {
    users = await ops('/customers');
  } catch (_) {}
  if (creating) {
    const next = await api('/admin/orders/next-id');
    o = {
      id: next.id,
      status: 'pending',
      fulfillment: 'pending',
      paymentStatus: 'unpaid',
      placedAt: new Date().toISOString(),
      customer: { name: '', company: '', email: '', phone: '' },
      delivery: { method: 'delivery', address: '' },
      po: '',
      notes: '',
      items: [],
      shipments: [],
      nextActions: [],
    };
  } else {
    o = await ops('/orders/' + encodeURIComponent(id));
  }
  const custOpts = ['<option value="">— Select customer —</option>']
    .concat(
      (users || [])
        .filter((u) => String(u.status) === 'approved' || u.email === (o.customer && o.customer.email))
        .map((u) => {
          const on = (o.customer && o.customer.email && String(u.email).toLowerCase() === String(o.customer.email).toLowerCase())
            ? ' selected'
            : '';
          return `<option value="${esc(u.email)}"${on}>${esc(userLabel(u))}</option>`;
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
  const savedOpts = ['<option value="">— Type new or pick saved —</option>']
    .concat(
      savedAddrs.map((a) => {
        const full = a.fullAddress || a.full_address || '';
        const lab = [a.label, full].filter(Boolean).join(' — ');
        const on = normAddr(full) && normAddr(full) === normAddr(ship) ? ' selected' : '';
        return `<option value="${esc(full)}" data-full="${esc(full)}"${on}>${esc(lab)}</option>`;
      })
    )
    .join('');
  const shipIsNew =
    !!custEmail &&
    !!ship &&
    ship.toUpperCase() !== 'PICKUP' &&
    String((o.delivery && o.delivery.method) || 'delivery') !== 'pickup' &&
    !savedAddrs.some((a) => normAddr(a.fullAddress || a.full_address) === normAddr(ship));
  const lineRows = (o.items || []).map((it, i) => lineRowHtml(it, i));
  const actions = (o.nextActions || [])
    .map((a) => `<button class="ops-btn ops-btn-gold" data-act="${esc(a.id)}" data-order="${esc(o.id)}">${esc(a.label)}</button>`)
    .join('');
  return `
    <div class="ops-row">
      <div><h1 class="ops-h1">${esc(o.id)}</h1>
        <div class="ops-sub">${esc(custName(o.customer))} · ${pill(o.fulfillment || o.status)} ${pill(o.paymentStatus)}</div></div>
      <div class="ops-btn-row">
        <button class="ops-btn ops-btn-gold" data-save-order>Save order</button>
        ${creating ? '' : `<button class="ops-btn ops-btn-danger" data-del-order="${esc(o.id)}">Delete</button>`}
        ${creating ? '' : actions}
        ${creating ? '' : `<button class="ops-btn" data-act="wave" data-order="${esc(o.id)}">Release wave</button>`}
      </div>
    </div>
    <div class="ops-card ops-form">
      <h3>Customer / delivery</h3>
      <input type="hidden" id="o-id" value="${esc(o.id)}">
      <input type="hidden" id="o-placed" value="${esc(o.placedAt || '')}">
      <div class="ops-fields">
        <label>Customer<select class="data-input" id="o-cust">${custOpts}</select></label>
        ${field('o-name', 'Contact name', `value="${esc((o.customer && o.customer.name) || '')}"`)}
        ${field('o-company', 'Company', `value="${esc((o.customer && o.customer.company) || '')}"`)}
        ${field('o-email', 'Email', `value="${esc((o.customer && o.customer.email) || '')}"`)}
        ${field('o-phone', 'Phone', `value="${esc((o.customer && o.customer.phone) || '')}"`)}
        ${selectField('o-method', 'Method', ['delivery', 'pickup'], (o.delivery && o.delivery.method) || 'delivery')}
        <label>Saved address<select class="data-input" id="o-saved-addr">${savedOpts}</select></label>
        <label class="ops-span-2">Ship to<textarea class="data-input" id="o-address" rows="2">${esc(ship)}</textarea></label>
        <div class="ops-span-2 ops-addr-book" id="o-addr-book-row"${shipIsNew ? '' : ' hidden'}>
          <label class="ops-check"><input type="checkbox" id="o-save-addr" checked> Add to address book when saving</label>
          <button type="button" class="ops-btn ops-btn-gold" data-add-order-addr>Add to address book</button>
        </div>
        ${field('o-po', 'PO #', `value="${esc(o.po || '')}"`)}
        ${selectField('o-status', 'Status', ['pending', 'processing', 'partially_shipped', 'delivered', 'cancelled'], o.status || 'pending')}
        ${selectField('o-pay', 'Payment', ['unpaid', 'partial', 'paid'], o.paymentStatus || 'unpaid')}
        ${field('o-pay-method', 'Pay method', `value="${esc(o.paymentMethod || '')}" placeholder="zelle / wire / ach / card"`)}
        ${field('o-pay-note', 'Pay note', `value="${esc(o.paymentNote || '')}"`)}
        <label class="ops-span-2">Notes<textarea class="data-input" id="o-notes" rows="2">${esc(o.notes || '')}</textarea></label>
      </div>
    </div>
    <div class="ops-card ops-form" style="margin-top:16px">
      <h3>Lines</h3>
      <div class="ops-btn-row">
        <input class="data-input" id="sku-q" placeholder="Search SKU or description" style="min-width:220px">
        <input class="data-input" id="sku-qty" type="number" min="1" value="1" style="width:90px">
        <button class="ops-btn ops-btn-gold" data-add-hit>Add selected</button>
        <label class="ops-btn">Upload lines CSV<input type="file" accept=".csv,text/csv" hidden data-order-csv></label>
      </div>
      <div id="sku-hits" class="ops-hits" hidden></div>
      ${editorTable(['SKU', 'Size', 'Description', 'Qty', 'Shipped', 'Unit', 'Amount', ''], lineRows, 'ops-lines-body')}
    </div>
    ${creating ? '' : fulfillmentHtml || ''}
    ${creating ? '' : docsPanel(o)}`;
}

async function fillCustomerFromSelect() {
  const email = val('o-cust');
  if (!email) {
    fillSavedAddressSelect([]);
    return;
  }
  const users = await ops('/customers');
  const u = (users || []).find((x) => String(x.email).toLowerCase() === email.toLowerCase());
  if (!u) return;
  if ($('o-name')) $('o-name').value = [u.fname, u.lname].filter(Boolean).join(' ');
  if ($('o-company')) $('o-company').value = u.company || '';
  if ($('o-email')) $('o-email').value = u.email || '';
  if ($('o-phone')) $('o-phone').value = u.phone || '';
  const list = await loadOrderSavedAddresses(email);
  const def = (list || []).find((a) => a.isDefault || a.is_default) || (list || [])[0];
  if (def && $('o-address')) {
    const full = def.fullAddress || def.full_address || '';
    $('o-address').value = full;
    fillSavedAddressSelect(list, full);
  }
}

async function addCatalogHit() {
  const q = val('sku-q').toLowerCase();
  const hit = document.querySelector('#sku-hits button.is-on') || document.querySelector('#sku-hits button');
  let prod = null;
  const catalog = await loadCatalog();
  if (hit) {
    prod = findProduct(catalog, hit.dataset.code, hit.dataset.size);
  } else if (q) {
    prod = catalog.find((p) => String(p.code).toLowerCase() === q);
  }
  if (!prod) throw new Error('Pick a product from the search hits');
  const qty = parseInt(val('sku-qty') || '1', 10) || 1;
  const tbody = $('ops-lines-body');
  if (!tbody) throw new Error('Line table missing');
  tbody.insertAdjacentHTML(
    'beforeend',
    lineRowHtml(
      {
        code: prod.code,
        size: prod.size,
        description: prod.description,
        qty,
        qtyShipped: 0,
        unitPrice: prod.price || 0,
      },
      tbody.children.length
    )
  );
  if ($('sku-q')) $('sku-q').value = '';
  if ($('sku-hits')) $('sku-hits').hidden = true;
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
    .filter((p) =>
      [p.code, p.description, p.size, p.tommur_code, p.lesso_code].join(' ').toLowerCase().includes(q)
    )
    .slice(0, 8);
  box.hidden = !hits.length;
  box.innerHTML = hits
    .map(
      (p, i) =>
        `<button type="button" class="${i === 0 ? 'is-on' : ''}" data-code="${esc(p.code)}" data-size="${esc(p.size || '')}">
          <code>${esc(p.code)}</code> ${esc(p.size || '')} · ${esc(p.description || '')} · ${money(p.price)}</button>`
    )
    .join('');
}

function orderForDocs(o) {
  const ships = (o.docShipments && o.docShipments.length ? o.docShipments : null) ||
    (o.shipments || []).map((s) => ({
      id: s.id,
      shippedAt: s.packed_at || s.created_at,
      items: (s.lines || []).map((l) => ({
        code: l.code,
        size: l.size,
        qty: l.qty,
        description: l.description,
        unitPrice: l.unit_price || l.unitPrice,
      })),
    }));
  return {
    id: o.id,
    placedAt: o.placedAt,
    status: o.status,
    po: o.po,
    notes: o.notes,
    total: o.total,
    customer: o.customer || {},
    delivery: o.delivery || {},
    items: (o.items || []).map((it) => ({
      code: it.code,
      size: it.size,
      description: it.description,
      qty: it.qty,
      qtyShipped: it.qtyShipped,
      unitPrice: it.unitPrice,
      lineTotal: it.lineTotal != null ? it.lineTotal : (it.qty || 0) * (it.unitPrice || 0),
    })),
    shipments: ships,
  };
}

async function buildDoc(order, type, note, shipment) {
  const D = window.APBSDocs;
  if (!D) throw new Error('Document builders failed to load');
  const methods = await payMethods();
  D.setPaymentMethods(methods);
  const view = orderForDocs(order);
  const shipView = shipment ? D.orderViewForShipment(view, shipment) : view;
  let htmlBody = '';
  let pdfHtml = '';
  let subject = '';
  let filename = 'Document.pdf';
  if (type === 'confirm') {
    htmlBody = D.buildConfirmEmail(view, note);
    pdfHtml = htmlBody;
    subject = 'Order Update — Confirmation — ' + view.id;
    filename = 'Order-Confirmation-' + view.id + '.pdf';
  } else if (type === 'packing') {
    htmlBody = D.buildPackingSlipEmail(shipView, note);
    pdfHtml = htmlBody;
    subject = 'Packing Slip — ' + view.id + (shipment && shipment.id ? ' — ' + shipment.id : '');
    filename = 'Packing-Slip-' + view.id + '.pdf';
  } else if (type === 'deliver') {
    htmlBody = D.buildDeliveredEmail(shipView, note);
    pdfHtml = htmlBody;
    subject = 'Order Delivered — Thank You! — All Pro Building Supplies';
    filename = 'Delivery-Confirmation-' + view.id + '.pdf';
  } else {
    htmlBody = D.buildInvoiceCoverEmail(shipView, note, methods, '');
    pdfHtml = D.buildInvoicePdfDocument(shipView, note, methods);
    subject =
      'Invoice — ' +
      view.id +
      (shipment && shipment.id ? ' / ' + shipment.id : '') +
      ' — $' +
      (Number(shipView.total) || 0).toFixed(2) +
      ' due — All Pro Building Supplies';
    filename = 'Invoice-' + view.id + '.pdf';
  }
  htmlBody = D.minifyEmailHtml(htmlBody);
  return { htmlBody, pdfHtml, subject, filename, shipView, methods };
}

function selectedShipment(order) {
  const id = val('doc-ship');
  if (!id) return null;
  const classic = (order.docShipments || []).find((s) => s.id === id);
  if (classic) return classic;
  const ob = (order.shipments || []).find((s) => s.id === id);
  if (!ob) return null;
  return {
    id: ob.id,
    shippedAt: ob.packed_at || ob.created_at,
    items: (ob.lines || []).map((l) => ({
      code: l.code,
      size: l.size,
      qty: l.qty,
      description: l.description,
      unitPrice: l.unit_price || l.unitPrice,
    })),
  };
}

async function sendOrPrintDoc(orderId, mode) {
  const order = await ops('/orders/' + encodeURIComponent(orderId));
  const type = val('doc-type') || 'invoice';
  const note = val('doc-note');
  const shipment = selectedShipment(order);
  const doc = await buildDoc(order, type, note, shipment);
  if (mode === 'print') {
    window.APBSDocs.openOrderDocumentPrintWindow(doc.pdfHtml || doc.htmlBody, doc.filename, doc.subject);
    flash('Print dialog opened — choose Save as PDF');
    return;
  }
  const to = val('doc-to')
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const cc = val('doc-cc')
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (!to.length) throw new Error('Add at least one To recipient');
  let pdfBase64 = '';
  if (type === 'invoice') {
    try {
      pdfBase64 = await window.APBSDocs.buildInvoicePdfBase64(doc.shipView, doc.methods);
    } catch (_) {}
    await api('/admin/invoices', {
      method: 'POST',
      body: JSON.stringify({
        html: doc.pdfHtml,
        pdfBase64,
        orderId,
        filename: doc.filename,
      }),
    });
  }
  const sent = await api('/admin/email/send', {
    method: 'POST',
    body: JSON.stringify({
      recipients: to,
      cc,
      subject: doc.subject,
      htmlBody: doc.htmlBody,
      invoicePdfBase64: pdfBase64 || undefined,
      invoiceFilename: doc.filename,
    }),
  });
  flash('Email sent' + (sent.transport ? ' via ' + sent.transport : ''));
}

/* ---------------- Purchasing / inbound ---------------- */

function poLineRow(l) {
  return `<tr data-poline>
    <td><input class="data-input" name="code" value="${esc(l.code || '')}"></td>
    <td><input class="data-input" name="size" value="${esc(l.size || '')}"></td>
    <td><input class="data-input" name="description" value="${esc(l.description || '')}"></td>
    <td><input class="data-input" name="qty" type="number" min="1" value="${esc(l.qty_ordered || l.qty || 1)}"></td>
    <td><input class="data-input" name="unitCost" type="number" step="0.01" value="${esc(l.unit_cost || l.unitCost || 0)}"></td>
    <td><button type="button" class="ops-btn" data-rm-poline>×</button></td>
  </tr>`;
}

export async function viewPurchasingList() {
  const list = await ops('/purchase-orders');
  const rows = (list || []).map(
    (p) =>
      `<tr data-go="purchasing/${esc(p.id)}"><td>${esc(p.id)}</td><td>${esc(p.vendor)}</td><td>${pill(p.status)}</td>
       <td>${esc(p.eta || '')}</td><td class="num">${money(p.landed_cost)}</td></tr>`
  );
  return `<div class="ops-row"><h1 class="ops-h1">Vendor POs</h1>
      <button class="ops-btn ops-btn-gold" data-go="purchasing/new">New PO</button></div>
    ${table(['PO', 'Vendor', 'Status', 'ETA', 'Landed'], rows)}
    <p class="ops-sub">Tommur / Lesso factory orders. Landed cost = lines + freight + duty.</p>`;
}

export async function viewPoDesk(id) {
  const creating = id === 'new';
  const po = creating
    ? { id: 'new', vendor: 'Tommur', status: 'draft', freight: 0, duty: 0, eta: '', notes: '', lines: [] }
    : await ops('/purchase-orders/' + encodeURIComponent(id));
  const lines = (po.lines || []).map(poLineRow);
  return `
    <div class="ops-row">
      <div><h1 class="ops-h1">${creating ? 'New vendor PO' : esc(po.id)}</h1>${creating ? '' : pill(po.status)}</div>
      <div class="ops-btn-row">
        <button class="ops-btn" data-go="purchasing">Back</button>
        <button class="ops-btn ops-btn-gold" data-save-po="${esc(po.id)}">Save PO</button>
        ${creating ? '' : `<button class="ops-btn" data-po-send="${esc(po.id)}">Mark sent</button>`}
        ${creating ? '' : `<button class="ops-btn ops-btn-danger" data-del-po="${esc(po.id)}">Delete</button>`}
      </div>
    </div>
    <div class="ops-card ops-form">
      <div class="ops-fields">
        ${field('po-vendor', 'Vendor', `value="${esc(po.vendor || '')}"`)}
        ${field('po-eta', 'ETA', `value="${esc(po.eta || '')}" placeholder="YYYY-MM-DD"`)}
        ${field('po-freight', 'Freight $', `type="number" step="0.01" value="${esc(po.freight || 0)}"`)}
        ${field('po-duty', 'Duty $', `type="number" step="0.01" value="${esc(po.duty || 0)}"`)}
        <label class="ops-span-2">Notes<textarea class="data-input" id="po-notes" rows="2">${esc(po.notes || '')}</textarea></label>
      </div>
      <h3 style="margin-top:16px">Lines</h3>
      ${editorTable(['SKU', 'Size', 'Description', 'Qty', 'Unit cost', ''], lines.length ? lines : [poLineRow({})], 'ops-po-lines')}
      <div class="ops-btn-row"><button class="ops-btn" data-add-poline>Add line</button></div>
      ${creating ? '' : `<p class="ops-sub">Freight ${money(po.freight)} · Duty ${money(po.duty)} · Landed ${money(po.landed_cost)}</p>`}
    </div>`;
}

function collectPoLines() {
  const lines = [];
  document.querySelectorAll('[data-poline]').forEach((row) => {
    const code = row.querySelector('[name=code]').value.trim();
    const qty = parseInt(row.querySelector('[name=qty]').value, 10) || 0;
    if (!code || qty < 1) return;
    lines.push({
      code,
      size: row.querySelector('[name=size]').value.trim(),
      description: row.querySelector('[name=description]').value.trim(),
      qty,
      unitCost: parseFloat(row.querySelector('[name=unitCost]').value) || 0,
    });
  });
  return lines;
}

function ibLineRow(l) {
  return `<tr data-ibline>
    <td><input class="data-input" name="code" value="${esc(l.code || '')}"></td>
    <td><input class="data-input" name="size" value="${esc(l.size || '')}"></td>
    <td><input class="data-input" name="qty" type="number" min="1" value="${esc(l.qty_expected || l.qty || 1)}"></td>
    <td class="num">${l.qty_received != null ? l.qty_received : 0}</td>
    <td><input class="data-input" name="recv" type="number" min="0" placeholder="recv now" value=""></td>
    <td><button type="button" class="ops-btn" data-rm-ibline>×</button></td>
  </tr>`;
}

export async function viewInboundList() {
  const list = await ops('/inbound');
  const rows = (list || []).map((ib) => {
    const exp = (ib.lines || []).reduce((s, l) => s + (l.qty_expected || 0), 0);
    const rec = (ib.lines || []).reduce((s, l) => s + (l.qty_received || 0), 0);
    return `<tr data-go="inbound/${esc(ib.id)}"><td>${esc(ib.container_number || ib.id)}</td>
      <td>${pill(ib.status)}</td><td>${esc(ib.eta || '')}</td><td>${esc(ib.po_id || '')}</td>
      <td class="num">${rec}/${exp}</td></tr>`;
  });
  return `<div class="ops-row"><h1 class="ops-h1">Inbound</h1>
      <button class="ops-btn ops-btn-gold" data-go="inbound/new">New inbound</button></div>
    <p class="ops-sub">Containers against POs — receive into RECEIVING, then putaway.</p>
    ${table(['Container', 'Status', 'ETA', 'PO', 'Recv'], rows)}`;
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
  const lines = (ib.lines || []).map(ibLineRow);
  return `
    <div class="ops-row">
      <div><h1 class="ops-h1">${creating ? 'New inbound' : esc(ib.container_number || ib.id)}</h1>${creating ? '' : pill(ib.status)}</div>
      <div class="ops-btn-row">
        <button class="ops-btn" data-go="inbound">Back</button>
        <button class="ops-btn ops-btn-gold" data-save-inbound="${creating ? 'new' : esc(ib.id)}">Save</button>
        ${creating ? '' : `<button class="ops-btn" data-ib-arrive="${esc(ib.id)}">Mark arrived</button>`}
        ${creating ? '' : `<button class="ops-btn ops-btn-gold" data-ib-recv-form="${esc(ib.id)}">Receive entered qty</button>`}
        ${creating ? '' : `<button class="ops-btn" data-ib-recv="${esc(ib.id)}">Receive remaining</button>`}
      </div>
    </div>
    <div class="ops-card ops-form">
      <div class="ops-fields">
        ${field('ib-container', 'Container #', `value="${esc(ib.container_number || '')}"`)}
        ${field('ib-carrier', 'Carrier', `value="${esc(ib.carrier || '')}"`)}
        ${field('ib-eta', 'ETA', `value="${esc(ib.eta || '')}"`)}
        <label>Vendor PO<select class="data-input" id="ib-po">${poOpts}</select></label>
        <label class="ops-span-2">Notes<textarea class="data-input" id="ib-notes" rows="2">${esc(ib.notes || '')}</textarea></label>
      </div>
      <h3 style="margin-top:16px">Expected lines</h3>
      ${editorTable(['SKU', 'Size', 'Expected', 'Received', 'Recv now', ''], lines.length ? lines : [ibLineRow({})], 'ops-ib-lines')}
      <div class="ops-btn-row"><button class="ops-btn" data-add-ibline>Add line</button></div>
    </div>`;
}

function collectIbLines() {
  const lines = [];
  document.querySelectorAll('[data-ibline]').forEach((row) => {
    const code = row.querySelector('[name=code]').value.trim();
    const qty = parseInt(row.querySelector('[name=qty]').value, 10) || 0;
    if (!code || qty < 1) return;
    const recvEl = row.querySelector('[name=recv]');
    const recvNow = recvEl ? parseInt(recvEl.value, 10) || 0 : 0;
    lines.push({
      code,
      size: row.querySelector('[name=size]').value.trim(),
      qty,
      recvNow,
    });
  });
  return lines;
}

/* ---------------- Finance ---------------- */

export async function viewFinanceDesk(filter) {
  const f = ['open', 'paid', 'all'].includes(filter) ? filter : 'open';
  const [rows, methods] = await Promise.all([ops('/finance/ar'), payMethods()]);
  const filtered = (rows || [])    .filter((r) => {
    const st = String(r.paymentStatus || 'unpaid').toLowerCase();
    if (f === 'open') return ['unpaid', 'partial'].includes(st);
    if (f === 'paid') return st === 'paid';
    return true;
  });
  const body = filtered.map(
    (r) => `<tr>
      <td data-go="orders/${esc(r.id)}">${esc(r.id)}</td>
      <td data-go="orders/${esc(r.id)}">${esc(custName(r.customer))}</td>
      <td class="num">${money(r.total)}</td>
      <td>${pill(r.paymentStatus)}</td>
      <td>${pill(r.fulfillment)}</td>
      <td>
        ${
          String(r.paymentStatus || '').toLowerCase() !== 'paid'
            ? `<button class="ops-btn ops-btn-gold" data-mark-paid="${esc(r.id)}">Mark paid</button>`
            : ''
        }
        <button class="ops-btn" data-go="orders/${esc(r.id)}">Invoice</button>
      </td>
    </tr>`
  );
  const open = (rows || []).filter((r) => ['unpaid', 'partial'].includes(String(r.paymentStatus || 'unpaid').toLowerCase()));
  const amt = open.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const fee = methods.card && methods.card.feePercent != null ? methods.card.feePercent : 3;
  return `
    <div class="ops-row"><h1 class="ops-h1">Accounts receivable</h1>
      <span class="ops-sub">${open.length} open · ${money(amt)}</span></div>
    <div class="ops-tabs" style="margin-bottom:12px">
      <a href="#/finance/open" class="${f === 'open' ? 'is-on' : ''}">Open</a>
      <a href="#/finance/paid" class="${f === 'paid' ? 'is-on' : ''}">Paid</a>
      <a href="#/finance/all" class="${f === 'all' ? 'is-on' : ''}">All</a>
    </div>
    ${table(['Order', 'Customer', 'Total', 'Pay', 'Fulfillment', ''], body, { nav: false })}
    <div class="ops-card" style="margin-top:16px">
      <h3>How customers pay</h3>
      <dl class="ops-dl">
        <dt>Zelle</dt><dd>${esc((methods.zelle && methods.zelle.email) || '')} ${esc((methods.zelle && methods.zelle.handle) || '')}</dd>
        <dt>Card</dt><dd>Banquest hosted page · ${esc(fee)}% convenience fee · same Pay via Card control on each order</dd>
        <dt>Wire</dt><dd style="white-space:pre-line">${esc((methods.wire && methods.wire.instructions) || '')}</dd>
        <dt>ACH</dt><dd style="white-space:pre-line">${esc((methods.ach && methods.ach.instructions) || '')}</dd>
      </dl>
    </div>`;
}

/* ---------------- Events ---------------- */

export async function handleDeskClick(t) {
  try {
    if (t.dataset.saveCustomer) {
      await saveCustomer(t.dataset.saveCustomer);
      return true;
    }
    if (t.dataset.delCustomer) {
      if (!confirmAct('Permanently delete this customer?')) return true;
      await api('/admin/users?id=' + encodeURIComponent(t.dataset.delCustomer), { method: 'DELETE' });
      flash('Customer deleted');
      go('customers');
      return true;
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
      flash('Address saved');
      await rerender();
      return true;
    }
    if (t.dataset.delAddr) {
      await api('/admin/addresses?id=' + encodeURIComponent(t.dataset.delAddr), { method: 'DELETE' });
      flash('Address deleted');
      await rerender();
      return true;
    }
    if (t.dataset.saveProduct != null) {
      const p = collectProduct();
      if (!p.code || !p.size) throw new Error('Code and size are required');
      await api('/admin/products', { method: 'PUT', body: JSON.stringify(p) });
      invalidateCatalog();
      flash('Product saved');
      go('inventory/edit/' + encodeURIComponent(p.code) + '/' + encodeURIComponent(p.size));
      return true;
    }
    if (t.dataset.delProduct != null) {
      if (!confirmAct('Delete this SKU from the catalog?')) return true;
      await api(
        '/admin/products?code=' + encodeURIComponent(t.dataset.code) + '&size=' + encodeURIComponent(t.dataset.size),
        { method: 'DELETE' }
      );
      invalidateCatalog();
      flash('SKU deleted');
      go('inventory');
      return true;
    }
    if (t.dataset.exportCsv != null) {
      await exportCatalogCsv();
      return true;
    }
    if (t.dataset.stockReceive != null) {
      const code = val('st-code');
      const size = val('st-size');
      const qty = num('st-qty', 0);
      if (!code || !size || qty < 1) throw new Error('SKU, size, and positive qty required');
      await api('/admin/products/receive', { method: 'POST', body: JSON.stringify({ items: [{ code, size, qty }] }) });
      invalidateCatalog();
      flash('Received ' + qty);
      await rerender();
      return true;
    }
    if (t.dataset.stockAdjust) {
      const code = val('st-code');
      const size = val('st-size');
      let delta = num('st-qty', 0);
      if (t.dataset.stockAdjust === 'minus') delta = -Math.abs(delta);
      if (!code || !size || !delta) throw new Error('SKU, size, and non-zero qty required');
      await api('/admin/products/adjust', { method: 'POST', body: JSON.stringify({ items: [{ code, size, delta }] }) });
      invalidateCatalog();
      flash('Adjusted ' + delta);
      await rerender();
      return true;
    }
    if (t.dataset.addOrderAddr != null) {
      const email = orderCustomerEmail();
      const full = val('o-address');
      if (!email) throw new Error('Select or enter a customer email first');
      if (!full || full.toUpperCase() === 'PICKUP') throw new Error('Enter a delivery address to save');
      await api('/admin/addresses', {
        method: 'POST',
        body: JSON.stringify({ email, fullAddress: full, phone: val('o-phone') }),
      });
      const sel = $('o-saved-addr');
      if (sel) {
        const exists = Array.from(sel.options).some(
          (o) => normAddr(o.getAttribute('data-full') || '') === normAddr(full)
        );
        if (!exists) {
          const opt = document.createElement('option');
          opt.value = full;
          opt.setAttribute('data-full', full);
          opt.textContent = full;
          sel.appendChild(opt);
        }
        const chosen = Array.from(sel.options).find(
          (o) => normAddr(o.getAttribute('data-full') || '') === normAddr(full)
        );
        if (chosen) {
          chosen.selected = true;
          sel.value = chosen.value;
        }
      }
      syncOrderAddressBookUi();
      flash('Added to address book');
      loadOrderSavedAddresses(email, full).catch(() => {});
      return true;
    }
    if (t.dataset.saveOrder != null) {
      const payload = collectOrderPayload();
      if (!payload.customer.email && !payload.customer.name) throw new Error('Customer name or email is required');
      const r = await api('/admin/orders', { method: 'POST', body: JSON.stringify(payload) });
      flash('Order saved');
      go('orders/' + (r.orderId || payload.id));
      return true;
    }
    if (t.dataset.delOrder) {
      if (!confirmAct('Delete this order and restore reserved stock?')) return true;
      await api('/admin/orders?id=' + encodeURIComponent(t.dataset.delOrder), { method: 'DELETE' });
      flash('Order deleted');
      go('orders');
      return true;
    }
    if (t.dataset.addHit != null) {
      await addCatalogHit();
      return true;
    }
    if (t.dataset.rmLine != null) {
      const row = t.closest('[data-oline]');
      if (row) row.remove();
      return true;
    }
    if (t.dataset.markPaid) {
      await api('/admin/orders/mark-paid', {
        method: 'POST',
        body: JSON.stringify({ id: t.dataset.markPaid, paymentStatus: 'paid', paymentMethod: 'other' }),
      });
      flash('Marked paid');
      await rerender();
      return true;
    }
    if (t.dataset.banquest) {
      const order = await ops('/orders/' + encodeURIComponent(t.dataset.banquest));
      const D = window.APBSDocs;
      const methods = await payMethods();
      const built = D.buildCardPayUrl(orderForDocs(order), methods);
      if (!built.url) throw new Error('No Banquest / card URL configured on the Worker');
      window.open(built.url, '_blank', 'noopener');
      return true;
    }
    if (t.dataset.sendDoc) {
      await sendOrPrintDoc(t.dataset.sendDoc, 'email');
      return true;
    }
    if (t.dataset.printDoc) {
      await sendOrPrintDoc(t.dataset.printDoc, 'print');
      return true;
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
        flash('PO created');
        go('purchasing/' + r.po.id);
      } else {
        await ops('/purchase-orders/' + encodeURIComponent(t.dataset.savePo), {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        flash('PO saved');
        await rerender();
      }
      return true;
    }
    if (t.dataset.delPo) {
      if (!confirmAct('Delete this vendor PO?')) return true;
      await ops('/purchase-orders/' + encodeURIComponent(t.dataset.delPo), { method: 'DELETE' });
      flash('PO deleted');
      go('purchasing');
      return true;
    }
    if (t.dataset.addPoline != null) {
      const tb = $('ops-po-lines');
      if (tb) tb.insertAdjacentHTML('beforeend', poLineRow({}));
      return true;
    }
    if (t.dataset.rmPoline != null) {
      const row = t.closest('[data-poline]');
      if (row) row.remove();
      return true;
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
      flash('Inbound saved');
      go('inbound/' + (r.inbound && r.inbound.id ? r.inbound.id : t.dataset.saveInbound));
      return true;
    }
    if (t.dataset.addIbline != null) {
      const tb = $('ops-ib-lines');
      if (tb) tb.insertAdjacentHTML('beforeend', ibLineRow({}));
      return true;
    }
    if (t.dataset.rmIbline != null) {
      const row = t.closest('[data-ibline]');
      if (row) row.remove();
      return true;
    }
    if (t.dataset.ibRecvForm) {
      const lines = [];
      document.querySelectorAll('[data-ibline]').forEach((row) => {
        const qty = parseInt(row.querySelector('[name=recv]').value, 10) || 0;
        if (qty < 1) return;
        lines.push({
          code: row.querySelector('[name=code]').value.trim(),
          size: row.querySelector('[name=size]').value.trim(),
          qty,
        });
      });
      if (!lines.length) throw new Error('Enter receive qty on at least one line');
      await ops(`/inbound/${encodeURIComponent(t.dataset.ibRecvForm)}/receive`, {
        method: 'POST',
        body: JSON.stringify({ lines }),
      });
      flash('Received into RECEIVING');
      await rerender();
      return true;
    }
  } catch (err) {
    flash(err.message, true);
    return true;
  }
  return false;
}

export async function handleDeskChange(e) {
  if (e.target && e.target.id === 'o-cust') {
    await fillCustomerFromSelect();
    return true;
  }
  if (e.target && e.target.id === 'o-saved-addr') {
    if ($('o-address') && e.target.value) $('o-address').value = e.target.value;
    syncOrderAddressBookUi();
    return true;
  }
  if (e.target && e.target.id === 'o-method') {
    syncOrderAddressBookUi();
    return true;
  }
  const file = e.target.files && e.target.files[0];
  if (!file) return false;
  try {
    if (e.target.hasAttribute('data-csv-replace')) {
      await handleProductCsv(file, 'replace');
      e.target.value = '';
      return true;
    }
    if (e.target.hasAttribute('data-csv-receive')) {
      await handleProductCsv(file, 'receive');
      e.target.value = '';
      return true;
    }
    if (e.target.hasAttribute('data-order-csv')) {
      const text = await readCsvFile(file);
      const rows = parseCSV(text);
      const catalog = await loadCatalog();
      const first = rows[0] || [];
      const looks = /code|sku|size|qty|pieces/i.test(String(first[0] || '') + String(first[1] || ''));
      const start = looks ? 1 : 0;
      const added = [];
      for (let i = start; i < rows.length; i++) {
        const cols = rows[i] || [];
        const code = String(cols[0] || '').trim();
        const size = String(cols[1] || '').trim();
        const qty = parseInt(cols[3] != null && cols[3] !== '' ? cols[3] : cols[2], 10) || 0;
        if (!code || qty < 1) continue;
        const prod = findProduct(catalog, code, size);
        added.push(
          lineRowHtml(
            {
              code,
              size,
              description: prod ? prod.description : '',
              qty,
              qtyShipped: 0,
              unitPrice: prod ? prod.price : parseFloat(cols[4]) || 0,
            },
            0
          )
        );
      }
      const tb = $('ops-lines-body');
      if (tb) tb.insertAdjacentHTML('beforeend', added.join(''));
      flash('Added ' + added.length + ' lines from CSV');
      e.target.value = '';
      return true;
    }
  } catch (err) {
    flash(err.message, true);
    return true;
  }
  return false;
}

export function handleDeskInput(e) {
  if (e.target && e.target.id === 'sku-q') {
    searchSkuHits();
    return true;
  }
  if (e.target && (e.target.id === 'o-address' || e.target.id === 'o-email')) {
    const sel = $('o-saved-addr');
    if (sel && e.target.id === 'o-address') {
      const n = normAddr(e.target.value);
      const match = Array.from(sel.options).find((o) => o.getAttribute('data-full') && normAddr(o.getAttribute('data-full')) === n);
      sel.value = match ? match.value : '';
    }
    syncOrderAddressBookUi();
    return true;
  }
  return false;
}

export function handleHitsClick(e) {
  const btn = e.target.closest('#sku-hits button');
  if (!btn) return false;
  document.querySelectorAll('#sku-hits button').forEach((b) => b.classList.toggle('is-on', b === btn));
  return true;
}
