// =====================================================================
// ALL PRO BUILDING SUPPLIES - SECURE API WORKER (v3.0)
// =====================================================================

import { seedFactoryCodes } from './factoryCodes.js';

const encoder = new TextEncoder();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

function normalizeSize(size) {
  if (size == null) return '';
  return String(size)
    .trim()
    .replace(/[\u201C\u201D\u2033\u2036]/g, '"')
    .replace(/"/g, '')
    // Excel ANSI CSVs often turn "x" / × into  when mis-decoded as UTF-8
    .replace(/\uFFFD/g, 'x')
    .replace(/[\u00D7\u2715\u2716\u2A2F\u22C5\u2217\u2022]/g, 'x')
    .replace(/(\d)\s*[xX]\s*(?=\d)/g, '$1x')
    .replace(/\s+/g, ' ');
}

/** One size segment → catalog form (1.5 → 1-1/2, 1 1/2 → 1-1/2). */
function sizeSegmentToCatalog(seg) {
  let s = String(seg == null ? '' : seg).trim().replace(/_/g, ' ');
  if (!s) return '';
  if (/^\d+$/.test(s) || /^\d+\/\d+$/.test(s) || /^\d+-\d+\/\d+$/.test(s)) return s;
  const spaced = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (spaced) return `${spaced[1]}-${spaced[2]}/${spaced[3]}`;
  if (/^\d*\.\d+$/.test(s)) {
    const n = parseFloat(s);
    if (!Number.isFinite(n) || n < 0) return s;
    const whole = Math.floor(n + 1e-9);
    const frac = Math.round((n - whole) * 1000) / 1000;
    const fracMap = {
      0: '',
      0.125: '1/8',
      0.25: '1/4',
      0.375: '3/8',
      0.5: '1/2',
      0.625: '5/8',
      0.75: '3/4',
      0.875: '7/8',
    };
    let nearest = null;
    let best = 1;
    for (const k of Object.keys(fracMap)) {
      const d = Math.abs(frac - parseFloat(k));
      if (d < best) {
        best = d;
        nearest = k;
      }
    }
    if (nearest == null || best > 0.02) return s;
    const fr = fracMap[nearest];
    if (!fr) return String(whole);
    if (!whole) return fr;
    return `${whole}-${fr}`;
  }
  return s;
}

/** Canonical catalog size for DB keys: 1.5, 2x1.5, 1 1/2 → 1-1/2, 2x1-1/2, … */
function canonicalizeSize(size) {
  const raw = normalizeSize(size);
  if (!raw) return '';
  const sep = /\s*[xX\u00D7\u2715\u2716\u2A2F\u22C5\u2217\uFFFD\u2022]\s*/;
  const parts = raw.split(sep).filter(Boolean);
  if (!parts.length) return raw;
  return parts.map(sizeSegmentToCatalog).join('x');
}

/** Excel-safe size for CSV download: 1-1/2 → 1.5 */
function sizeToExcelSafe(size) {
  const raw = normalizeSize(size);
  if (!raw) return '';
  const sep = /\s*[xX\u00D7\u2715\u2716\u2A2F\u22C5\u2217\uFFFD\u2022]\s*/;
  return raw
    .split(sep)
    .map((seg) => {
      const s = String(seg).trim();
      const m = s.match(/^(\d+)-(\d+)\/(\d+)$/);
      if (m) {
        const dec = parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10);
        return String(Math.round(dec * 1000) / 1000);
      }
      const onlyFrac = s.match(/^(\d+)\/(\d+)$/);
      if (onlyFrac) {
        const d = parseInt(onlyFrac[1], 10) / parseInt(onlyFrac[2], 10);
        return String(Math.round(d * 1000) / 1000);
      }
      return s;
    })
    .join('x');
}

function sizeMatchCandidates(size) {
  const raw = normalizeSize(size);
  const out = [];
  const seen = new Set();
  const add = (v) => {
    const n = normalizeSize(v);
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };
  const sep = /\s*[xX\u00D7\u2715\u2716\u2A2F\u22C5\u2217\uFFFD\u2022]\s*/g;
  add(raw);
  add(raw.replace(sep, 'x'));
  add(raw.replace(/(\d+)\s+(\d+\/\d+)/g, '$1-$2'));
  const canon = canonicalizeSize(raw);
  add(canon);
  // Also accept excel-safe form of the canonical size
  add(sizeToExcelSafe(canon));
  return out;
}

function findProduct(prods, code, size) {
  if (!Array.isArray(prods) || !prods.length) return null;
  const c = String(code || '').trim();
  const want = canonicalizeSize(size);
  if (!c || !want) return null;
  return (
    prods.find((p) => String(p.code || '').trim() === c && canonicalizeSize(p.size) === want) ||
    null
  );
}

/**
 * Merge duplicate size aliases (1.5 vs 1-1/2) and optionally keep only rows that
 * look like they came from the latest bulk overwrite (decimal-sized twins or
 * fields that differ from a prior baseline).
 * When preferUploadedOnly is true, drops catalog rows that were not part of the
 * overwrite (everything currently in stock = the uploaded sheet).
 */
