/**
 * All Pro OS HTTP router — /api/ops/*
 */

import { actorFromAuth, jsonResponse, parsePath } from './core.js';
import { ensureOpsSchema } from './schema.js';
import {
  addStopToLoad,
  allocateOrder,
  arriveInbound,
  atpForSku,
  attachInboundToPo,
  capturePod,
  completeTask,
  confirmOrder,
  createInbound,
  createLoad,
  createPurchaseOrder,
  createWaveFromOrders,
  cycleCount,
  departLoad,
  enrichOrdersForCustomer,
  financeAr,
  holdOrder,
  hydrateInbound,
  hydrateLoad,
  hydrateOrder,
  hydratePo,
  hydrateShipment,
  hydrateWave,
  inbox,
  inventorySnapshot,
  listExceptions,
  listInbounds,
  listLoads,
  listLocations,
  listOrders,
  markShipmentInvoiced,
  packOrder,
  receiveInbound,
  releaseHold,
  reorderStops,
  resolveException,
  searchOps,
  sendPurchaseOrder,
  setCustomerCredit,
  stageShipment,
  syncOrderIntoOps,
} from './flow.js';

export { ensureOpsSchema, syncOrderIntoOps, enrichOrdersForCustomer };

function requireAdmin(auth) {
  if (!auth || !auth.admin) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }
  return null;
}

async function staffRole(env, auth) {
  const email = (auth && auth.payload && auth.payload.email) || 'admin';
  const row = await env.DB.prepare(`SELECT role, display_name FROM ops_staff WHERE email = ?`)
    .bind(String(email).toLowerCase())
    .first();
  return {
    email: String(email).toLowerCase(),
    role: (row && row.role) || 'owner',
    name: (row && row.display_name) || (auth.payload && auth.payload.name) || 'Admin',
  };
}

