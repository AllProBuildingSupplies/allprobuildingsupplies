// =====================================================================
// ALL PRO BUILDING SUPPLIES - SECURE API WORKER (v3.0)
// =====================================================================

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
    .replace(/\s+/g, ' ');
}

function findProduct(prods, code, size) {
  const c = String(code || '').trim();
  const n = normalizeSize(size);
  return (
    prods.find((p) => String(p.code || '').trim() === c && normalizeSize(p.size) === n) ||
    prods.find((p) => p.code === code && p.size === size) ||
    null
  );
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
      return `<tr><td style="padding:10px 14px;font-size:13px;color:#333;border-bottom:1px solid #f0f0f0;">${desc}<br/><span style="font-size:11px;color:#888">${sub}</span></td><td style="padding:10px 14px;font-size:13px;color:#333;text-align:right;border-bottom:1px solid #f0f0f0;">${line}</td></tr>`;
    })
    .join('');
  const poBlock =
    order.po || order.notes
      ? `<tr><td style="padding:0 36px 24px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#fffbf0;border:1px solid #f0e0a0;border-radius:4px;"><tr><td style="padding:14px 18px;"><div style="font-size:12px;color:#666;margin-bottom:4px;"><strong style="color:#333">PO Number:</strong> ${po}</div><div style="font-size:12px;color:#666;"><strong style="color:#333">Notes:</strong> ${notes}</div></td></tr></table></td></tr>`
      : '';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:4px;overflow:hidden;"><tr><td style="background:#0C1117;padding:28px 36px;border-bottom:4px solid #C8981F;"><div style="font-family:Arial Black,Arial,sans-serif;font-size:20px;font-weight:900;color:#FFFFFF;letter-spacing:2px;">ALL PRO BUILDING SUPPLIES</div><div style="font-size:11px;color:#C8981F;letter-spacing:3px;margin-top:3px;">LLC</div></td></tr><tr><td style="padding:32px 36px 0;"><p style="margin:0;font-size:16px;color:#222;">Hi <strong>${name}</strong>,</p><p style="margin:12px 0 0;font-size:15px;color:#444;">Thank you for your order! We have received it and will be in touch shortly.</p></td></tr><tr><td style="padding:24px 36px 0;"><table width="100%" style="background:#f8f8f8;border:1px solid #e8e8e8;"><tr><td style="padding:16px 20px;"><div style="font-size:10px;color:#888;">Order ID</div><div style="font-size:14px;font-weight:700;color:#C8981F;">${orderId}</div></td><td style="padding:16px 20px;"><div style="font-size:10px;color:#888;">Date</div><div>${dateStr}</div></td><td style="padding:16px 20px;"><div style="font-size:10px;color:#888;">Delivery</div><div>${addr}</div></td></tr></table></td></tr><tr><td style="padding:24px 36px 0;"><table width="100%" style="border:1px solid #e8e8e8;">${rows}</table></td></tr><tr><td style="padding:0 36px;text-align:right;"><span style="font-size:22px;font-weight:700;">${total}</span></td></tr>${poBlock}<tr><td style="padding:24px 36px;"><p style="font-size:14px;color:#444;">Questions? Call <a href="tel:17327341123" style="color:#C8981F;">732-734-1123</a></p></td></tr></table></td></tr></table></body></html>`;
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
  let customer = { name: 'Unknown', email: em };
  try {
    if (order.customer_snapshot) customer = JSON.parse(order.customer_snapshot);
  } catch (_) {}
  return {
    id: order.id,
    placedAt: order.created_at,
    status: order.status,
    total: order.total_amount,
    delivery: { method: order.delivery_method, address: order.delivery_address || '' },
    po: order.po || '',
    notes: order.notes || '',
    customer,
    items,
  };
}