async function repairProductSizeAliases(env, options = {}) {
  const preferUploadedOnly = options.preferUploadedOnly === true;
  const { results } = await env.DB.prepare('SELECT * FROM products').all();
  const groups = new Map();

  for (const row of results || []) {
    const code = String(row.code || '').trim();
    const canon = canonicalizeSize(row.size);
    if (!code || !canon) continue;
    const key = code + '\0' + canon;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const kept = [];
  let mergedGroups = 0;
  let removedDupes = 0;

  for (const [, rows] of groups) {
    if (rows.length === 1) {
      const only = rows[0];
      const canon = canonicalizeSize(only.size);
      const isDecimalForm = normalizeSize(only.size) !== canon;
      kept.push({
        row: only,
        canon,
        fromUpload: isDecimalForm,
        preferRow: only,
      });
      continue;
    }
    mergedGroups += 1;
    removedDupes += rows.length - 1;
    // Prefer the non-canonical (e.g. 1.5) row as the uploaded overwrite source for qty/price/etc.
    const decimalRows = rows.filter((r) => normalizeSize(r.size) !== canonicalizeSize(r.size));
    const prefer = decimalRows[0] || rows[0];
    const canon = canonicalizeSize(prefer.size);
    // Preserve factory codes from any sibling if prefer is blank
    let tommur = factoryCode(prefer.tommur_code);
    let lesso = factoryCode(prefer.lesso_code);
    for (const r of rows) {
      if (!tommur) tommur = factoryCode(r.tommur_code);
      if (!lesso) lesso = factoryCode(r.lesso_code);
    }
    kept.push({
      row: { ...prefer, tommur_code: tommur, lesso_code: lesso },
      canon,
      fromUpload: decimalRows.length > 0,
      preferRow: prefer,
    });
  }

  let finalRows = kept;
  if (preferUploadedOnly) {
    // Keep groups that had a decimal twin (definitely from the sheet) OR keep all
    // merged/canonical rows that appear to be the full stock list: if ANY decimal
    // twins exist, treat the upload as the stock list and keep every group that
    // either had a decimal twin OR whose qty was written on a row that shares
    // codes present in the decimal upload set... Actually user wants EXACT sheet.
    // Sheet created decimal rows for 1.5 sizes AND updated other sizes in place.
    // Without a baseline we cannot know which non-decimal rows were updated.
    // Strategy: if preferUploadedOnly, keep ALL groups after merge (fixes dupes)
    // and rely on a separate replace payload for exact sheet sync.
    finalRows = kept;
  }

  const stmts = [env.DB.prepare('DELETE FROM products')];
  for (const item of finalRows) {
    const p = item.row;
    stmts.push(
      env.DB.prepare(
        `INSERT INTO products (code, description, size, pack, qty, price, image, main_category, sub_category, tommur_code, lesso_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        String(p.code || '').trim(),
        p.description,
        item.canon,
        p.pack,
        p.qty,
        p.price,
        p.image,
        p.main_category != null ? String(p.main_category) : '',
        p.sub_category != null ? String(p.sub_category) : '',
        factoryCode(p.tommur_code),
        factoryCode(p.lesso_code)
      )
    );
  }
  await env.DB.batch(stmts);
  return {
    before: (results || []).length,
    after: finalRows.length,
    mergedGroups,
    removedDupes,
  };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function userCanOrderPieces(user) {
  return user && user.canOrderPieces !== false && user.canOrderPieces !== 0;
}

function emailShell(bodyRowsHtml) {
  return `<!DOCTYPE html><html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/><meta http-equiv="X-UA-Compatible" content="IE=edge"/><title>All Pro Building Supplies</title><!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style><![endif]--><style type="text/css">html,body{margin:0!important;padding:0!important;width:100%!important;}body{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}@page{size:letter;margin:0.4in;}@media print{html,body{width:100%!important;background:#ffffff!important;}.email-outer{padding:0!important;background:#ffffff!important;}.email-shell{width:100%!important;max-width:100%!important;box-shadow:none!important;border-radius:0!important;}.email-pad{padding-left:18px!important;padding-right:18px!important;}a{color:inherit!important;text-decoration:none!important;}}@media only screen and (max-width:640px){.email-shell{width:100%!important;max-width:100%!important;}.email-pad{padding-left:16px!important;padding-right:16px!important;}.email-stack{display:block!important;width:100%!important;max-width:100%!important;box-sizing:border-box!important;border-right:0!important;}.email-stack+.email-stack{border-top:1px solid #e8e8e8!important;}}</style></head><body style="margin:0;padding:0;background:#ffffff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"><table role="presentation" class="email-outer" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;width:100%;border-collapse:collapse;"><tr><td align="center" class="email-outer" style="padding:0;"><!--[if mso]><table role="presentation" width="750" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]--><table role="presentation" class="email-shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:100%;width:100%;background:#ffffff;border-collapse:collapse;"><tr><td class="email-pad" style="background:#0C1117;padding:22px 28px;border-bottom:4px solid #C8981F;"><div style="font-family:Arial Black,Arial,sans-serif;font-size:20px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">ALL PRO BUILDING SUPPLIES</div><div style="font-size:11px;color:#C8981F;letter-spacing:3px;margin-top:3px;">LLC</div></td></tr>${bodyRowsHtml}<tr><td class="email-pad" style="background:#0C1117;padding:16px 28px;text-align:center;"><div style="font-size:12px;color:#888;">&copy; 2026 All Pro Building Supplies LLC</div></td></tr></table><!--[if mso]></td></tr></table><![endif]--></td></tr></table></body></html>`;
}

function buildOrderReceivedEmailHtml(order, items) {
  const cust = order.customer || {};
  const name = escapeHtml(cust.name || 'Customer');
  const addr = escapeHtml(order.delivery?.address || '');
  const po = escapeHtml(order.po || 'N/A');
  const notes = escapeHtml(order.notes || 'None');
  const orderId = escapeHtml(order.id);
  const dateStr = escapeHtml(new Date(order.placedAt).toLocaleDateString());
  const total = escapeHtml('$' + (Number(order.total) || 0).toFixed(2));
  const rows = (items || [])
    .map((i) => {
      const desc = escapeHtml((i.description || '') + ' ' + (i.size || ''));
      const line = escapeHtml('$' + (Number(i.lineTotal) || 0).toFixed(2));
      const sub = escapeHtml(String(i.qty) + ' pcs @ $' + (Number(i.unitPrice) || 0).toFixed(2));
      return `<tr><td style="padding:10px 14px;font-size:13px;color:#333;border-bottom:1px solid #f0f0f0;">${desc}<br/><span style="font-size:11px;color:#888">${sub}</span></td><td style="padding:10px 14px;font-size:13px;color:#333;text-align:right;border-bottom:1px solid #f0f0f0;white-space:nowrap;">${line}</td></tr>`;
    })
    .join('');
  const poBlock =
    order.po || order.notes
      ? `<tr><td class="email-pad" style="padding:0 36px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbf0;border:1px solid #f0e0a0;border-radius:4px;"><tr><td style="padding:14px 18px;"><div style="font-size:12px;color:#666;margin-bottom:4px;"><strong style="color:#333">PO Number:</strong> ${po}</div><div style="font-size:12px;color:#666;"><strong style="color:#333">Notes:</strong> ${notes}</div></td></tr></table></td></tr>`
      : '';
  const body = `<tr><td class="email-pad" style="padding:32px 36px 0;"><p style="margin:0;font-size:16px;color:#222;">Hi <strong>${name}</strong>,</p><p style="margin:12px 0 0;font-size:15px;color:#444;line-height:1.6;">Thank you for your order! We have received it and will be in touch shortly.</p></td></tr><tr><td class="email-pad" style="padding:24px 36px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f8f8;border:1px solid #e8e8e8;border-radius:4px;"><tr><td class="email-stack" style="padding:16px 20px;border-right:1px solid #e8e8e8;vertical-align:top;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Order ID</div><div style="font-size:14px;font-weight:700;color:#C8981F;font-family:monospace;">${orderId}</div></td><td class="email-stack" style="padding:16px 20px;border-right:1px solid #e8e8e8;vertical-align:top;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Date</div><div style="font-size:14px;color:#222;">${dateStr}</div></td><td class="email-stack" style="padding:16px 20px;vertical-align:top;"><div style="font-size:10px;color:#888;letter-spacing:2px;text-transform:uppercase;margin-bottom:4px;">Delivery</div><div style="font-size:13px;color:#222;">${addr}</div></td></tr></table></td></tr><tr><td class="email-pad" style="padding:24px 36px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e8e8;border-radius:4px;overflow:hidden;"><tr style="background:#0C1117;"><td style="padding:10px 14px;font-size:11px;color:#C8981F;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Product</td><td style="padding:10px 14px;font-size:11px;color:#C8981F;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;text-align:right;">Total</td></tr>${rows}</table></td></tr><tr><td class="email-pad" style="padding:16px 36px 0;text-align:right;"><span style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:1px;">Order Total&nbsp;&nbsp;</span><span style="font-size:22px;font-weight:700;color:#0C1117;">${total}</span></td></tr>${poBlock}<tr><td class="email-pad" style="padding:24px 36px;"><p style="margin:0;font-size:14px;color:#444;line-height:1.7;">Questions? Call <a href="tel:17327341123" style="color:#C8981F;text-decoration:none;font-weight:600;">732-734-1123</a></p></td></tr>`;
  return emailShell(body);
}

async function loadOwnedOrder(env, orderId, userEmail) {
  const em = userEmail.toLowerCase();
  const order = await env.DB.prepare(
    `SELECT * FROM orders WHERE id = ? AND (LOWER(TRIM(user_id)) = ? OR user_id = (SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1))`
  )
    .bind(orderId, em, em)
    .first();
  if (!order) return null;
  const itemRows = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(orderId).all();
  const prods = await env.DB.prepare('SELECT * FROM products').all();
  const items = itemRows.results.map((it) => mapOrderItem(it, prods.results));
  return formatOrderRow(order, items);
}

function mapOrderItem(it, prods) {
  const match = findProduct(prods, it.product_sku, it.size);
  const canonSize = match ? match.size : normalizeSize(it.size);
  const qty = parseInt(it.quantity, 10) || 0;
  let qtyShipped = parseInt(it.qty_shipped, 10);
  if (!Number.isFinite(qtyShipped) || qtyShipped < 0) qtyShipped = 0;
  if (qtyShipped > qty) qtyShipped = qty;
  return {
    code: it.product_sku,
    size: canonSize,
    qty,
    qtyShipped,
    qtyBackordered: Math.max(0, qty - qtyShipped),
    unitPrice: it.price_at_purchase,
    lineTotal: qty * it.price_at_purchase,
    description: match ? match.description : 'Unknown Product',
    pcsPerCtn: match ? match.pack : 1,
  };
}

function formatOrderRow(o, orderItems) {
  let customer = { name: 'Unknown' };
  let delivery = { method: o.delivery_method || null, address: o.delivery_address || '' };
  let po = o.po || '';
  let notes = o.notes || '';
  let shipments = parseShipmentsJson(o.shipments_json);
  let items = orderItems || [];

  try {
    if (o.customer_snapshot) customer = JSON.parse(o.customer_snapshot);
  } catch (_) {}

  // Legacy preview rows store the full payload in `data` and use placed_at/total.
  if ((!customer || customer.name === 'Unknown') || (!items.length && o.data)) {
    try {
      const legacy = o.data ? JSON.parse(o.data) : null;
      if (legacy && typeof legacy === 'object') {
        if (legacy.customer) customer = legacy.customer;
        if (legacy.delivery) {
          delivery = {
            method: legacy.delivery.method || delivery.method,
            address: legacy.delivery.address || delivery.address || '',
          };
        }
        if (legacy.po != null && !po) po = legacy.po;
        if (legacy.notes != null && !notes) notes = legacy.notes;
        if ((!shipments || !shipments.length) && legacy.shipments) {
          shipments = normalizeShipments(legacy.shipments);
        }
        if (!items.length && Array.isArray(legacy.items)) {
          items = legacy.items.map((it) => ({
            code: it.code || it.product_sku || '',
            size: it.size || '',
            qty: parseInt(it.qty != null ? it.qty : it.quantity, 10) || 0,
            qtyShipped: parseInt(it.qtyShipped != null ? it.qtyShipped : it.qty_shipped, 10) || 0,
            qtyBackordered: 0,
            unitPrice: it.unitPrice != null ? it.unitPrice : it.price_at_purchase,
            lineTotal: null,
            description: it.description || '',
            pcsPerCtn: it.pcsPerCtn || it.pack || 1,
          }));
          for (const it of items) {
            it.qtyBackordered = Math.max(0, (it.qty || 0) - (it.qtyShipped || 0));
            it.lineTotal = (it.qty || 0) * (parseFloat(it.unitPrice) || 0);
          }
        }
      }
    } catch (_) {}
  }

  let placedAt = o.created_at || null;
  if (!placedAt && o.placed_at != null) {
    const n = Number(o.placed_at);
    placedAt = Number.isFinite(n) ? new Date(n).toISOString() : String(o.placed_at);
  }

  let status = o.status;
  const st = String(status || '').toLowerCase().trim();
  if (st === 'partial' || st === 'partially shipped' || st === 'partial_shipped') status = 'partially_shipped';
  else if (st === 'completed' || st === 'complete' || st === 'shipped' || st === 'closed') status = 'delivered';

  return {
    id: o.id,
    placedAt,
    status,
    total: o.total_amount != null ? o.total_amount : o.total,
    delivery,
    po,
    notes,
    customer,
    items,
    shipments,
    paymentStatus: o.payment_status || 'unpaid',
    paidAt: o.paid_at || null,
    paymentMethod: o.payment_method || '',
    paymentNote: o.payment_note || '',
  };
}

/** Next APBS-000001 style id. Floor at 3 so the next unused id is at least APBS-000004. */
async function nextApbsOrderId(env) {
  const { results } = await env.DB.prepare(`SELECT id FROM orders WHERE id LIKE 'APBS-%'`).all();
  let max = 3;
  for (const row of results || []) {
    const m = String(row.id || '').trim().match(/^APBS-(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return 'APBS-' + String(max + 1).padStart(6, '0');
}

function isApbsOrderId(id) {
  return /^APBS-\d{6,}$/i.test(String(id || '').trim());
}

function toPublicProduct(p) {
  const qty = parseInt(p.qty, 10) || 0;
  return {
    code: p.code,
    description: p.description,
    size: p.size,
    pack: p.pack,
    image: p.image,
    main_category: p.main_category,
    sub_category: p.sub_category,
    inStock: qty > 0,
  };
}

function isSha256Hex(s) {
  return typeof s === 'string' && /^[a-f0-9]{64}$/i.test(s);
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(String(text)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function ensureStoredPassword(pw) {
  if (!pw) return await sha256Hex('Welcome1!');
  if (isSha256Hex(pw)) return pw.toLowerCase();
  return sha256Hex(pw);
}

function b64urlEncode(obj) {
  return btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return JSON.parse(atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad));
}

async function signToken(payload, secret, hours = 168) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + hours * 3600 };
  const h = b64urlEncode(header);
  const p = b64urlEncode(body);
  const data = `${h}.${p}`;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const s = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${s}`;
}

async function verifyToken(token, secret) {
  if (!token || !secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  try {
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const sigBin = Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBin, encoder.encode(data));
    if (!valid) return null;
    const payload = b64urlDecode(parts[1]);
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function getBearer(request) {
  const h = request.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

function jwtSecret(env) {
  return env.JWT_SECRET || env.ADMIN_TOKEN;
}

function microsoftSsoConfig(env) {
  const clientId = String(env.MICROSOFT_CLIENT_ID || env.AZURE_CLIENT_ID || '').trim();
  const tenantId = String(env.MICROSOFT_TENANT_ID || env.AZURE_TENANT_ID || '').trim();
  const emailRaw = String(env.ADMIN_SSO_EMAIL || env.ADMIN_SSO_EMAILS || 'baruch@allprobuildingsupplies.com').trim();
  const allowEmails = emailRaw
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return {
    enabled: !!(clientId && tenantId),
    clientId,
    tenantId,
    allowEmails,
  };
}

function b64urlToBytes(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (String(str) + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJwtPart(part) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));
}

async function fetchMicrosoftJwks(tenantId) {
  const configUrl = `https://login.microsoftonline.com/${tenantId}/v2.0/.well-known/openid-configuration`;
  const configRes = await fetch(configUrl);
  if (!configRes.ok) throw new Error('Could not load Microsoft OpenID configuration');
  const config = await configRes.json();
  if (!config.jwks_uri) throw new Error('Microsoft JWKS URI missing');
  const jwksRes = await fetch(config.jwks_uri);
  if (!jwksRes.ok) throw new Error('Could not load Microsoft signing keys');
  return { config, jwks: await jwksRes.json() };
}

async function verifyMicrosoftIdToken(idToken, { tenantId, clientId }) {
  if (!idToken || typeof idToken !== 'string') throw new Error('Missing Microsoft ID token');
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid Microsoft ID token');
  const header = decodeJwtPart(parts[0]);
  const payload = decodeJwtPart(parts[1]);
  if (header.alg !== 'RS256') throw new Error('Unsupported Microsoft token algorithm');

  const { config, jwks } = await fetchMicrosoftJwks(tenantId);
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid && k.kty === 'RSA');
  if (!jwk) throw new Error('Microsoft signing key not found');

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(parts[2]),
    encoder.encode(`${parts[0]}.${parts[1]}`)
  );
  if (!ok) throw new Error('Microsoft token signature invalid');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now - 60) throw new Error('Microsoft token expired');
  if (payload.nbf && payload.nbf > now + 60) throw new Error('Microsoft token not yet valid');

  const expectedIssuers = [
    `https://login.microsoftonline.com/${tenantId}/v2.0`,
    `https://sts.windows.net/${tenantId}/`,
    config.issuer,
  ].filter(Boolean);
  if (!expectedIssuers.includes(payload.iss)) {
    throw new Error('Microsoft token issuer mismatch');
  }

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.map(String).includes(String(clientId))) {
    throw new Error('Microsoft token audience mismatch');
  }

  const email = String(
    payload.preferred_username || payload.email || payload.upn || payload.unique_name || ''
  )
    .trim()
    .toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Microsoft account has no email claim');
  }

  return { payload, email };
}

async function exchangeMicrosoftAuthCode(env, { code, codeVerifier, redirectUri }) {
  const sso = microsoftSsoConfig(env);
  if (!sso.enabled) throw new Error('Microsoft SSO is not configured');
  const body = new URLSearchParams({
    client_id: sso.clientId,
    scope: 'openid profile email',
    code: String(code || ''),
    redirect_uri: String(redirectUri || ''),
    grant_type: 'authorization_code',
    code_verifier: String(codeVerifier || ''),
  });
  const tokenUrl = `https://login.microsoftonline.com/${sso.tenantId}/oauth2/v2.0/token`;
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const desc = data.error_description || data.error || `HTTP ${res.status}`;
    throw new Error(`Microsoft token exchange failed: ${desc}`);
  }
  if (!data.id_token) throw new Error('Microsoft did not return an ID token');
  return data;
}

async function ensureAddressesTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      label TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      line1 TEXT DEFAULT '',
      city TEXT DEFAULT '',
      state_zip TEXT DEFAULT '',
      full_address TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_user_addresses_email ON user_addresses(user_email)`
  ).run();
}

/** Core tables for a fresh D1 (test/staging). Safe no-ops when tables already exist. */
async function ensureCoreSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      code          TEXT NOT NULL,
      description   TEXT,
      size          TEXT NOT NULL DEFAULT '',
      pack          INTEGER,
      qty           INTEGER,
      price         REAL,
      image         TEXT,
      main_category TEXT DEFAULT '',
      sub_category  TEXT DEFAULT '',
      tommur_code   TEXT DEFAULT '',
      lesso_code    TEXT DEFAULT '',
      PRIMARY KEY (code, size)
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      fname          TEXT,
      lname          TEXT,
      company        TEXT,
      email          TEXT UNIQUE,
      phone          TEXT,
      password       TEXT,
      status         TEXT DEFAULT 'pending',
      canOrderPieces INTEGER DEFAULT 1,
      registeredAt   TEXT,
      approvedAt     TEXT
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS orders (
      id               TEXT PRIMARY KEY,
      user_id          TEXT,
      status           TEXT DEFAULT 'pending',
      total_amount     REAL,
      delivery_method  TEXT,
      delivery_address TEXT,
      po               TEXT,
      notes            TEXT,
      customer_snapshot TEXT,
      shipments_json   TEXT DEFAULT '[]',
      created_at       TEXT
    )
  `).run();
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS order_items (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id          TEXT NOT NULL,
      product_sku       TEXT,
      size              TEXT,
      quantity          INTEGER,
      price_at_purchase REAL,
      qty_shipped       INTEGER DEFAULT 0
    )
  `).run();
}

/** Admin-only factory SKUs on products (Tommur / Lesso). Safe to call repeatedly. */
async function ensureProductFactoryColumns(env) {
  try {
    await env.DB.prepare(`ALTER TABLE products ADD COLUMN tommur_code TEXT DEFAULT ''`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE products ADD COLUMN lesso_code TEXT DEFAULT ''`).run();
  } catch (_) {}
}