export async function handleOpsRequest(request, env, auth, url) {
  const denied = requireAdmin(auth);
  if (denied) return denied;

  const parts = parsePath(url.pathname);
  const method = request.method;
  const q = (name) => url.searchParams.get(name);
  const body = method === 'GET' || method === 'HEAD' ? {} : await request.json().catch(() => ({}));
  const me = await staffRole(env, auth);

  try {
    if (parts.length === 0 && method === 'GET') {
      return jsonResponse({ ok: true, name: 'All Pro OS', env: 'test' });
    }

    if (parts[0] === 'me' && method === 'GET') {
      return jsonResponse(me);
    }
    if (parts[0] === 'me' && method === 'POST') {
      const role = String(body.role || 'owner').toLowerCase();
      const allowed = ['owner', 'sales', 'warehouse', 'dispatch', 'driver', 'finance'];
      if (!allowed.includes(role)) return jsonResponse({ error: 'Unknown role' }, 400);
      await env.DB.prepare(
        `INSERT INTO ops_staff (email, role, display_name, updated_at) VALUES (?, ?, ?, ?)
         ON CONFLICT(email) DO UPDATE SET role = excluded.role, display_name = excluded.display_name, updated_at = excluded.updated_at`
      )
        .bind(me.email, role, body.name || me.name, new Date().toISOString())
        .run();
      return jsonResponse({ ok: true, ...(await staffRole(env, auth)) });
    }

    if (parts[0] === 'inbox' && method === 'GET') {
      return jsonResponse(await inbox(env));
    }
    if (parts[0] === 'search' && method === 'GET') {
      return jsonResponse(await searchOps(env, q('q') || ''));
    }

    if (parts[0] === 'orders' && parts.length === 1 && method === 'GET') {
      return jsonResponse(await listOrders(env, { status: q('status'), q: q('q'), limit: q('limit') }));
    }
    if (parts[0] === 'orders' && parts[1] && parts.length === 2 && method === 'GET') {
      const order = await hydrateOrder(env, parts[1]);
      if (!order) return jsonResponse({ error: 'Order not found' }, 404);
      return jsonResponse(order);
    }
    if (parts[0] === 'orders' && parts[2] === 'sync' && method === 'POST') {
      await syncOrderIntoOps(env, parts[1], actorFromAuth(auth));
      return jsonResponse({ ok: true, order: await hydrateOrder(env, parts[1]) });
    }
    if (parts[0] === 'orders' && parts[2] === 'confirm' && method === 'POST') {
      const r = await confirmOrder(env, parts[1], auth, { promisedAt: body.promisedAt });
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }
    if (parts[0] === 'orders' && parts[2] === 'hold' && method === 'POST') {
      return jsonResponse(await holdOrder(env, parts[1], auth, { reason: body.reason }));
    }
    if (parts[0] === 'orders' && parts[2] === 'release-hold' && method === 'POST') {
      return jsonResponse(await releaseHold(env, parts[1], auth));
    }
    if (parts[0] === 'orders' && parts[2] === 'allocate' && method === 'POST') {
      return jsonResponse(await allocateOrder(env, parts[1], auth));
    }
    if (parts[0] === 'orders' && parts[2] === 'pack' && method === 'POST') {
      const r = await packOrder(env, parts[1], auth, body);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }
    if (parts[0] === 'orders' && parts[2] === 'wave' && method === 'POST') {
      const r = await createWaveFromOrders(env, [parts[1]], auth, body.note);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }

    if (parts[0] === 'waves' && parts.length === 1 && method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT * FROM waves ORDER BY created_at DESC LIMIT 50`).all();
      return jsonResponse(results || []);
    }
    if (parts[0] === 'waves' && parts.length === 1 && method === 'POST') {
      const r = await createWaveFromOrders(env, body.orderIds || body.orders, auth, body.note);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }
    if (parts[0] === 'waves' && parts[1] && method === 'GET') {
      const wave = await hydrateWave(env, parts[1]);
      if (!wave) return jsonResponse({ error: 'Wave not found' }, 404);
      return jsonResponse(wave);
    }

    if (parts[0] === 'tasks' && parts.length === 1 && method === 'GET') {
      const type = q('type');
      const status = q('status') || 'open';
      let sql = `SELECT t.*, p.description FROM warehouse_tasks t
                 LEFT JOIN products p ON p.code = t.code AND p.size = t.size WHERE 1=1`;
      const binds = [];
      if (type) {
        sql += ` AND t.type = ?`;
        binds.push(type);
      }
      if (status === 'open') {
        sql += ` AND t.status IN ('pending', 'in_progress', 'short')`;
      } else if (status && status !== 'all') {
        sql += ` AND t.status = ?`;
        binds.push(status);
      }
      sql += ` ORDER BY t.created_at DESC LIMIT 100`;
      const { results } = await env.DB.prepare(sql).bind(...binds).all();
      return jsonResponse(results || []);
    }
    if (parts[0] === 'tasks' && parts[2] === 'start' && method === 'POST') {
      await env.DB.prepare(
        `UPDATE warehouse_tasks SET status = 'in_progress', assignee = ?, updated_at = ? WHERE id = ?`
      )
        .bind(me.email, new Date().toISOString(), parts[1])
        .run();
      const task = await env.DB.prepare(`SELECT * FROM warehouse_tasks WHERE id = ?`).bind(parts[1]).first();
      return jsonResponse({ ok: true, task });
    }
    if (parts[0] === 'tasks' && parts[2] === 'complete' && method === 'POST') {
      const r = await completeTask(env, parts[1], auth, body);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }
    if (parts[0] === 'tasks' && parts[2] === 'short' && method === 'POST') {
      const r = await completeTask(env, parts[1], auth, { ...body, short: true });
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }

    if (parts[0] === 'shipments' && parts.length === 1 && method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT s.*, o.customer_snapshot, o.delivery_address, o.delivery_method
         FROM outbound_shipments s
         JOIN orders o ON o.id = s.order_id
         ORDER BY s.created_at DESC LIMIT 80`
      ).all();
      return jsonResponse(
        (results || []).map((r) => {
          let customer = {};
          try {
            customer = r.customer_snapshot ? JSON.parse(r.customer_snapshot) : {};
          } catch (_) {}
          return { ...r, customer };
        })
      );
    }
    if (parts[0] === 'shipments' && parts[1] && parts.length === 2 && method === 'GET') {
      const s = await hydrateShipment(env, parts[1]);
      if (!s) return jsonResponse({ error: 'Shipment not found' }, 404);
      return jsonResponse(s);
    }
    if (parts[0] === 'shipments' && parts[2] === 'stage' && method === 'POST') {
      const r = await stageShipment(env, parts[1], auth);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }
    if (parts[0] === 'shipments' && parts[2] === 'invoice' && method === 'POST') {
      const r = await markShipmentInvoiced(env, parts[1], auth, body.invoiceDocId || body.invoiceId);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }

    if (parts[0] === 'loads' && parts.length === 1 && method === 'GET') {
      return jsonResponse(await listLoads(env));
    }
    if (parts[0] === 'loads' && parts.length === 1 && method === 'POST') {
      return jsonResponse(await createLoad(env, auth, body));
    }
    if (parts[0] === 'loads' && parts[1] && parts.length === 2 && method === 'GET') {
      const load = await hydrateLoad(env, parts[1]);
      if (!load) return jsonResponse({ error: 'Load not found' }, 404);
      return jsonResponse(load);
    }
    if (parts[0] === 'loads' && parts[2] === 'stops' && method === 'POST') {
      const r = await addStopToLoad(env, parts[1], body.shipmentId, auth);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }
    if (parts[0] === 'loads' && parts[2] === 'reorder' && method === 'POST') {
      return jsonResponse(await reorderStops(env, parts[1], body.stopIds));
    }
    if (parts[0] === 'loads' && parts[2] === 'depart' && method === 'POST') {
      return jsonResponse(await departLoad(env, parts[1], auth));
    }

    if (parts[0] === 'stops' && parts[2] === 'pod' && method === 'POST') {
      const r = await capturePod(env, parseInt(parts[1], 10), auth, body);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }
    if (parts[0] === 'stops' && parts[2] === 'refuse' && method === 'POST') {
      const r = await capturePod(env, parseInt(parts[1], 10), auth, { ...body, outcome: 'refused' });
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }

    if (parts[0] === 'driver' && parts[1] === 'run' && method === 'GET') {
      const date = q('date') || new Date().toISOString().slice(0, 10);
      const { results } = await env.DB.prepare(
        `SELECT * FROM loads WHERE run_date = ? AND status IN ('planned', 'loading', 'departed') ORDER BY created_at`
      )
        .bind(date)
        .all();
      const loads = [];
      for (const l of results || []) loads.push(await hydrateLoad(env, l.id));
      return jsonResponse({ date, loads });
    }

    if (parts[0] === 'inventory' && method === 'GET') {
      return jsonResponse(await inventorySnapshot(env, { q: q('q'), limit: parseInt(q('limit') || '60', 10) }));
    }
    if (parts[0] === 'locations' && method === 'GET') {
      return jsonResponse(await listLocations(env));
    }
    if (parts[0] === 'atp' && method === 'GET') {
      const code = q('code');
      if (!code) return jsonResponse({ error: 'code required' }, 400);
      return jsonResponse(await atpForSku(env, code, q('size') || ''));
    }
    if (parts[0] === 'counts' && method === 'POST') {
      const r = await cycleCount(env, {
        code: body.code,
        size: body.size,
        locationId: body.locationId || 'FLOOR',
        countedQty: body.qty,
      });
      return jsonResponse({ ok: true, ...r });
    }

    if (parts[0] === 'purchase-orders' && parts.length === 1 && method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT * FROM vendor_pos ORDER BY created_at DESC LIMIT 50`).all();
      return jsonResponse(results || []);
    }
    if (parts[0] === 'purchase-orders' && parts.length === 1 && method === 'POST') {
      return jsonResponse(await createPurchaseOrder(env, auth, body));
    }
    if (parts[0] === 'purchase-orders' && parts[1] && parts.length === 2 && method === 'GET') {
      const po = await hydratePo(env, parts[1]);
      if (!po) return jsonResponse({ error: 'PO not found' }, 404);
      return jsonResponse(po);
    }
    if (parts[0] === 'purchase-orders' && parts[2] === 'send' && method === 'POST') {
      return jsonResponse(await sendPurchaseOrder(env, parts[1], auth));
    }
    if (parts[0] === 'purchase-orders' && parts[2] === 'attach-inbound' && method === 'POST') {
      return jsonResponse(await attachInboundToPo(env, parts[1], body.inboundId));
    }

    if (parts[0] === 'inbound' && parts.length === 1 && method === 'GET') {
      return jsonResponse(await listInbounds(env));
    }
    if (parts[0] === 'inbound' && parts.length === 1 && method === 'POST') {
      return jsonResponse(await createInbound(env, auth, body));
    }
    if (parts[0] === 'inbound' && parts[1] && parts.length === 2 && method === 'GET') {
      const ib = await hydrateInbound(env, parts[1]);
      if (!ib) return jsonResponse({ error: 'Inbound not found' }, 404);
      return jsonResponse(ib);
    }
    if (parts[0] === 'inbound' && parts[2] === 'arrive' && method === 'POST') {
      return jsonResponse(await arriveInbound(env, parts[1], auth));
    }
    if (parts[0] === 'inbound' && parts[2] === 'receive' && method === 'POST') {
      const r = await receiveInbound(env, parts[1], auth, body);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }

    if (parts[0] === 'finance' && parts[1] === 'ar' && method === 'GET') {
      return jsonResponse(await financeAr(env));
    }

    if (parts[0] === 'customers' && method === 'GET') {
      const { results } = await env.DB.prepare(
        `SELECT id, email, fname, lname, company, phone, status, credit_limit, credit_hold FROM users ORDER BY company, email`
      ).all();
      return jsonResponse(results || []);
    }
    if (parts[0] === 'customers' && parts[2] === 'credit' && method === 'POST') {
      const r = await setCustomerCredit(env, decodeURIComponent(parts[1]), body);
      if (r.error) return jsonResponse(r, r.status || 400);
      return jsonResponse(r);
    }

    if (parts[0] === 'exceptions' && method === 'GET') {
      return jsonResponse(await listExceptions(env));
    }
    if (parts[0] === 'exceptions' && parts[2] === 'resolve' && method === 'POST') {
      return jsonResponse(await resolveException(env, parts[1], auth));
    }

    return jsonResponse({ error: 'Ops route not found' }, 404);
  } catch (err) {
    const detail = err && err.message ? String(err.message) : String(err);
    return jsonResponse({ error: 'Ops error', detail }, 500);
  }
}
