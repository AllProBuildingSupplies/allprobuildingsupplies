// =====================================================================
// ALL PRO BUILDING SUPPLIES - SECURE API WORKER (v2.0)
// =====================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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
  return prods.find(p => String(p.code || '').trim() === c && normalizeSize(p.size) === n)
    || prods.find(p => p.code === code && p.size === size)
    || null;
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
    description: match ? match.description : (it.product_sku ? 'Unknown Product' : 'Unknown Product'),
    pcsPerCtn: match ? match.pack : 1
  };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    
    // Admin Security Verification
    const isAdmin = request.headers.get('Authorization') === 'Bearer Admin2026!';

    try {
      // ---------------------------------------------------------
      // PUBLIC ROUTES (App & Website)
      // ---------------------------------------------------------
      if (path === '/api/health' && request.method === 'GET') {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      if (path === '/api/products' && request.method === 'GET') {
        const { results } = await env.DB.prepare("SELECT * FROM products").all();
        return new Response(JSON.stringify(results), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      if (path === '/api/login' && request.method === 'POST') {
        const { email, password } = await request.json();
        const { results } = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password = ?").bind(email.toLowerCase(), password).all();
        if (results.length === 0) return new Response(JSON.stringify({ error: 'Invalid email or password' }), { status: 401, headers: corsHeaders });
        const user = results[0];
        if (user.status !== 'approved') return new Response(JSON.stringify({ error: 'Account pending approval.' }), { status: 403, headers: corsHeaders });
        delete user.password;
        return new Response(JSON.stringify({ message: 'Login successful', token: 'secure-token-123', user: user }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      if (path === '/api/register' && request.method === 'POST') {
        const body = await request.json();
        try {
          await env.DB.prepare(`INSERT INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1, ?)`).bind(body.id, body.fname, body.lname, body.company, body.email.toLowerCase(), body.phone, body.password, new Date().toISOString()).run();
        } catch (e) {
          const msg = e && e.message ? String(e.message) : '';
          if (msg.includes('UNIQUE') || msg.includes('constraint')) {
            return new Response(JSON.stringify({ error: 'An account with this email already exists.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          throw e;
        }
        return new Response(JSON.stringify({ message: 'Registration received!' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      // NEW: Secure Public Orders Route (For Checkout Page)
      if (path === '/api/orders' && request.method === 'POST') {
        const o = await request.json();
        
        // Ensure required fields exist
        if (!o.id || !o.customer || !o.customer.email) {
          return new Response(JSON.stringify({ error: 'Missing required order data' }), { status: 400, headers: corsHeaders });
        }

        const stmts = [
          env.DB.prepare(`
            INSERT INTO orders (id, user_id, status, total_amount, delivery_method, delivery_address, po, notes, customer_snapshot, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            o.id, o.customer.email.toLowerCase(), 'pending', o.total, 
            o.delivery.method || 'delivery', o.delivery.address || '', 
            o.po || '', o.notes || '', JSON.stringify(o.customer), o.placedAt
          )
        ];

        if (o.items && o.items.length > 0) {
          const { results: allProds } = await env.DB.prepare("SELECT * FROM products").all();
          for (const i of o.items) {
            const match = findProduct(allProds, i.code, i.size);
            const canonSize = match ? match.size : normalizeSize(i.size);
            const canonCode = match ? match.code : String(i.code || '').trim();
            stmts.push(env.DB.prepare("INSERT INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)").bind(o.id, canonCode, canonSize, i.qty, i.unitPrice));
            stmts.push(env.DB.prepare("UPDATE products SET qty = MAX(0, qty - ?) WHERE code = ? AND size = ?").bind(i.qty, canonCode, canonSize));
          }
        }

        await env.DB.batch(stmts);
        return new Response(JSON.stringify({ success: true, orderId: o.id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (path === '/api/customer-orders' && request.method === 'POST') {
        const { email } = await request.json();
        if (!email || typeof email !== 'string') {
          return new Response(JSON.stringify({ error: 'Email required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        const em = email.trim().toLowerCase();
        const orders = await env.DB.prepare(`
          SELECT * FROM orders
          WHERE LOWER(TRIM(user_id)) = ?
             OR user_id = (SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1)
          ORDER BY datetime(created_at) DESC
        `).bind(em, em).all();
        const items = await env.DB.prepare("SELECT * FROM order_items").all();
        const prods = await env.DB.prepare("SELECT * FROM products").all();
        const formattedOrders = orders.results.map(o => {
          const orderItems = items.results.filter(it => it.order_id === o.id).map(it => mapOrderItem(it, prods.results));
          let customer = { name: 'Unknown', email: em };
          try {
            if (o.customer_snapshot) customer = JSON.parse(o.customer_snapshot);
          } catch (_) {}
          return {
            id: o.id, placedAt: o.created_at, status: o.status, total: o.total_amount,
            delivery: { method: o.delivery_method, address: o.delivery_address || '' },
            po: o.po || '', notes: o.notes || '',
            customer,
            items: orderItems
          };
        });
        return new Response(JSON.stringify(formattedOrders), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // ---------------------------------------------------------
      // SECURE ADMIN ROUTES
      // ---------------------------------------------------------
      if (!path.startsWith('/api/admin')) return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });
      if (!isAdmin) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

      // -- USERS --
      if (path === '/api/admin/users' && request.method === 'GET') {
        const { results } = await env.DB.prepare("SELECT * FROM users").all();
        return new Response(JSON.stringify(results), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }
      
      if (path === '/api/admin/users' && request.method === 'POST') {
        const u = await request.json();
        await env.DB.prepare(`INSERT INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(u.id, u.fname, u.lname, u.company, u.email.toLowerCase(), u.phone || '', u.password, u.status, u.canOrderPieces ? 1 : 0, new Date().toISOString()).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      if (path === '/api/admin/users' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(id).run();
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      if (path === '/api/admin/users/bulk' && request.method === 'PUT') {
        const users = await request.json();
        const stmts = users.map(u => env.DB.prepare("UPDATE users SET status = ?, canOrderPieces = ?, password = ? WHERE id = ?").bind(u.status, u.canOrderPieces ? 1 : 0, u.password, u.id));
        await env.DB.batch(stmts);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      // -- PRODUCTS --
      // Wipe Clean Route (Used by Manual "Save Products" Button)
      if (path === '/api/admin/products/sync' && request.method === 'POST') {
        const products = await request.json();
        const stmts = [env.DB.prepare("DELETE FROM products")]; // Wipe clean
        for (const p of products) {
          const mainCat = p.main_category != null ? String(p.main_category) : '';
          const subCat = p.sub_category != null ? String(p.sub_category) : '';
          const size = normalizeSize(p.size);
          stmts.push(env.DB.prepare("INSERT INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(String(p.code || '').trim(), p.description, size, p.pack, p.qty, p.price, p.image, mainCat, subCat));
        }
        await env.DB.batch(stmts); // Insert all new
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      // NEW: Safe CSV Upsert Route (Insert or Update without wiping)
      if (path === '/api/admin/products/bulk-update' && request.method === 'POST') {
        const products = await request.json();
        const stmts = [];
        for (const p of products) {
          const mainCat = p.main_category != null ? String(p.main_category) : '';
          const subCat = p.sub_category != null ? String(p.sub_category) : '';
          stmts.push(env.DB.prepare(`
            INSERT INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(code, size) DO UPDATE SET 
              description=excluded.description, pack=excluded.pack, 
              qty=excluded.qty, price=excluded.price, image=excluded.image,
              main_category=excluded.main_category, sub_category=excluded.sub_category
          `).bind(String(p.code || '').trim(), p.description, normalizeSize(p.size), p.pack, p.qty, p.price, p.image, mainCat, subCat));
        }
        await env.DB.batch(stmts);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      // -- ORDERS --
      if (path === '/api/admin/orders' && request.method === 'GET') {
        const orders = await env.DB.prepare("SELECT * FROM orders ORDER BY created_at DESC").all();
        const items = await env.DB.prepare("SELECT * FROM order_items").all();
        const prods = await env.DB.prepare("SELECT * FROM products").all();

        const formattedOrders = orders.results.map(o => {
          const orderItems = items.results.filter(i => i.order_id === o.id).map(i => mapOrderItem(i, prods.results));
          let customer = { name: 'Unknown' };
          try {
            if (o.customer_snapshot) customer = JSON.parse(o.customer_snapshot);
          } catch (_) {}
          return {
            id: o.id, placedAt: o.created_at, status: o.status, total: o.total_amount,
            delivery: { method: o.delivery_method, address: o.delivery_address || '' },
            po: o.po || '', notes: o.notes || '',
            customer,
            items: orderItems
          };
        });
        return new Response(JSON.stringify(formattedOrders), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
      }

      if (path === '/api/admin/orders' && request.method === 'POST') {
        const o = await request.json();
        const stmts = [
          env.DB.prepare(`
            INSERT INTO orders (id, user_id, status, total_amount, delivery_method, delivery_address, po, notes, customer_snapshot, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET status=excluded.status, total_amount=excluded.total_amount, delivery_address=excluded.delivery_address, po=excluded.po, notes=excluded.notes, customer_snapshot=excluded.customer_snapshot
          `).bind(o.id, o.customer.email || 'unknown', o.status, o.total, o.delivery.method || 'delivery', o.delivery.address || '', o.po || '', o.notes || '', JSON.stringify(o.customer), o.placedAt),
          env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(o.id)
        ];
        if (o.items && o.items.length > 0) {
          const { results: allProds } = await env.DB.prepare("SELECT * FROM products").all();
          for (const i of o.items) {
            const match = findProduct(allProds, i.code, i.size);
            const canonSize = match ? match.size : normalizeSize(i.size);
            const canonCode = match ? match.code : String(i.code || '').trim();
            stmts.push(env.DB.prepare("INSERT INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES (?, ?, ?, ?, ?)").bind(o.id, canonCode, canonSize, i.qty, i.unitPrice));
          }
        }
        await env.DB.batch(stmts);
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
      }

      if (path === '/api/admin/orders' && request.method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) {
          return new Response(JSON.stringify({ error: 'Order id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        await env.DB.batch([
          env.DB.prepare("DELETE FROM order_items WHERE order_id = ?").bind(id),
          env.DB.prepare("DELETE FROM orders WHERE id = ?").bind(id),
        ]);
        return new Response(JSON.stringify({ success: true, deletedId: id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Route Not Found' }), { status: 404, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }
  }
};