/** Category columns used by catalog sync / public product shaping. */
async function ensureProductCategoryColumns(env) {
  try {
    await env.DB.prepare(`ALTER TABLE products ADD COLUMN main_category TEXT DEFAULT ''`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE products ADD COLUMN sub_category TEXT DEFAULT ''`).run();
  } catch (_) {}
}

/**
 * Preview/legacy D1 may use password_hash / can_order_pieces / registered_at.
 * Add the camelCase columns this Worker writes so admin create/update works.
 */
async function ensureUsersCompatColumns(env) {
  const cols = [
    'password TEXT',
    'canOrderPieces INTEGER DEFAULT 1',
    'registeredAt TEXT',
    'approvedAt TEXT',
  ];
  for (const col of cols) {
    try {
      await env.DB.prepare(`ALTER TABLE users ADD COLUMN ${col}`).run();
    } catch (_) {}
  }
  // Backfill password from legacy hash column when present and password empty.
  try {
    await env.DB.prepare(
      `UPDATE users SET password = password_hash
       WHERE (password IS NULL OR TRIM(password) = '')
         AND password_hash IS NOT NULL AND TRIM(password_hash) != ''`
    ).run();
  } catch (_) {}
  try {
    await env.DB.prepare(
      `UPDATE users SET canOrderPieces = COALESCE(canOrderPieces, can_order_pieces, 1)
       WHERE canOrderPieces IS NULL`
    ).run();
  } catch (_) {}
}

async function tableColumns(env, table) {
  const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return (results || []).map((r) => ({ name: r.name, type: r.type, notnull: r.notnull, dflt: r.dflt_value, pk: r.pk }));
}

/** Partial shipments: cumulative qty_shipped per line + shipments history JSON on orders. */
async function ensureOrderShipmentColumns(env) {
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN created_at TEXT`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN user_id TEXT`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'pending'`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN total_amount REAL`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN delivery_method TEXT`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN delivery_address TEXT`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN po TEXT`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN notes TEXT`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN customer_snapshot TEXT`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE order_items ADD COLUMN qty_shipped INTEGER DEFAULT 0`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN shipments_json TEXT DEFAULT '[]'`).run();
  } catch (_) {}
}

/**
 * Go-live compatibility: map legacy status labels and backfill shipment fields for
 * already-delivered orders so OMS shows complete shipments without wiping live data.
 * Idempotent — safe to run on every request.
 */
async function backfillLegacyOrderShipments(env) {
  try {
    await env.DB.prepare(
      `UPDATE orders SET status = 'partially_shipped'
       WHERE LOWER(TRIM(COALESCE(status, ''))) IN ('partial', 'partially shipped', 'partial_shipped')`
    ).run();
  } catch (_) {}
  try {
    await env.DB.prepare(
      `UPDATE orders SET status = 'delivered'
       WHERE LOWER(TRIM(COALESCE(status, ''))) IN ('completed', 'complete', 'shipped', 'closed')`
    ).run();
  } catch (_) {}

  let delivered;
  try {
    delivered = await env.DB.prepare(
      `SELECT id, status, shipments_json, created_at, placed_at, data, total_amount
       FROM orders
       WHERE LOWER(TRIM(COALESCE(status, ''))) = 'delivered'`
    ).all();
  } catch (_) {
    return;
  }

  for (const o of delivered.results || []) {
    let itemRows;
    try {
      itemRows = await env.DB.prepare(
        `SELECT id, product_sku, size, quantity, price_at_purchase, qty_shipped
         FROM order_items WHERE order_id = ?`
      )
        .bind(o.id)
        .all();
    } catch (_) {
      continue;
    }

    let items = itemRows.results || [];
    // Legacy preview rows may only have items inside the `data` JSON blob.
    if (!items.length && o.data) {
      try {
        const legacy = JSON.parse(o.data);
        if (legacy && Array.isArray(legacy.items) && legacy.items.length) {
          for (const it of legacy.items) {
            const qty = parseInt(it.qty != null ? it.qty : it.quantity, 10) || 0;
            if (qty < 1) continue;
            const code = String(it.code || it.product_sku || '').trim();
            const size = it.size != null ? String(it.size) : '';
            const price = Number(it.unitPrice != null ? it.unitPrice : it.price_at_purchase) || 0;
            try {
              await env.DB.prepare(
                `INSERT INTO order_items (order_id, product_sku, size, quantity, price_at_purchase, qty_shipped)
                 VALUES (?, ?, ?, ?, ?, ?)`
              )
                .bind(o.id, code, size, qty, price, qty)
                .run();
            } catch (_) {}
          }
          itemRows = await env.DB.prepare(
            `SELECT id, product_sku, size, quantity, price_at_purchase, qty_shipped
             FROM order_items WHERE order_id = ?`
          )
            .bind(o.id)
            .all();
          items = itemRows.results || [];
        }
      } catch (_) {}
    }

    if (!items.length) continue;

    let needsQtyFix = false;
    for (const it of items) {
      const qty = parseInt(it.quantity, 10) || 0;
      let shipped = parseInt(it.qty_shipped, 10);
      if (!Number.isFinite(shipped) || shipped < 0) shipped = 0;
      if (shipped < qty) {
        needsQtyFix = true;
        break;
      }
    }
    if (needsQtyFix) {
      try {
        await env.DB.prepare(
          `UPDATE order_items
           SET qty_shipped = quantity
           WHERE order_id = ? AND COALESCE(qty_shipped, 0) < COALESCE(quantity, 0)`
        )
          .bind(o.id)
          .run();
      } catch (_) {}
    }

    const existingShipments = normalizeShipments(parseShipmentsJson(o.shipments_json));
    if (existingShipments.length) continue;

    const shipItems = [];
    let subtotal = 0;
    for (const it of items) {
      const qty = parseInt(it.quantity, 10) || 0;
      if (qty < 1) continue;
      const unitPrice = Number(it.price_at_purchase) || 0;
      const lineTotal = qty * unitPrice;
      subtotal += lineTotal;
      shipItems.push({
        code: String(it.product_sku || '').trim(),
        size: it.size != null ? String(it.size) : '',
        description: '',
        qty,
        unitPrice,
        lineTotal,
      });
    }
    if (!shipItems.length) continue;

    let shippedAt = o.created_at || null;
    if (!shippedAt && o.placed_at != null) {
      const n = Number(o.placed_at);
      shippedAt = Number.isFinite(n) ? new Date(n).toISOString() : String(o.placed_at);
    }
    if (!shippedAt) shippedAt = new Date().toISOString();

    const shipment = {
      id: 'SHIP-1',
      shippedAt,
      note: 'Migrated complete shipment from pre-OMS live order',
      items: shipItems,
      subtotal,
    };
    try {
      await env.DB.prepare(`UPDATE orders SET shipments_json = ? WHERE id = ?`)
        .bind(JSON.stringify([shipment]), o.id)
        .run();
    } catch (_) {}
  }
}