function mapOrderItem(it, prods) {
  const match = findProduct(prods, it.product_sku, it.size);
  const canonSize = match ? match.size : normalizeSize(it.size);
  return {
    code: it.product_sku,
    size: canonSize,
    qty: it.quantity,
    unitPrice: it.price_at_purchase,
    lineTotal: it.quantity * it.price_at_purchase,
    description: match ? match.description : 'Unknown Product',
    pcsPerCtn: match ? match.pack : 1,
  };
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

async function authFromRequest(request, env) {
  const token = getBearer(request);
  const secret = jwtSecret(env);
  if (!token || !secret) return { admin: false, user: null };
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

async function sendEmailJs(env, templateParams, toEmail) {
  const serviceId = env.EMAILJS_SERVICE_ID;
  const templateId = env.EMAILJS_TEMPLATE_ID;
  const publicKey = env.EMAILJS_PUBLIC_KEY;
  if (!serviceId || !templateId || !publicKey) {
    return { skipped: true, reason: 'Email not configured' };
  }
  const body = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    template_params: { ...templateParams, to_email: toEmail, cust_email: toEmail },
  };
  if (env.EMAILJS_PRIVATE_KEY) body.accessToken = env.EMAILJS_PRIVATE_KEY;
  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `EmailJS HTTP ${res.status}`);
  }
  return { ok: true };
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

      // ---------------------------------------------------------
      // PUBLIC ROUTES
      // ---------------------------------------------------------
      if (path === '/api/health' && request.method === 'GET') {
        return jsonResponse({ status: 'ok' });
      }

      if (path === '/api/admin/login' && request.method === 'POST') {
        const adminToken = env.ADMIN_TOKEN;
        if (!adminToken) {
          return jsonResponse({ error: 'Admin login not configured. Set ADMIN_TOKEN secret.' }, 503);
        }
        const { password } = await request.json();
        if (password !== adminToken) {
          return jsonResponse({ error: 'Incorrect password' }, 401);
        }
        const token = await signToken({ role: 'admin' }, jwtSecret(env), 24);
        return jsonResponse({ success: true, token });
      }

      if (path === '/api/products' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM products').all();
        const trade = auth.admin || (auth.user && auth.user.status === 'approved');
        const payload = trade ? results : results.map(toPublicProduct);
        return jsonResponse(payload);
      }

      if (path === '/api/login' && request.method === 'POST') {
        const { email, password } = await request.json();
        if (!email || typeof email !== 'string' || !String(email).trim()) {
          return jsonResponse({ error: 'Email is required' }, 400);
        }
        if (!password) {
          return jsonResponse({ error: 'Password is required' }, 400);
        }
        const { results } = await env.DB.prepare('SELECT * FROM users WHERE email = ? AND password = ?')
          .bind(email.trim().toLowerCase(), password)
          .all();
        if (results.length === 0) return jsonResponse({ error: 'Invalid email or password' }, 401);
        const user = results[0];
        if (user.status !== 'approved') return jsonResponse({ error: 'Account pending approval.' }, 403);
        const secret = jwtSecret(env);
        if (!secret) return jsonResponse({ error: 'Auth not configured' }, 503);
        const token = await signToken(
          {
            role: 'user',
            sub: user.id,
            email: user.email.toLowerCase(),
            status: user.status,
            canOrderPieces: user.canOrderPieces === 1,
          },
          secret
        );
        delete user.password;
        user.canOrderPieces = user.canOrderPieces === 1;
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
        if (!o.id || !o.customer || !o.customer.email) {
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

        const stmts = [
          env.DB.prepare(
            `INSERT INTO orders (id, user_id, status, total_amount, delivery_method, delivery_address, po, notes, customer_snapshot, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            o.id,
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
            ).bind(o.id, i.code, i.size, i.qty, i.unitPrice)
          );
        }
        await env.DB.batch(stmts);
        await applyOrderItemsStock(env, priced.validated);

        return jsonResponse({ success: true, orderId: o.id, total: priced.total, items: priced.validated });
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
        const custSubject = `Order Received — ${order.id} | All Pro Building Supplies`;
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
          let customer = { name: 'Unknown', email: em };
          try {
            if (o.customer_snapshot) customer = JSON.parse(o.customer_snapshot);
          } catch (_) {}
          return {
            id: o.id,
            placedAt: o.created_at,
            status: o.status,
            total: o.total_amount,
            delivery: { method: o.delivery_method, address: o.delivery_address || '' },
            po: o.po || '',
            notes: o.notes || '',
            customer,
            items: orderItems,
          };
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

      if (path === '/api/admin/users' && request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM users').all();
        const safe = results.map((u) => {
          const copy = { ...u };
          delete copy.password;
          return copy;
        });
        return jsonResponse(safe);
      }

      if (path === '/api/admin/users' && request.method === 'POST') {
        const u = await request.json();
        const storedPw = await ensureStoredPassword(u.password);
        await env.DB.prepare(
          `INSERT INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(u.id, u.fname, u.lname, u.company, u.email.toLowerCase(), u.phone || '', storedPw, u.status, u.canOrderPieces ? 1 : 0, new Date().toISOString())
          .run();
        return jsonResponse({ success: true });
      }

      if (path === '/api/admin/users' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
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

      if (path === '/api/admin/products/sync' && request.method === 'POST') {
        const products = await request.json();
        const stmts = [env.DB.prepare('DELETE FROM products')];
        for (const p of products) {
          const mainCat = p.main_category != null ? String(p.main_category) : '';
          const subCat = p.sub_category != null ? String(p.sub_category) : '';
          const size = normalizeSize(p.size);
          stmts.push(
            env.DB.prepare(
              'INSERT INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(String(p.code || '').trim(), p.description, size, p.pack, p.qty, p.price, p.image, mainCat, subCat)
          );
        }
        await env.DB.batch(stmts);
        return jsonResponse({ success: true });
      }

      if (path === '/api/admin/products/bulk-update' && request.method === 'POST') {
        const products = await request.json();
        const stmts = [];
        for (const p of products) {
          const mainCat = p.main_category != null ? String(p.main_category) : '';
          const subCat = p.sub_category != null ? String(p.sub_category) : '';
          stmts.push(
            env.DB.prepare(`
            INSERT INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(code, size) DO UPDATE SET 
              description=excluded.description, pack=excluded.pack, 
              qty=excluded.qty, price=excluded.price, image=excluded.image,
              main_category=excluded.main_category, sub_category=excluded.sub_category
          `).bind(
              String(p.code || '').trim(),
              p.description,
              normalizeSize(p.size),
              p.pack,
              p.qty,
              p.price,
              p.image,
              mainCat,
              subCat
            )
          );
        }
        await env.DB.batch(stmts);
        return jsonResponse({ success: true });
      }

      if (path === '/api/admin/orders' && request.method === 'GET') {
        const orders = await env.DB.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
        const items = await env.DB.prepare('SELECT * FROM order_items').all();
        const prods = await env.DB.prepare('SELECT * FROM products').all();

        const formattedOrders = orders.results.map((o) => {
          const orderItems = items.results.filter((i) => i.order_id === o.id).map((i) => mapOrderItem(i, prods.results));
          let customer = { name: 'Unknown' };
          try {
            if (o.customer_snapshot) customer = JSON.parse(o.customer_snapshot);
          } catch (_) {}
          return {
            id: o.id,
            placedAt: o.created_at,
            status: o.status,
            total: o.total_amount,
            delivery: { method: o.delivery_method, address: o.delivery_address || '' },
            po: o.po || '',
            notes: o.notes || '',
            customer,
            items: orderItems,
          };
        });
        return jsonResponse(formattedOrders);
      }

      if (path === '/api/admin/orders' && request.method === 'POST') {
        const o = await request.json();
        const { results: allProds } = await env.DB.prepare('SELECT * FROM products').all();
        await restoreOrderItemsStock(env, o.id);
        const priced = validateAdminOrderItems(allProds, o.items || [], {
          checkStock: o.status !== 'cancelled',
        });
        if (priced.error && (o.items || []).length > 0) return jsonResponse({ error: priced.error }, 400);

        const stmts = [
          env.DB.prepare(
            `INSERT INTO orders (id, user_id, status, total_amount, delivery_method, delivery_address, po, notes, customer_snapshot, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET status=excluded.status, total_amount=excluded.total_amount, delivery_address=excluded.delivery_address, po=excluded.po, notes=excluded.notes, customer_snapshot=excluded.customer_snapshot`
          ).bind(
            o.id,
            o.customer?.email || 'unknown',
            o.status,
            priced.total || 0,
            o.delivery?.method || 'delivery',
            o.delivery?.address || '',
            o.po || '',
            o.notes || '',
            JSON.stringify(o.customer || {}),
            o.placedAt || new Date().toISOString()
          ),
          env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(o.id),
        ];

        const itemsToSave = priced.validated || [];
        for (const i of itemsToSave) {
          stmts.push(
            env.DB.prepare(
              'INSERT INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)'
            ).bind(o.id, i.code, i.size, i.qty, i.unitPrice)
          );
        }
        await env.DB.batch(stmts);

        if (o.status !== 'cancelled' && itemsToSave.length > 0) {
          await applyOrderItemsStock(env, itemsToSave);
        }

        return jsonResponse({ success: true, total: priced.total || 0 });
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
        const { recipients, subject, htmlBody } = await request.json();
        const sent = [];
        for (const email of recipients || []) {
          try {
            await sendEmailJs(env, { email_subject: subject, email_body: htmlBody }, email);
            sent.push(email);
          } catch (_) {}
        }
        return jsonResponse({ success: true, sentCount: sent.length, sent });
      }

      return jsonResponse({ error: 'Route Not Found' }, 404);
    } catch (error) {
      return jsonResponse({ error: 'Internal Server Error' }, 500);
    }
  },
};
