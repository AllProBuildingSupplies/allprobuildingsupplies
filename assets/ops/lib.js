/** Shared helpers for All Pro OS. */

export const API = () => (window.APBS_API_BASE || '').replace(/\/$/, '');

export function token() {
  return sessionStorage.getItem('apbs_admin_token') || '';
}

export function headers() {
  return window.apbsAdminHeaders
    ? window.apbsAdminHeaders({ 'Content-Type': 'application/json' })
    : { 'Content-Type': 'application/json' };
}

export async function api(path, opts = {}) {
  const r = await fetch(API() + path, {
    ...opts,
    headers: { ...headers(), ...(opts.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (r.status === 401) {
    sessionStorage.removeItem('apbs_admin_token');
    location.reload();
    throw new Error('Unauthorized');
  }
  if (!r.ok) {
    const err = data.error || 'HTTP ' + r.status;
    const detail = data.detail && data.detail !== err ? data.detail : '';
    throw new Error(detail ? err + ': ' + detail : err);
  }
  return data;
}

export async function ops(path, opts = {}) {
  return api('/ops' + path, opts);
}

export function $(id) {
  return document.getElementById(id);
}

export function val(id) {
  const el = $(id);
  return el ? String(el.value || '').trim() : '';
}

export function num(id, fallback = 0) {
  const n = parseFloat(val(id));
  return Number.isFinite(n) ? n : fallback;
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

export function money(n) {
  return '$' + (Number(n) || 0).toFixed(2);
}

export function pill(status) {
  const st = String(status || '').replace(/\s+/g, '_');
  return `<span class="ops-pill ${esc(st)}">${esc(st.replace(/_/g, ' ') || '—')}</span>`;
}

export function custName(c) {
  if (!c) return '—';
  return c.company || c.name || [c.fname, c.lname].filter(Boolean).join(' ') || c.email || '—';
}

export function flash(msg, isErr) {
  const el = $('ops-flash');
  if (!el) return;
  el.hidden = !msg;
  el.textContent = msg || '';
  el.style.borderColor = isErr ? '#c45' : '';
}

export function route() {
  const hash = (location.hash || '#/inbox').replace(/^#/, '');
  const parts = hash.split('/').filter(Boolean);
  return { parts, view: parts[0] || 'inbox', id: parts[1] || '', extra: parts.slice(2) };
}

export function go(path) {
  location.hash = '#/' + String(path || '').replace(/^\//, '');
}

export function table(headers, rows, { nav, emptyOk } = {}) {
  if ((!rows || !rows.length) && !emptyOk) return `<div class="ops-empty">Nothing here yet.</div>`;
  return `<div style="overflow:auto"><table class="ops-table${nav === false ? ' ops-static' : ''}">
    <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${(rows || []).join('')}</tbody>
  </table></div>`;
}

export function field(id, label, attrs = '') {
  return `<label>${esc(label)}<input class="data-input" id="${esc(id)}" ${attrs}></label>`;
}

export function selectField(id, label, options, selected) {
  const opts = options
    .map((o) => {
      const v = typeof o === 'string' ? o : o.value;
      const t = typeof o === 'string' ? o : o.label;
      const on = String(selected || '') === String(v) ? ' selected' : '';
      return `<option value="${esc(v)}"${on}>${esc(t)}</option>`;
    })
    .join('');
  return `<label>${esc(label)}<select class="data-input" id="${esc(id)}">${opts}</select></label>`;
}

export function parseCSV(str) {
  const lines = [];
  let curLine = [];
  let curStr = '';
  let inQ = false;
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '"') {
      if (inQ && str[i + 1] === '"') {
        curStr += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === ',' && !inQ) {
      curLine.push(curStr);
      curStr = '';
    } else if ((c === '\n' || c === '\r') && !inQ) {
      if (c === '\r' && str[i + 1] === '\n') i++;
      curLine.push(curStr);
      lines.push(curLine);
      curLine = [];
      curStr = '';
    } else curStr += c;
  }
  if (curStr !== '' || curLine.length > 0) {
    curLine.push(curStr);
    lines.push(curLine);
  }
  return lines;
}

export function csvEscape(v) {
  const s = String(v == null ? '' : v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function readCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(new TextDecoder('utf-8').decode(new Uint8Array(e.target.result)));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

let catalogCache = null;

export function invalidateCatalog() {
  catalogCache = null;
}

export async function loadCatalog() {
  if (catalogCache) return catalogCache;
  const rows = await api('/products');
  catalogCache = Array.isArray(rows) ? rows : rows.products || [];
  return catalogCache;
}

export function findProduct(list, code, size) {
  if (window.apbsFindProduct) return window.apbsFindProduct(list, code, size);
  const c = String(code || '').trim();
  const s = String(size || '').trim();
  return (list || []).find((p) => String(p.code) === c && String(p.size) === s) || null;
}

export function skuKey(code, size) {
  return String(code || '') + '\x1e' + String(size || '');
}

export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function confirmAct(msg) {
  return window.confirm(msg);
}