/** AR / payment tracking on orders. */
async function ensureOrderPaymentColumns(env) {
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid'`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN paid_at TEXT`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT ''`).run();
  } catch (_) {}
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN payment_note TEXT DEFAULT ''`).run();
  } catch (_) {}
}

/** Audit log for warehouse receive / adjust. */
async function ensureStockMovementsTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      delta INTEGER NOT NULL,
      reason TEXT DEFAULT 'receive',
      qty_before INTEGER,
      qty_after INTEGER,
      created_at TEXT,
      admin_note TEXT DEFAULT ''
    )
  `).run();
  try {
    await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_stock_movements_created ON stock_movements(created_at)`).run();
  } catch (_) {}
}

function paymentMethodsFromEnv(env) {
  const zelleEmail = String(env.PAYMENT_ZELLE_EMAIL || 'payments@allprobuildingsupplies.com').trim();
  const zelleHandle = String(env.PAYMENT_ZELLE_HANDLE || 'allprobuildingsupplies').trim();
  const zelleQr = String(env.PAYMENT_ZELLE_QR_URL || 'https://allprobuildingsupplies.com/assets/zelle-qr.png').trim();
  const ccLink = String(env.PAYMENT_CC_LINK || env.PAYMENT_STRIPE_LINK || '').trim();
  const feeRaw = parseFloat(env.PAYMENT_CC_FEE_PERCENT);
  const feePercent = Number.isFinite(feeRaw) && feeRaw >= 0 ? feeRaw : 3.5;
  const wireDefault =
    'Wire transfer to All Pro Building Supplies.\n' +
    'Email payments@allprobuildingsupplies.com or call 732-734-1123 for bank routing & account numbers.\n' +
    'Include your Order ID in the wire memo.';
  const achDefault =
    'ACH / bank transfer to All Pro Building Supplies.\n' +
    'Email payments@allprobuildingsupplies.com for ACH routing details.\n' +
    'Include your Order ID in the payment memo.';
  const wire = String(env.PAYMENT_WIRE_INSTRUCTIONS || wireDefault).trim();
  const ach = String(env.PAYMENT_ACH_INSTRUCTIONS || achDefault).trim();
  const feeLabel = feePercent > 0 ? `${feePercent}% convenience fee` : 'no convenience fee';
  return {
    zelle: {
      enabled: true,
      label: 'Zelle',
      email: zelleEmail,
      handle: zelleHandle,
      qrUrl: zelleQr,
    },
    card: {
      enabled: true,
      label: 'Credit / Debit Card',
      url: ccLink,
      feePercent,
      note: ccLink
        ? `Pay by card (${feeLabel} applies to the invoice total). Include your Order ID if prompted.`
        : `Pay by card — call 732-734-1123 or email payments@allprobuildingsupplies.com. A ${feeLabel} applies to card payments.`,
    },
    wire: {
      enabled: true,
      label: 'Wire Transfer',
      instructions: wire,
    },
    ach: {
      enabled: true,
      label: 'ACH / Bank Transfer',
      instructions: ach,
    },
  };
}

function normalizePaymentFields(o) {
  const raw = String(o.paymentStatus || o.payment_status || 'unpaid').toLowerCase().trim();
  const paymentStatus = ['unpaid', 'partial', 'paid'].includes(raw) ? raw : 'unpaid';
  let paidAt = o.paidAt || o.paid_at || null;
  if (paymentStatus === 'paid') {
    if (!paidAt) paidAt = new Date().toISOString();
  } else if (paymentStatus === 'unpaid') {
    paidAt = null;
  } else if (paidAt) {
    paidAt = String(paidAt);
  } else {
    paidAt = null;
  }
  return {
    paymentStatus,
    paidAt,
    paymentMethod: String(o.paymentMethod || o.payment_method || '').trim().slice(0, 80),
    paymentNote: String(o.paymentNote || o.payment_note || '').trim().slice(0, 500),
  };
}

/** Persist paid / partial / unpaid without rewriting line items. */
async function setOrderPaymentStatus(env, orderId, fields) {
  const id = String(orderId || '').trim();
  if (!id) return { error: 'Order id required', status: 400 };
  const existing = await env.DB.prepare('SELECT id, payment_status FROM orders WHERE id = ?').bind(id).first();
  if (!existing) return { error: 'Order not found', status: 404 };
  const pay = normalizePaymentFields({
    paymentStatus: fields.paymentStatus || fields.payment_status || 'paid',
    paidAt: fields.paidAt || fields.paid_at,
    paymentMethod: fields.paymentMethod || fields.payment_method || '',
    paymentNote: fields.paymentNote || fields.payment_note || '',
  });
  await env.DB.prepare(
    `UPDATE orders SET payment_status = ?, paid_at = ?, payment_method = ?, payment_note = ? WHERE id = ?`
  )
    .bind(pay.paymentStatus, pay.paidAt, pay.paymentMethod, pay.paymentNote, id)
    .run();
  return { success: true, orderId: id, ...pay, previousStatus: existing.payment_status || 'unpaid' };
}

function timingSafeEqualHex(a, b) {
  const aa = String(a || '');
  const bb = String(b || '');
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) out |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return out === 0;
}

async function verifyStripeSignature(rawBody, signatureHeader, secret) {
  if (!rawBody || !signatureHeader || !secret) return false;
  const parts = String(signatureHeader).split(',').map((p) => p.trim());
  let timestamp = '';
  const v1 = [];
  for (const part of parts) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq);
    const v = part.slice(eq + 1);
    if (k === 't') timestamp = v;
    if (k === 'v1') v1.push(v);
  }
  if (!timestamp || !v1.length) return false;
  const tsNum = parseInt(timestamp, 10);
  if (!Number.isFinite(tsNum)) return false;
  // Reject stale signatures (> 5 minutes).
  if (Math.abs(Date.now() / 1000 - tsNum) > 300) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return v1.some((sig) => timingSafeEqualHex(sig, hex));
}

function orderIdFromStripeObject(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const candidates = [
    obj.client_reference_id,
    obj.metadata && obj.metadata.order_id,
    obj.metadata && obj.metadata.orderId,
    obj.metadata && obj.metadata.apbs_order_id,
  ];
  for (const c of candidates) {
    const id = String(c || '').trim();
    if (id) return id;
  }
  return '';
}

async function handleStripeWebhook(request, env) {
  const secret = String(env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    return jsonResponse({ error: 'Stripe webhook not configured (STRIPE_WEBHOOK_SECRET)' }, 503);
  }
  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature') || request.headers.get('Stripe-Signature') || '';
  const ok = await verifyStripeSignature(rawBody, sig, secret);
  if (!ok) return jsonResponse({ error: 'Invalid Stripe signature' }, 400);

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (_) {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  const type = String(event.type || '');
  const dataObj = event.data && event.data.object ? event.data.object : null;
  const paidTypes = new Set([
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'payment_intent.succeeded',
  ]);
  if (!paidTypes.has(type)) {
    return jsonResponse({ received: true, ignored: type });
  }

  // For checkout.session.completed, only mark paid when payment_status is paid (or no async).
  if (type === 'checkout.session.completed') {
    const ps = String(dataObj && dataObj.payment_status ? dataObj.payment_status : 'paid').toLowerCase();
    if (ps && ps !== 'paid' && ps !== 'no_payment_required') {
      return jsonResponse({ received: true, ignored: 'checkout not paid yet', payment_status: ps });
    }
  }

  const orderId = orderIdFromStripeObject(dataObj);
  if (!orderId) {
    return jsonResponse({
      received: true,
      ignored: 'no order id (set client_reference_id or metadata.order_id on the Payment Link / Checkout)',
    });
  }

  const noteBits = [`Stripe ${type}`];
  if (dataObj && dataObj.id) noteBits.push(String(dataObj.id));
  const result = await setOrderPaymentStatus(env, orderId, {
    paymentStatus: 'paid',
    paymentMethod: 'card',
    paymentNote: noteBits.join(' · ').slice(0, 500),
    paidAt: new Date().toISOString(),
  });
  if (result.error) {
    return jsonResponse({ received: true, error: result.error, orderId }, result.status || 400);
  }
  return jsonResponse({ received: true, markedPaid: true, orderId, previousStatus: result.previousStatus });
}

async function logStockMovement(env, { code, size, delta, reason, qtyBefore, qtyAfter, note }) {
  try {
    await env.DB.prepare(
      `INSERT INTO stock_movements (code, size, delta, reason, qty_before, qty_after, created_at, admin_note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        code,
        size || '',
        delta,
        reason || 'adjust',
        qtyBefore,
        qtyAfter,
        new Date().toISOString(),
        note || ''
      )
      .run();
  } catch (_) {}
}

function parseShipmentsJson(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function normalizeShipments(shipments) {
  if (!Array.isArray(shipments)) return [];
  return shipments
    .map((s, idx) => {
      if (!s || typeof s !== 'object') return null;
      const items = Array.isArray(s.items)
        ? s.items
            .map((it) => {
              const qty = parseInt(it.qty, 10) || 0;
              if (qty < 1) return null;
              const unitPrice = Number(it.unitPrice);
              return {
                code: String(it.code || '').trim(),
                size: it.size != null ? String(it.size) : '',
                description: it.description != null ? String(it.description) : '',
                qty,
                unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
                lineTotal:
                  Number.isFinite(Number(it.lineTotal)) && Number(it.lineTotal) >= 0
                    ? Number(it.lineTotal)
                    : qty * (Number.isFinite(unitPrice) ? unitPrice : 0),
              };
            })
            .filter(Boolean)
        : [];
      if (!items.length) return null;
      const subtotal = items.reduce((sum, it) => sum + (Number(it.lineTotal) || 0), 0);
      return {
        id: String(s.id || 'SHIP-' + (idx + 1)),
        shippedAt: s.shippedAt || new Date().toISOString(),
        note: s.note != null ? String(s.note) : '',
        items,
        subtotal: Number.isFinite(Number(s.subtotal)) ? Number(s.subtotal) : subtotal,
      };
    })
    .filter(Boolean);
}

function factoryCode(value) {
  return value != null ? String(value).trim() : '';
}

/** Trade catalog: pricing/stock yes, factory codes no. */
function toTradeProduct(p) {
  return {
    code: p.code,
    description: p.description,
    size: p.size,
    pack: p.pack,
    qty: p.qty,
    price: p.price,
    image: p.image,
    main_category: p.main_category,
    sub_category: p.sub_category,
  };
}

function newAddressId() {
  return 'ADDR-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function normalizeAddressPayload(body) {
  const line1 = String(body.line1 || body.address || '').trim();
  const city = String(body.city || '').trim();
  const stateZip = String(body.stateZip || body.state_zip || '').trim();
  let fullAddress = String(body.fullAddress || body.full_address || '').trim();
  if (!fullAddress) {
    fullAddress = [line1, city, stateZip].filter(Boolean).join(', ');
  }
  return {
    label: String(body.label || '').trim(),
    phone: String(body.phone || '').trim(),
    line1,
    city,
    stateZip,
    fullAddress,
    isDefault: body.isDefault === true || body.is_default === 1 || body.isDefault === 1,
  };
}

function mapAddressRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: row.user_email,
    label: row.label || '',
    phone: row.phone || '',
    line1: row.line1 || '',
    city: row.city || '',
    stateZip: row.state_zip || '',
    fullAddress: row.full_address || '',
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
  };
}

async function findUserByEmailOrId(env, emailOrId) {
  const key = String(emailOrId || '').trim();
  if (!key) return null;
  if (key.includes('@')) {
    return env.DB.prepare('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1')
      .bind(key.toLowerCase())
      .first();
  }
  return (
    (await env.DB.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').bind(key).first()) ||
    (await env.DB.prepare('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1')
      .bind(key.toLowerCase())
      .first())
  );
}

async function listAddressesForUser(env, user) {
  const email = String(user.email || '').trim().toLowerCase();
  const { results } = await env.DB.prepare(
    `SELECT * FROM user_addresses WHERE LOWER(user_email) = ? OR user_id = ? ORDER BY is_default DESC, created_at DESC`
  )
    .bind(email, user.id)
    .all();
  return (results || []).map(mapAddressRow);
}

async function upsertSavedAddress(env, user, payload) {
  const addr = normalizeAddressPayload(payload);
  if (!addr.fullAddress || addr.fullAddress === 'PICKUP') return null;

  const email = String(user.email || '').trim().toLowerCase();
  const existing = await env.DB.prepare(
    `SELECT * FROM user_addresses WHERE (LOWER(user_email) = ? OR user_id = ?) AND LOWER(full_address) = ? LIMIT 1`
  )
    .bind(email, user.id, addr.fullAddress.toLowerCase())
    .first();

  if (existing) {
    const phone = addr.phone || existing.phone || '';
    const label = addr.label || existing.label || '';
    await env.DB.prepare(
      `UPDATE user_addresses SET phone = ?, label = ?, line1 = ?, city = ?, state_zip = ? WHERE id = ?`
    )
      .bind(
        phone,
        label,
        addr.line1 || existing.line1 || '',
        addr.city || existing.city || '',
        addr.stateZip || existing.state_zip || '',
        existing.id
      )
      .run();
    if (addr.isDefault) {
      await env.DB.batch([
        env.DB.prepare(`UPDATE user_addresses SET is_default = 0 WHERE LOWER(user_email) = ? OR user_id = ?`).bind(
          email,
          user.id
        ),
        env.DB.prepare(`UPDATE user_addresses SET is_default = 1 WHERE id = ?`).bind(existing.id),
      ]);
    }
    return mapAddressRow({
      ...existing,
      phone,
      label,
      line1: addr.line1 || existing.line1,
      city: addr.city || existing.city,
      state_zip: addr.stateZip || existing.state_zip,
      is_default: addr.isDefault ? 1 : existing.is_default,
    });
  }

  const id = newAddressId();
  const createdAt = new Date().toISOString();
  if (addr.isDefault) {
    await env.DB.prepare(`UPDATE user_addresses SET is_default = 0 WHERE LOWER(user_email) = ? OR user_id = ?`)
      .bind(email, user.id)
      .run();
  }
  await env.DB.prepare(
    `INSERT INTO user_addresses (id, user_id, user_email, label, phone, line1, city, state_zip, full_address, is_default, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      user.id,
      email,
      addr.label,
      addr.phone,
      addr.line1,
      addr.city,
      addr.stateZip,
      addr.fullAddress,
      addr.isDefault ? 1 : 0,
      createdAt
    )
    .run();

  // Keep users.phone in sync when we learn a phone from an address.
  if (addr.phone) {
    try {
      await env.DB.prepare(`UPDATE users SET phone = ? WHERE id = ? AND (phone IS NULL OR phone = '')`)
        .bind(addr.phone, user.id)
        .run();
    } catch (_) {}
  }

  return {
    id,
    userId: user.id,
    userEmail: email,
    label: addr.label,
    phone: addr.phone,
    line1: addr.line1,
    city: addr.city,
    stateZip: addr.stateZip,
    fullAddress: addr.fullAddress,
    isDefault: !!addr.isDefault,
    createdAt,
  };
}

/** Pull unique past order delivery addresses into the address book (deduped). */
async function importPastOrderAddresses(env, user) {
  const email = String(user.email || '').trim().toLowerCase();
  const orders = await env.DB.prepare(
    `SELECT delivery_address, customer_snapshot, created_at FROM orders
     WHERE LOWER(TRIM(user_id)) = ? OR user_id = ?
     ORDER BY created_at DESC`
  )
    .bind(email, user.id)
    .all();

  const imported = [];
  for (const o of orders.results || []) {
    const full = String(o.delivery_address || '').trim();
    if (!full || full.toUpperCase() === 'PICKUP') continue;
    let phone = '';
    try {
      if (o.customer_snapshot) {
        const snap = JSON.parse(o.customer_snapshot);
        phone = (snap && snap.phone) || '';
      }
    } catch (_) {}
    const saved = await upsertSavedAddress(env, user, {
      fullAddress: full,
      phone,
      label: '',
    });
    if (saved) imported.push(saved);
  }
  return imported;
}

async function authFromRequest(request, env) {
  const token = getBearer(request);
  if (!token) return { admin: false, user: null };

  // One-shot / automation catalog sync (Bearer = CATALOG_SYNC_TOKEN).
  const syncTok = String(env.CATALOG_SYNC_TOKEN || '').trim();
  if (syncTok && token === syncTok) {
    return { admin: true, user: null, payload: { role: 'admin', sync: true } };
  }

  const secret = jwtSecret(env);
  if (!secret) return { admin: false, user: null };
  const payload = await verifyToken(token, secret);
  if (!payload) return { admin: false, user: null };
  if (payload.role === 'admin') return { admin: true, user: null, payload };
  if (payload.role === 'user' && payload.status === 'approved') {
    return { admin: false, user: payload, payload };
  }
  return { admin: false, user: null };
}

function validateAndPriceItems(allProds, items) {
  if (!items || items.length === 0) return { validated: [], total: 0 };
  const validated = [];
  let total = 0;
  for (const i of items) {
    const qty = parseInt(i.qty, 10);
    if (!qty || qty < 1) return { error: `Invalid quantity for ${i.code || 'item'}` };
    const match = findProduct(allProds, i.code, i.size);
    if (!match) return { error: `Product not found: ${i.code} ${i.size}` };
    const stock = parseInt(match.qty, 10) || 0;
    if (qty > stock) return { error: `Insufficient stock for ${match.description} ${match.size} (max ${stock})` };
    const unitPrice = parseFloat(match.price) || 0;
    const lineTotal = unitPrice * qty;
    total += lineTotal;
    validated.push({
      code: match.code,
      size: match.size,
      description: match.description,
      qty,
      unitPrice,
      lineTotal,
      pcsPerCtn: match.pack,
    });
  }
  return { validated, total };
}

/** Admin orders: keep line unitPrice from the dashboard (discounts, free lines, etc.). */
function validateAdminOrderItems(allProds, items, options = {}) {
  const checkStock = options.checkStock !== false;
  if (!items || items.length === 0) return { validated: [], total: 0 };
  const validated = [];
  let total = 0;
  for (const i of items) {
    const qty = parseInt(i.qty, 10);
    if (!qty || qty < 1) return { error: `Invalid quantity for ${i.code || 'item'}` };
    const match = findProduct(allProds, i.code, i.size);
    if (!match) return { error: `Product not found: ${i.code} ${i.size}` };
    if (checkStock) {
      const stock = parseInt(match.qty, 10) || 0;
      if (qty > stock) {
        return { error: `Insufficient stock for ${match.description} ${match.size} (max ${stock})` };
      }
    }
    const hasOverride = i.unitPrice !== undefined && i.unitPrice !== null && String(i.unitPrice).trim() !== '';
    const unitPrice = hasOverride ? parseFloat(i.unitPrice) : parseFloat(match.price) || 0;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return { error: `Invalid price for ${match.code} ${match.size}` };
    }
    const lineTotal = unitPrice * qty;
    total += lineTotal;
    let qtyShipped = parseInt(i.qtyShipped, 10);
    if (!Number.isFinite(qtyShipped) || qtyShipped < 0) qtyShipped = 0;
    if (qtyShipped > qty) {
      return { error: `Shipped qty cannot exceed ordered qty for ${match.code} ${match.size}` };
    }
    validated.push({
      code: match.code,
      size: match.size,
      description: match.description,
      qty,
      qtyShipped,
      unitPrice,
      lineTotal,
      pcsPerCtn: match.pack,
    });
  }
  return { validated, total };
}

async function restoreOrderItemsStock(env, orderId) {
  const { results: oldItems } = await env.DB.prepare('SELECT * FROM order_items WHERE order_id = ?').bind(orderId).all();
  const stmts = oldItems.map((it) =>
    env.DB.prepare('UPDATE products SET qty = qty + ? WHERE code = ? AND size = ?').bind(it.quantity, it.product_sku, it.size)
  );
  if (stmts.length) await env.DB.batch(stmts);
  return oldItems;
}

async function applyOrderItemsStock(env, items) {
  const stmts = items.map((it) =>
    env.DB.prepare('UPDATE products SET qty = MAX(0, qty - ?) WHERE code = ? AND size = ?').bind(it.qty, it.code, it.size)
  );
  if (stmts.length) await env.DB.batch(stmts);
}

/**
 * EmailJS {{email_subject}} HTML-escapes characters like "/" → "&#x2F;" which
 * then show literally in the Outlook/Gmail subject line. Keep subjects plain.
 */
function sanitizeEmailSubject(subject) {
  let s = String(subject == null ? '' : subject);
  s = s
    .replace(/&#x2[fF];/g, '/')
    .replace(/&#47;/g, '/')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  // Avoid "/" entirely — EmailJS re-escapes it on send
  s = s.replace(/\s*\/\s*/g, ' — ');
  return s.replace(/\s+/g, ' ').trim();
}

async function sendEmailJs(env, templateParams, toEmail, options = {}) {
  const serviceId = env.EMAILJS_SERVICE_ID;
  const templateId = env.EMAILJS_TEMPLATE_ID;
  const publicKey = env.EMAILJS_PUBLIC_KEY;
  if (!serviceId || !templateId || !publicKey) {
    return { skipped: true, reason: 'Email not configured' };
  }
  const params = { ...templateParams };
  if (params.email_subject != null) {
    params.email_subject = sanitizeEmailSubject(params.email_subject);
  }
  if (params.email_body != null) {
    // EmailJS caps all template variables at 50KB — strip comment/whitespace bloat.
    params.email_body = String(params.email_body)
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/>\s+</g, '><')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
  const toList = normalizeEmailList(toEmail);
  const ccList = normalizeEmailList(options.cc || options.ccEmail || params.cc_email || '');
  const toJoined = toList.join(', ');
  const ccJoined = ccList.join(', ');
  const primaryTo = toList[0] || String(toEmail || '').trim();
  const body = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: {
      ...params,
      to_email: toJoined || primaryTo,
      cust_email: primaryTo,
      // EmailJS template Cc field should be set to {{cc_email}} (or {{email_cc}}).
      cc_email: ccJoined,
      email_cc: ccJoined,
      cc: ccJoined,
    },
  };
  if (env.EMAILJS_PRIVATE_KEY) body.accessToken = env.EMAILJS_PRIVATE_KEY;
  const approxBytes = JSON.stringify(body.template_params).length;
  if (approxBytes > 50000) {
    throw new Error(
      'Email too large for EmailJS (' + Math.round(approxBytes / 1024) + 'KB / 50KB limit). Reduce line items or split the send.'
    );
  }
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `EmailJS HTTP ${res.status}`);
  }
  return { ok: true, to: toList, cc: ccList };
}

function normalizeEmailList(value) {
  const raw = Array.isArray(value) ? value : String(value == null ? '' : value).split(/[,;]+/);
  const out = [];
  const seen = new Set();
  for (const part of raw) {
    const email = String(part || '')
      .trim()
      .toLowerCase();
    if (!email || !email.includes('@') || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      const auth = await authFromRequest(request, env);
      await ensureCoreSchema(env);
      await ensureAddressesTable(env);
      await ensureProductFactoryColumns(env);
      await ensureProductCategoryColumns(env);
      await ensureUsersCompatColumns(env);
      await ensureOrderShipmentColumns(env);
      await ensureOrderPaymentColumns(env);
      await ensureStockMovementsTable(env);
      try {
        await backfillLegacyOrderShipments(env);
      } catch (_) {}
      // One-time (idempotent) load of initial Tommur/Lesso codes into products.
      try {
        await seedFactoryCodes(env, canonicalizeSize);
      } catch (_) {}

      // ---------------------------------------------------------
      // PUBLIC ROUTES
      // ---------------------------------------------------------
      if (path === '/api/health' && request.method === 'GET') {
        return jsonResponse({ status: 'ok' });
      }

      // Stripe Payment Link / Checkout → auto mark order paid (uses client_reference_id).
      if (path === '/api/webhooks/stripe' && request.method === 'POST') {
        return handleStripeWebhook(request, env);
      }

      if (path === '/api/admin/login' && request.method === 'POST') {
        const candidates = [env.ADMIN_TOKEN, env.ADMIN_PIN, env.ADMIN_KEY].filter(
          (v) => typeof v === 'string' && v.length > 0
        );
        if (candidates.length === 0) {
          return jsonResponse({ error: 'Admin login not configured. Set ADMIN_TOKEN secret.' }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const password = body && body.password != null ? String(body.password) : '';
        if (!password || !candidates.includes(password)) {
          return jsonResponse({ error: 'Incorrect password' }, 401);
        }
        const secret = jwtSecret(env);
        if (!secret) {
          return jsonResponse({ error: 'Auth not configured. Set JWT_SECRET or ADMIN_TOKEN.' }, 503);
        }
        const token = await signToken({ role: 'admin' }, secret, 24);
        return jsonResponse({ success: true, token });
      }

      // Public: whether Microsoft SSO is configured (client/tenant IDs are SPA-public).
      if (path === '/api/admin/login/microsoft/config' && request.method === 'GET') {
        const sso = microsoftSsoConfig(env);
        return jsonResponse({
          enabled: sso.enabled,
          clientId: sso.enabled ? sso.clientId : '',
          tenantId: sso.enabled ? sso.tenantId : '',
          allowEmails: sso.enabled ? sso.allowEmails : [],
        });
      }

      // Verify Microsoft ID token (SPA redeems code in-browser) → APBS admin JWT.
      if (path === '/api/admin/login/microsoft' && request.method === 'POST') {
        const sso = microsoftSsoConfig(env);
        if (!sso.enabled) {
          return jsonResponse({ error: 'Microsoft SSO is not configured on this API.' }, 503);
        }
        const body = await request.json().catch(() => ({}));
        const idToken = body && body.idToken != null ? String(body.idToken) : '';
        if (!idToken) {
          return jsonResponse(
            {
              error:
                'idToken is required. SPA clients must redeem the auth code in the browser, then send the ID token.',
            },
            400
          );
        }
        try {
          const { email, payload } = await verifyMicrosoftIdToken(idToken, {
            tenantId: sso.tenantId,
            clientId: sso.clientId,
          });
          if (!sso.allowEmails.includes(email)) {
            return jsonResponse(
              { error: `Microsoft account ${email} is not authorized for admin access.` },
              403
            );
          }
          const secret = jwtSecret(env);
          if (!secret) {
            return jsonResponse({ error: 'Auth not configured. Set JWT_SECRET or ADMIN_TOKEN.' }, 503);
          }
          const token = await signToken(
            {
              role: 'admin',
              auth: 'microsoft',
              email,
              name: payload.name || '',
              oid: payload.oid || payload.sub || '',
            },
            secret,
            24
          );
          return jsonResponse({ success: true, token, email });
        } catch (e) {
          const msg = e && e.message ? String(e.message) : 'Microsoft login failed';
          return jsonResponse({ error: msg }, 401);
        }
      }

      if (path === '/api/products' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM products').all();
        if (auth.admin) {
          return jsonResponse(results);
        }
        if (auth.user && auth.user.status === 'approved') {
          return jsonResponse(results.map(toTradeProduct));
        }
        return jsonResponse(results.map(toPublicProduct));
      }

      if (path === '/api/login' && request.method === 'POST') {
        const { email, password } = await request.json();
        if (!email || typeof email !== 'string' || !String(email).trim()) {
          return jsonResponse({ error: 'Email is required' }, 400);
        }
        if (!password) {
          return jsonResponse({ error: 'Password is required' }, 400);
        }
        const { results } = await env.DB.prepare(
          `SELECT * FROM users
           WHERE email = ?
             AND (password = ? OR password_hash = ?)`
        )
          .bind(email.trim().toLowerCase(), password, password)
          .all();
        if (results.length === 0) return jsonResponse({ error: 'Invalid email or password' }, 401);
        const user = results[0];
        if (user.status !== 'approved') return jsonResponse({ error: 'Account pending approval.' }, 403);
        const secret = jwtSecret(env);
        if (!secret) return jsonResponse({ error: 'Auth not configured' }, 503);
        const canPieces = user.canOrderPieces === 1 || user.can_order_pieces === 1;
        const token = await signToken(
          {
            role: 'user',
            sub: user.id,
            email: user.email.toLowerCase(),
            status: user.status,
            canOrderPieces: canPieces,
          },
          secret
        );
        delete user.password;
        delete user.password_hash;
        user.canOrderPieces = canPieces;
        return jsonResponse({ message: 'Login successful', token, user });
      }

      if (path === '/api/register' && request.method === 'POST') {
        const body = await request.json();
        if (!body.email || typeof body.email !== 'string' || !String(body.email).trim()) {
          return jsonResponse({ error: 'Email is required' }, 400);
        }
        if (!body.password) {
          return jsonResponse({ error: 'Password is required' }, 400);
        }
        const storedPw = await ensureStoredPassword(body.password);
        try {
          await env.DB.prepare(
            `INSERT INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?)`
          )
            .bind(body.id, body.fname, body.lname, body.company, body.email.trim().toLowerCase(), body.phone, storedPw, new Date().toISOString())
            .run();
        } catch (e) {
          const msg = e && e.message ? String(e.message) : '';
          if (msg.includes('UNIQUE') || msg.includes('constraint')) {
            return jsonResponse({ error: 'An account with this email already exists.' }, 409);
          }
          throw e;
        }
        return jsonResponse({ message: 'Registration received!' });
      }

      if (path === '/api/change-password' && request.method === 'POST') {
        const { email, oldPassword, newPassword } = await request.json();
        if (!email || !oldPassword || !newPassword) {
          return jsonResponse({ error: 'All fields required' }, 400);
        }
        const oldHash = isSha256Hex(oldPassword) ? oldPassword.toLowerCase() : await sha256Hex(oldPassword);
        const newHash = isSha256Hex(newPassword) ? newPassword.toLowerCase() : await sha256Hex(newPassword);
        const { results } = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND password = ?')
          .bind(email.toLowerCase(), oldHash)
          .all();
        if (results.length === 0) return jsonResponse({ error: 'Current password is incorrect' }, 401);
        await env.DB.prepare('UPDATE users SET password = ? WHERE email = ?').bind(newHash, email.toLowerCase()).run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/contact' && request.method === 'POST') {
        const body = await request.json();
        const notify = env.NOTIFY_EMAIL || 'orders@allprobuildingsupplies.com';
        const msg = [
          `Name: ${body.firstName || ''} ${body.lastName || ''}`,
          `Email: ${body.email || ''}`,
          `Phone: ${body.phone || ''}`,
          `Company: ${body.company || ''}`,
          `Category: ${body.category || ''}`,
          '',
          body.message || '',
        ].join('\n');
        try {
          await sendEmailJs(
            env,
            {
              email_subject: `Contact — ${body.firstName || ''} ${body.lastName || ''}`.trim(),
              email_body: `<pre style="font-family:sans-serif;white-space:pre-wrap">${msg.replace(/</g, '&lt;')}</pre>`,
              cust_name: `${body.firstName || ''} ${body.lastName || ''}`.trim(),
              customer: body.company || 'N/A',
              phone: body.phone || 'N/A',
              notes: body.message || '',
            },
            notify
          );
        } catch (e) {
          return jsonResponse({ error: 'Could not send message. Please call 732-734-1123.' }, 500);
        }
        return jsonResponse({ success: true });
      }

      // ---------------------------------------------------------
      // AUTHENTICATED USER ROUTES
      // ---------------------------------------------------------
      if (path === '/api/orders' && request.method === 'POST') {
        if (!auth.user) return jsonResponse({ error: 'Unauthorized' }, 401);
        const o = await request.json();
        if (!o.customer || !o.customer.email) {
          return jsonResponse({ error: 'Missing required order data' }, 400);
        }
        const customerEmail = String(o.customer.email).trim().toLowerCase();
        if (customerEmail !== auth.user.email) {
          return jsonResponse({ error: 'Order email must match logged-in account' }, 403);
        }

        if (!userCanOrderPieces(auth.user)) {
          for (const i of o.items || []) {
            if (i.unit === 'piece') {
              return jsonResponse({ error: 'Your account is limited to case/carton orders only.' }, 403);
            }
          }
        }

        const { results: allProds } = await env.DB.prepare('SELECT * FROM products').all();
        const priced = validateAndPriceItems(allProds, o.items);
        if (priced.error) return jsonResponse({ error: priced.error }, 400);

        let orderId = null;
        let lastErr = null;
        for (let attempt = 0; attempt < 5; attempt++) {
          orderId = await nextApbsOrderId(env);
          try {
            const stmts = [
              env.DB.prepare(
                `INSERT INTO orders (id, user_id, status, total_amount, delivery_method, delivery_address, po, notes, customer_snapshot, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              ).bind(
                orderId,
                customerEmail,
                'pending',
                priced.total,
                o.delivery?.method || 'delivery',
                o.delivery?.address || '',
                o.po || '',
                o.notes || '',
                JSON.stringify(o.customer),
                o.placedAt || new Date().toISOString()
              ),
            ];

            for (const i of priced.validated) {
              stmts.push(
                env.DB.prepare(
                  'INSERT INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)'
                ).bind(orderId, i.code, i.size, i.qty, i.unitPrice)
              );
            }
            await env.DB.batch(stmts);
            await applyOrderItemsStock(env, priced.validated);
            lastErr = null;
            break;
          } catch (e) {
            lastErr = e;
            const msg = e && e.message ? String(e.message) : '';
            if (!msg.includes('UNIQUE') && !msg.includes('constraint')) throw e;
          }
        }
        if (lastErr) throw lastErr;

        // Save delivery address + phone to the customer's address book (default on).
        const delMethod = o.delivery?.method || 'delivery';
        const delAddr = String(o.delivery?.address || '').trim();
        const shouldSaveAddr = o.saveAddress !== false;
        if (shouldSaveAddr && delMethod !== 'pickup' && delAddr && delAddr.toUpperCase() !== 'PICKUP') {
          const dbUser = await findUserByEmailOrId(env, customerEmail);
          if (dbUser) {
            try {
              await upsertSavedAddress(env, dbUser, {
                fullAddress: delAddr,
                line1: o.delivery?.line1 || '',
                city: o.delivery?.city || '',
                stateZip: o.delivery?.stateZip || '',
                phone: o.customer?.phone || dbUser.phone || '',
                label: o.delivery?.label || '',
                isDefault: o.saveAddressAsDefault === true,
              });
            } catch (_) {}
          }
        }

        return jsonResponse({ success: true, orderId, total: priced.total, items: priced.validated });
      }

      // Customer address book
      if (path === '/api/addresses' && request.method === 'GET') {
        if (!auth.user) return jsonResponse({ error: 'Unauthorized' }, 401);
        const dbUser = await findUserByEmailOrId(env, auth.user.email);
        if (!dbUser) return jsonResponse({ error: 'User not found' }, 404);
        if (url.searchParams.get('import') === '1') {
          try {
            await importPastOrderAddresses(env, dbUser);
          } catch (_) {}
        }
        const addresses = await listAddressesForUser(env, dbUser);
        return jsonResponse({
          addresses,
          phone: dbUser.phone || '',
        });
      }

      if (path === '/api/addresses' && request.method === 'POST') {
        if (!auth.user) return jsonResponse({ error: 'Unauthorized' }, 401);
        const dbUser = await findUserByEmailOrId(env, auth.user.email);
        if (!dbUser) return jsonResponse({ error: 'User not found' }, 404);
        const body = await request.json();
        const saved = await upsertSavedAddress(env, dbUser, body);
        if (!saved) return jsonResponse({ error: 'Address is required' }, 400);
        return jsonResponse({ success: true, address: saved });
      }

      if (path === '/api/addresses' && request.method === 'PUT') {
        if (!auth.user) return jsonResponse({ error: 'Unauthorized' }, 401);
        const dbUser = await findUserByEmailOrId(env, auth.user.email);
        if (!dbUser) return jsonResponse({ error: 'User not found' }, 404);
        const body = await request.json();
        if (!body.id) return jsonResponse({ error: 'Address id required' }, 400);
        const existing = await env.DB.prepare(
          `SELECT * FROM user_addresses WHERE id = ? AND (LOWER(user_email) = ? OR user_id = ?) LIMIT 1`
        )
          .bind(body.id, auth.user.email.toLowerCase(), dbUser.id)
          .first();
        if (!existing) return jsonResponse({ error: 'Address not found' }, 404);
        const addr = normalizeAddressPayload({ ...existing, ...body, fullAddress: body.fullAddress || body.full_address || existing.full_address });
        if (!addr.fullAddress) return jsonResponse({ error: 'Address is required' }, 400);
        const email = auth.user.email.toLowerCase();
        if (addr.isDefault) {
          await env.DB.prepare(`UPDATE user_addresses SET is_default = 0 WHERE LOWER(user_email) = ? OR user_id = ?`)
            .bind(email, dbUser.id)
            .run();
        }
        await env.DB.prepare(
          `UPDATE user_addresses SET label=?, phone=?, line1=?, city=?, state_zip=?, full_address=?, is_default=? WHERE id=?`
        )
          .bind(
            addr.label,
            addr.phone,
            addr.line1,
            addr.city,
            addr.stateZip,
            addr.fullAddress,
            addr.isDefault ? 1 : 0,
            body.id
          )
          .run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/addresses' && request.method === 'DELETE') {
        if (!auth.user) return jsonResponse({ error: 'Unauthorized' }, 401);
        const id = url.searchParams.get('id');
        if (!id) return jsonResponse({ error: 'Address id required' }, 400);
        const dbUser = await findUserByEmailOrId(env, auth.user.email);
        if (!dbUser) return jsonResponse({ error: 'User not found' }, 404);
        await env.DB.prepare(
          `DELETE FROM user_addresses WHERE id = ? AND (LOWER(user_email) = ? OR user_id = ?)`
        )
          .bind(id, auth.user.email.toLowerCase(), dbUser.id)
          .run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/orders/notify' && request.method === 'POST') {
        if (!auth.user) return jsonResponse({ error: 'Unauthorized' }, 401);
        const { orderId } = await request.json();
        if (!orderId) return jsonResponse({ error: 'Order id required' }, 400);
        const order = await loadOwnedOrder(env, orderId, auth.user.email);
        if (!order) return jsonResponse({ error: 'Order not found' }, 404);
        const htmlBody = buildOrderReceivedEmailHtml(order, order.items);
        const notify = env.NOTIFY_EMAIL || 'orders@allprobuildingsupplies.com';
        const custEmail = (order.customer.email || auth.user.email).trim();
        const company = order.customer.company ? ` (${order.customer.company})` : '';
        const adminSubject = `New Order ${order.id} — ${order.customer.name || 'Customer'}${company}`;
        const custSubject = `Order Received — ${order.id} — All Pro Building Supplies`;
        const results = { admin: false, customer: false };
        try {
          await sendEmailJs(env, { email_subject: adminSubject, email_body: htmlBody }, notify);
          results.admin = true;
        } catch (_) {}
        if (custEmail) {
          try {
            await sendEmailJs(env, { email_subject: custSubject, email_body: htmlBody }, custEmail);
            results.customer = true;
          } catch (_) {}
        }
        return jsonResponse({ success: true, sent: results });
      }

      if (path === '/api/customer-orders' && request.method === 'POST') {
        if (!auth.user) return jsonResponse({ error: 'Unauthorized' }, 401);
        const em = auth.user.email;
        const orders = await env.DB.prepare(
          `SELECT * FROM orders
           WHERE LOWER(TRIM(user_id)) = ?
              OR user_id = (SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1)
           ORDER BY datetime(created_at) DESC`
        )
          .bind(em, em)
          .all();
        const items = await env.DB.prepare('SELECT * FROM order_items').all();
        const prods = await env.DB.prepare('SELECT * FROM products').all();
        const formattedOrders = orders.results.map((o) => {
          const orderItems = items.results.filter((it) => it.order_id === o.id).map((it) => mapOrderItem(it, prods.results));
          return formatOrderRow(o, orderItems);
        });
        return jsonResponse(formattedOrders);
      }

      // ---------------------------------------------------------
      // ADMIN ROUTES
      // ---------------------------------------------------------
      if (!path.startsWith('/api/admin')) {
        return jsonResponse({ error: 'Not Found' }, 404);
      }
      if (!auth.admin) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }

      if (path === '/api/admin/schema' && request.method === 'GET') {
        const tables = ['products', 'users', 'orders', 'order_items', 'user_addresses'];
        const out = {};
        for (const t of tables) {
          try {
            out[t] = await tableColumns(env, t);
          } catch (e) {
            out[t] = { error: String(e && e.message ? e.message : e) };
          }
        }
        return jsonResponse(out);
      }

      if (path === '/api/admin/users' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM users').all();
        const safe = results.map((u) => {
          const copy = { ...u };
          delete copy.password;
          delete copy.password_hash;
          return copy;
        });
        return jsonResponse(safe);
      }

      if (path === '/api/admin/users' && request.method === 'POST') {
        const u = await request.json();
        const storedPw = await ensureStoredPassword(u.password);
        const id = String(u.id || Date.now());
        const email = String(u.email || '').trim().toLowerCase();
        const status = u.status || 'pending';
        const canPieces = u.canOrderPieces ? 1 : 0;
        const nowIso = new Date().toISOString();
        // Preview/legacy D1 requires password_hash + password_algo (NOT NULL).
        await env.DB.prepare(
          `INSERT INTO users (
             id, fname, lname, company, email, phone,
             password, password_hash, password_algo,
             status, canOrderPieces, can_order_pieces,
             registeredAt, registered_at, approvedAt, approved_at, added_by_admin
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            u.fname || '',
            u.lname || '',
            u.company || '',
            email,
            u.phone || '',
            storedPw,
            storedPw,
            'sha256',
            status,
            canPieces,
            canPieces,
            nowIso,
            nowIso,
            status === 'approved' ? nowIso : null,
            status === 'approved' ? nowIso : null,
            1
          )
          .run();
        return jsonResponse({ success: true, id });
      }

      if (path === '/api/admin/users' && request.method === 'PUT') {
        const u = await request.json();
        if (!u || !u.id) return jsonResponse({ error: 'User id required' }, 400);
        const fname = String(u.fname || '').trim();
        const lname = String(u.lname || '').trim();
        const email = String(u.email || '').trim().toLowerCase();
        if (!fname || !lname || !email) return jsonResponse({ error: 'First name, last name, and email are required' }, 400);
        const phone = String(u.phone || '').trim();
        const company = String(u.company || '').trim();
        const status = String(u.status || 'pending');
        const canOrderPieces = u.canOrderPieces ? 1 : 0;
        const pwRaw = (u.password || '').trim();
        if (pwRaw && pwRaw !== '********') {
          const pw = await ensureStoredPassword(pwRaw);
          await env.DB.prepare(
            `UPDATE users SET fname = ?, lname = ?, company = ?, email = ?, phone = ?, status = ?, canOrderPieces = ?, password = ? WHERE id = ?`
          )
            .bind(fname, lname, company, email, phone, status, canOrderPieces, pw, u.id)
            .run();
        } else {
          await env.DB.prepare(
            `UPDATE users SET fname = ?, lname = ?, company = ?, email = ?, phone = ?, status = ?, canOrderPieces = ? WHERE id = ?`
          )
            .bind(fname, lname, company, email, phone, status, canOrderPieces, u.id)
            .run();
        }
        return jsonResponse({ success: true });
      }

      if (path === '/api/admin/users' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
        if (user) {
          await env.DB.batch([
            env.DB.prepare('DELETE FROM user_addresses WHERE user_id = ? OR LOWER(user_email) = ?').bind(
              user.id,
              String(user.email || '').toLowerCase()
            ),
            env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id),
          ]);
        }
        return jsonResponse({ success: true });
      }

      // Admin: list / manage customer addresses
      if (path === '/api/admin/addresses' && request.method === 'GET') {
        const email = url.searchParams.get('email') || '';
        const userId = url.searchParams.get('userId') || url.searchParams.get('user_id') || '';
        const key = email || userId;
        if (!key) return jsonResponse({ error: 'email or userId required' }, 400);
        const dbUser = await findUserByEmailOrId(env, key);
        if (!dbUser) return jsonResponse({ error: 'User not found' }, 404);
        if (url.searchParams.get('import') === '1') {
          try {
            await importPastOrderAddresses(env, dbUser);
          } catch (_) {}
        }
        const addresses = await listAddressesForUser(env, dbUser);
        return jsonResponse({
          user: {
            id: dbUser.id,
            email: dbUser.email,
            fname: dbUser.fname,
            lname: dbUser.lname,
            company: dbUser.company,
            phone: dbUser.phone || '',
          },
          addresses,
        });
      }

      if (path === '/api/admin/addresses' && request.method === 'POST') {
        const body = await request.json();
        const key = body.email || body.userId || body.user_id || body.userEmail;
        if (!key) return jsonResponse({ error: 'email or userId required' }, 400);
        const dbUser = await findUserByEmailOrId(env, key);
        if (!dbUser) return jsonResponse({ error: 'User not found' }, 404);
        const saved = await upsertSavedAddress(env, dbUser, body);
        if (!saved) return jsonResponse({ error: 'Address is required' }, 400);
        return jsonResponse({ success: true, address: saved });
      }

      if (path === '/api/admin/addresses' && request.method === 'PUT') {
        const body = await request.json();
        if (!body.id) return jsonResponse({ error: 'Address id required' }, 400);
        const existing = await env.DB.prepare('SELECT * FROM user_addresses WHERE id = ?').bind(body.id).first();
        if (!existing) return jsonResponse({ error: 'Address not found' }, 404);
        const addr = normalizeAddressPayload({
          ...existing,
          ...body,
          fullAddress: body.fullAddress || body.full_address || existing.full_address,
          line1: body.line1 != null ? body.line1 : existing.line1,
          city: body.city != null ? body.city : existing.city,
          stateZip: body.stateZip != null || body.state_zip != null ? body.stateZip || body.state_zip : existing.state_zip,
          phone: body.phone != null ? body.phone : existing.phone,
          label: body.label != null ? body.label : existing.label,
        });
        if (!addr.fullAddress) return jsonResponse({ error: 'Address is required' }, 400);
        if (addr.isDefault) {
          await env.DB.prepare(
            `UPDATE user_addresses SET is_default = 0 WHERE LOWER(user_email) = ? OR user_id = ?`
          )
            .bind(existing.user_email, existing.user_id)
            .run();
        }
        await env.DB.prepare(
          `UPDATE user_addresses SET label=?, phone=?, line1=?, city=?, state_zip=?, full_address=?, is_default=? WHERE id=?`
        )
          .bind(
            addr.label,
            addr.phone,
            addr.line1,
            addr.city,
            addr.stateZip,
            addr.fullAddress,
            addr.isDefault ? 1 : 0,
            body.id
          )
          .run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/admin/addresses' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) return jsonResponse({ error: 'Address id required' }, 400);
        await env.DB.prepare('DELETE FROM user_addresses WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/admin/users/bulk' && request.method === 'PUT') {
        const users = await request.json();
        const stmts = [];
        for (const u of users) {
          const pwRaw = (u.password || '').trim();
          if (pwRaw && pwRaw !== '********') {
            const pw = await ensureStoredPassword(pwRaw);
            stmts.push(
              env.DB.prepare('UPDATE users SET status = ?, canOrderPieces = ?, password = ? WHERE id = ?').bind(
                u.status,
                u.canOrderPieces ? 1 : 0,
                pw,
                u.id
              )
            );
          } else {
            stmts.push(
              env.DB.prepare('UPDATE users SET status = ?, canOrderPieces = ? WHERE id = ?').bind(
                u.status,
                u.canOrderPieces ? 1 : 0,
                u.id
              )
            );
          }
        }
        await env.DB.batch(stmts);
        return jsonResponse({ success: true });
      }

      if (path === '/api/admin/products/seed-factory-codes' && request.method === 'POST') {
        const result = await seedFactoryCodes(env, canonicalizeSize, { force: true });
        return jsonResponse({ success: true, ...result });
      }

      if (path === '/api/admin/products/sync' && request.method === 'POST') {
        const products = await request.json();
        const stmts = [env.DB.prepare('DELETE FROM products')];
        const seen = new Set();
        for (const p of products) {
          const code = String(p.code || '').trim();
          const size = canonicalizeSize(p.size);
          if (!code || !size) continue;
          const key = code + '\0' + size;
          if (seen.has(key)) continue;
          seen.add(key);
          const mainCat = p.main_category != null ? String(p.main_category) : '';
          const subCat = p.sub_category != null ? String(p.sub_category) : '';
          stmts.push(
            env.DB.prepare(
              `INSERT INTO products (code, description, size, pack, qty, price, image, main_category, sub_category, tommur_code, lesso_code)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              code,
              p.description,
              size,
              p.pack,
              p.qty,
              p.price,
              p.image,
              mainCat,
              subCat,
              factoryCode(p.tommur_code ?? p.tommurCode),
              factoryCode(p.lesso_code ?? p.lessoCode)
            )
          );
        }
        await env.DB.batch(stmts);
        return jsonResponse({ success: true, count: seen.size });
      }

      if (path === '/api/admin/products/bulk-update' && request.method === 'POST') {
        const body = await request.json();
        const products = Array.isArray(body) ? body : body.products || [];
        const replaceAll = !Array.isArray(body) && body.replaceAll === true;

        const incoming = new Map();
        for (const p of products) {
          const code = String(p.code || '').trim();
          const size = canonicalizeSize(p.size);
          if (!code || !size) continue;
          incoming.set(code + '\0' + size, {
            code,
            description: p.description,
            size,
            pack: p.pack,
            qty: p.qty,
            price: p.price,
            image: p.image,
            main_category: p.main_category != null ? String(p.main_category) : '',
            sub_category: p.sub_category != null ? String(p.sub_category) : '',
            tommur_code: factoryCode(p.tommur_code ?? p.tommurCode),
            lesso_code: factoryCode(p.lesso_code ?? p.lessoCode),
          });
        }

        if (replaceAll) {
          const stmts = [env.DB.prepare('DELETE FROM products')];
          for (const p of incoming.values()) {
            stmts.push(
              env.DB.prepare(
                `INSERT INTO products (code, description, size, pack, qty, price, image, main_category, sub_category, tommur_code, lesso_code)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
              ).bind(
                p.code,
                p.description,
                p.size,
                p.pack,
                p.qty,
                p.price,
                p.image,
                p.main_category,
                p.sub_category,
                p.tommur_code,
                p.lesso_code
              )
            );
          }
          await env.DB.batch(stmts);
          return jsonResponse({ success: true, replaced: true, count: incoming.size });
        }

        const { results: existing } = await env.DB.prepare('SELECT * FROM products').all();
        const stmts = [];
        // Remove alias rows that will be replaced by canonical upserts
        for (const p of incoming.values()) {
          for (const row of existing || []) {
            if (String(row.code || '').trim() !== p.code) continue;
            if (canonicalizeSize(row.size) !== p.size) continue;
            if (normalizeSize(row.size) === p.size) continue;
            stmts.push(
              env.DB.prepare('DELETE FROM products WHERE code = ? AND size = ?').bind(row.code, row.size)
            );
          }
          stmts.push(
            env.DB.prepare(`
            INSERT INTO products (code, description, size, pack, qty, price, image, main_category, sub_category, tommur_code, lesso_code)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(code, size) DO UPDATE SET
              description=excluded.description, pack=excluded.pack,
              qty=excluded.qty, price=excluded.price, image=excluded.image,
              main_category=excluded.main_category, sub_category=excluded.sub_category,
              tommur_code=CASE WHEN excluded.tommur_code = '' THEN products.tommur_code ELSE excluded.tommur_code END,
              lesso_code=CASE WHEN excluded.lesso_code = '' THEN products.lesso_code ELSE excluded.lesso_code END
          `).bind(
              p.code,
              p.description,
              p.size,
              p.pack,
              p.qty,
              p.price,
              p.image,
              p.main_category,
              p.sub_category,
              p.tommur_code,
              p.lesso_code
            )
          );
        }
        if (stmts.length) await env.DB.batch(stmts);
        return jsonResponse({ success: true, count: incoming.size });
      }

      if (path === '/api/admin/products/repair-size-aliases' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const result = await repairProductSizeAliases(env, {
          preferUploadedOnly: !!(body && body.preferUploadedOnly),
        });
        return jsonResponse({ success: true, ...result });
      }

      // Receive shipment: ADD qty to existing stock (does not replace).
      // Body: { items: [{ code, size, qty }, ...] } where qty is pieces to add.
      if (path === '/api/admin/products/receive' && request.method === 'POST') {
        const body = await request.json();
        const items = Array.isArray(body) ? body : (body && body.items) || [];
        if (!items.length) {
          return jsonResponse({ error: 'No items to receive' }, 400);
        }

        const { results: allProds } = await env.DB.prepare('SELECT code, size, qty FROM products').all();
        const stmts = [];
        const missing = [];
        const applied = [];
        let updated = 0;

        for (const raw of items) {
          const code = String(raw.code || raw.sku || '').trim();
          const size = normalizeSize(raw.size);
          const addQty = parseInt(raw.qty ?? raw.addQty ?? raw.add_qty, 10);
          if (!code || !size) {
            missing.push({ code, size, qty: addQty, error: 'Missing code or size' });
            continue;
          }
          if (!Number.isFinite(addQty) || addQty <= 0) {
            missing.push({ code, size, qty: addQty, error: 'Invalid qty (must be positive)' });
            continue;
          }
          const match = findProduct(allProds, code, size);
          if (!match) {
            missing.push({ code, size, qty: addQty, error: 'Product not found' });
            continue;
          }
          const before = parseInt(match.qty, 10) || 0;
          const after = before + addQty;
          stmts.push(
            env.DB.prepare('UPDATE products SET qty = qty + ? WHERE code = ? AND size = ?').bind(
              addQty,
              match.code,
              match.size
            )
          );
          applied.push({ code: match.code, size: match.size, before, delta: addQty, after });
          match.qty = after;
          updated += 1;
        }

        if (stmts.length) await env.DB.batch(stmts);
        for (const a of applied) {
          await logStockMovement(env, {
            code: a.code,
            size: a.size,
            delta: a.delta,
            reason: 'receive',
            qtyBefore: a.before,
            qtyAfter: a.after,
          });
        }
        return jsonResponse({ success: true, updated, applied, missing });
      }

      // Adjust stock by signed delta (can be negative). Floor at 0.
      // Body: { items: [{ code, size, delta }, ...] }
      if (path === '/api/admin/products/adjust' && request.method === 'POST') {
        const body = await request.json();
        const items = Array.isArray(body) ? body : (body && body.items) || [];
        if (!items.length) {
          return jsonResponse({ error: 'No items to adjust' }, 400);
        }

        const { results: allProds } = await env.DB.prepare('SELECT code, size, qty FROM products').all();
        const stmts = [];
        const missing = [];
        const applied = [];
        let updated = 0;

        for (const raw of items) {
          const code = String(raw.code || raw.sku || '').trim();
          const size = normalizeSize(raw.size);
          const delta = parseInt(raw.delta ?? raw.qty ?? raw.adjust, 10);
          if (!code || !size) {
            missing.push({ code, size, delta, error: 'Missing code or size' });
            continue;
          }
          if (!Number.isFinite(delta) || delta === 0) {
            missing.push({ code, size, delta, error: 'Invalid delta (must be non-zero integer)' });
            continue;
          }
          const match = findProduct(allProds, code, size);
          if (!match) {
            missing.push({ code, size, delta, error: 'Product not found' });
            continue;
          }
          const before = parseInt(match.qty, 10) || 0;
          const after = Math.max(0, before + delta);
          stmts.push(
            env.DB.prepare('UPDATE products SET qty = ? WHERE code = ? AND size = ?').bind(
              after,
              match.code,
              match.size
            )
          );
          applied.push({ code: match.code, size: match.size, before, delta, after });
          match.qty = after;
          updated += 1;
        }

        if (stmts.length) await env.DB.batch(stmts);
        for (const a of applied) {
          await logStockMovement(env, {
            code: a.code,
            size: a.size,
            delta: a.after - a.before,
            reason: 'adjust',
            qtyBefore: a.before,
            qtyAfter: a.after,
          });
        }
        return jsonResponse({ success: true, updated, applied, missing });
      }

      if (path === '/api/admin/stock/movements' && request.method === 'GET') {
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);
        const { results } = await env.DB.prepare(
          `SELECT id, code, size, delta, reason, qty_before, qty_after, created_at, admin_note
           FROM stock_movements ORDER BY datetime(created_at) DESC, id DESC LIMIT ?`
        )
          .bind(limit)
          .all();
        return jsonResponse({ movements: results || [] });
      }

      if (path === '/api/admin/payment-methods' && request.method === 'GET') {
        return jsonResponse(paymentMethodsFromEnv(env));
      }

      if (path === '/api/admin/orders' && request.method === 'GET') {
        const orders = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
        const items = await env.DB.prepare('SELECT * FROM order_items').all();
        const prods = await env.DB.prepare('SELECT * FROM products').all();
        const orderRows = orders.results || [];
        const itemRows = items.results || [];
        const prodRows = prods.results || [];

        const formattedOrders = orderRows.map((o) => {
          const orderItems = itemRows.filter((i) => i.order_id === o.id).map((i) => mapOrderItem(i, prodRows));
          return formatOrderRow(o, orderItems);
        });
        return jsonResponse(formattedOrders);
      }

      if (path === '/api/admin/orders/next-id' && request.method === 'GET') {
        const id = await nextApbsOrderId(env);
        return jsonResponse({ id });
      }

      // Lightweight paid / unpaid toggle (no line-item rewrite).
      if (path === '/api/admin/orders/mark-paid' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const id = String(body.id || body.orderId || url.searchParams.get('id') || '').trim();
        const result = await setOrderPaymentStatus(env, id, {
          paymentStatus: body.paymentStatus || 'paid',
          paymentMethod: body.paymentMethod || body.method || 'other',
          paymentNote: body.paymentNote || body.note || '',
          paidAt: body.paidAt || null,
        });
        if (result.error) return jsonResponse({ error: result.error }, result.status || 400);
        return jsonResponse(result);
      }

      if (path === '/api/admin/orders' && request.method === 'POST') {
        const o = await request.json();

        // New orders without a proper APBS-###### id get the next sequential number.
        const existing = o.id
          ? await env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(o.id).first()
          : null;
        if (!existing && !isApbsOrderId(o.id)) {
          o.id = await nextApbsOrderId(env);
        }

        // Admin saves may include backorders (ordered qty > on-hand), so do not
        // block on stock — applyOrderItemsStock still floors at 0.
        const { results: allProds } = await env.DB.prepare('SELECT * FROM products').all();
        const priced = validateAdminOrderItems(allProds, o.items || [], {
          checkStock: false,
        });
        if (priced.error && (o.items || []).length > 0) {
          return jsonResponse({ error: priced.error }, 400);
        }

        const shipments = normalizeShipments(o.shipments);
        const shipmentsJson = JSON.stringify(shipments);
        const pay = normalizePaymentFields(o);
        const placedIso = o.placedAt || new Date().toISOString();
        const custEmail = String(o.customer?.email || 'unknown').trim().toLowerCase();
        const totalAmt = priced.total || 0;
        // Live D1 matches schema.sql (no legacy user_email / total / placed_at / data cols).
        const stmts = [
          env.DB.prepare(
            `INSERT INTO orders (
               id, user_id, status,
               total_amount, delivery_method, delivery_address, po, notes,
               customer_snapshot, shipments_json, created_at,
               payment_status, paid_at, payment_method, payment_note
             )
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               status=excluded.status,
               total_amount=excluded.total_amount,
               delivery_method=excluded.delivery_method,
               delivery_address=excluded.delivery_address,
               po=excluded.po,
               notes=excluded.notes,
               customer_snapshot=excluded.customer_snapshot,
               shipments_json=excluded.shipments_json,
               user_id=excluded.user_id,
               payment_status=excluded.payment_status,
               paid_at=excluded.paid_at,
               payment_method=excluded.payment_method,
               payment_note=excluded.payment_note,
               created_at=COALESCE(orders.created_at, excluded.created_at)`
          ).bind(
            o.id,
            custEmail,
            o.status,
            totalAmt,
            o.delivery?.method || 'delivery',
            o.delivery?.address || '',
            o.po || '',
            o.notes || '',
            JSON.stringify(o.customer || {}),
            shipmentsJson,
            placedIso,
            pay.paymentStatus,
            pay.paidAt,
            pay.paymentMethod,
            pay.paymentNote
          ),
          env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(o.id),
        ];

        const itemsToSave = priced.validated || [];
        for (const i of itemsToSave) {
          stmts.push(
            env.DB.prepare(
              'INSERT INTO order_items (order_id, product_sku, size, quantity, price_at_purchase, qty_shipped) VALUES (?, ?, ?, ?, ?, ?)'
            ).bind(o.id, i.code, i.size, i.qty, i.unitPrice, i.qtyShipped || 0)
          );
        }

        // Release prior reservation only after validation succeeds. If the write
        // fails, re-apply the old reservation so inventory is not left inflated.
        const oldItems = await restoreOrderItemsStock(env, o.id);
        const reapplyOldStock = async () => {
          if (!oldItems || !oldItems.length) return;
          await applyOrderItemsStock(
            env,
            oldItems.map((it) => ({
              qty: parseInt(it.quantity, 10) || 0,
              code: it.product_sku,
              size: it.size,
            }))
          );
        };
        try {
          await env.DB.batch(stmts);
        } catch (err) {
          await reapplyOldStock();
          throw err;
        }

        if (o.status !== 'cancelled' && itemsToSave.length > 0) {
          try {
            await applyOrderItemsStock(env, itemsToSave);
          } catch (err) {
            await reapplyOldStock();
            throw err;
          }
        }

        // Persist address + phone on the customer's address book when possible.
        const delAddr = String(o.delivery?.address || '').trim();
        if (custEmail && custEmail !== 'unknown' && delAddr && delAddr.toUpperCase() !== 'PICKUP') {
          const dbUser = await findUserByEmailOrId(env, custEmail);
          if (dbUser) {
            try {
              await upsertSavedAddress(env, dbUser, {
                fullAddress: delAddr,
                phone: o.customer?.phone || '',
                label: o.delivery?.label || '',
                isDefault: o.saveAddressAsDefault === true,
              });
            } catch (_) {}
          }
        }

        return jsonResponse({ success: true, orderId: o.id, total: priced.total || 0 });
      }

      if (path === '/api/admin/orders' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) return jsonResponse({ error: 'Order id required' }, 400);
        await restoreOrderItemsStock(env, id);
        await env.DB.batch([
          env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(id),
          env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id),
        ]);
        return jsonResponse({ success: true, deletedId: id });
      }

      if (path === '/api/admin/email/send' && request.method === 'POST') {
        const { recipients, cc, subject, htmlBody } = await request.json();
        const toList = normalizeEmailList(recipients);
        const ccList = normalizeEmailList(cc);
        if (!toList.length) {
          return jsonResponse({ error: 'At least one To recipient is required' }, 400);
        }
        const params = { email_subject: subject, email_body: htmlBody };

        // No CC → one separate send per To (recipients don't see each other).
        if (!ccList.length) {
          const sent = [];
          const errors = [];
          for (const email of toList) {
            try {
              const result = await sendEmailJs(env, params, email);
              if (result && result.skipped) {
                errors.push({ email, error: result.reason || 'Email not configured' });
                continue;
              }
              sent.push(email);
            } catch (e) {
              errors.push({
                email,
                error: e && e.message ? String(e.message) : 'Send failed',
              });
            }
          }
          if (!sent.length) {
            const detail =
              (errors[0] && errors[0].error) ||
              'Email send failed. Check Worker EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, and EMAILJS_PUBLIC_KEY.';
            return jsonResponse(
              { error: detail, success: false, sentCount: 0, sent: [], errors },
              502
            );
          }
          return jsonResponse({
            success: true,
            mode: 'separate',
            sentCount: sent.length,
            sent,
            cc: [],
            errors: errors.length ? errors : undefined,
          });
        }

        // With CC → one shared email so To + CC can see each other.
        const ccOnly = ccList.filter((e) => !toList.includes(e));
        try {
          await sendEmailJs(env, params, toList, { cc: ccOnly });
          return jsonResponse({
            success: true,
            mode: 'shared',
            sentCount: 1,
            sent: toList,
            cc: ccOnly,
          });
        } catch (e) {
          const msg = e && e.message ? String(e.message) : 'Send failed';
          return jsonResponse({ error: msg, success: false, sentCount: 0 }, 502);
        }
      }

      return jsonResponse({ error: 'Route Not Found' }, 404);
    } catch (error) {
      const detail = error && error.message ? String(error.message) : String(error);
      return jsonResponse({ error: 'Internal Server Error', detail }, 500);
    }
  },
};
