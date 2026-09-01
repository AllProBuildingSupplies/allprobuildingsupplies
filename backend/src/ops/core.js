/**
 * All Pro OS — ids, workflow log, shared helpers.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function nowIso() {
  return new Date().toISOString();
}

export function actorFromAuth(auth) {
  if (!auth) return 'system';
  if (auth.payload && auth.payload.email) return String(auth.payload.email);
  if (auth.admin) return 'admin';
  if (auth.user && auth.user.email) return String(auth.user.email);
  return 'ops';
}

export async function nextPrefixedId(env, seqName, prefix, pad = 6) {
  const row = await env.DB.prepare(`SELECT next_val FROM ops_sequences WHERE name = ?`)
    .bind(seqName)
    .first();
  if (!row) {
    await env.DB.prepare(`INSERT INTO ops_sequences (name, next_val) VALUES (?, 2)`).bind(seqName).run();
    return prefix + String(1).padStart(pad, '0');
  }
  const n = Math.max(1, parseInt(row.next_val, 10) || 1);
  await env.DB.prepare(`UPDATE ops_sequences SET next_val = ? WHERE name = ?`)
    .bind(n + 1, seqName)
    .run();
  return prefix + String(n).padStart(pad, '0');
}

export async function logEvent(env, { entityType, entityId, fromStatus, toStatus, action, actor, note }) {
  await env.DB.prepare(
    `INSERT INTO workflow_events
     (entity_type, entity_id, from_status, to_status, action, actor, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      entityType || '',
      entityId || '',
      fromStatus || '',
      toStatus || '',
      action || '',
      actor || '',
      note || '',
      nowIso()
    )
    .run();
}

export async function timeline(env, entityType, entityId, limit = 80) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM workflow_events
     WHERE entity_type = ? AND entity_id = ?
     ORDER BY id DESC LIMIT ?`
  )
    .bind(entityType, entityId, limit)
    .all();
  return results || [];
}

export async function openException(env, { kind, entityType, entityId, summary, detail }) {
  await env.DB.prepare(
    `INSERT INTO exceptions (kind, status, entity_type, entity_id, summary, detail, created_at)
     VALUES (?, 'open', ?, ?, ?, ?, ?)`
  )
    .bind(kind, entityType || '', entityId || '', summary || '', detail || '', nowIso())
    .run();
}

export async function resolveExceptions(env, entityType, entityId, actor) {
  await env.DB.prepare(
    `UPDATE exceptions SET status = 'resolved', resolved_at = ?, resolved_by = ?
     WHERE entity_type = ? AND entity_id = ? AND status = 'open'`
  )
    .bind(nowIso(), actor || '', entityType, entityId)
    .run();
}

export const ORDER_STATES = [
  'pending',
  'on_hold',
  'confirmed',
  'released',
  'picking',
  'packed',
  'staged',
  'loaded',
  'out_for_delivery',
  'delivered',
  'invoiced',
  'cancelled',
];

/** Compatible overlay: map legacy admin status onto fulfillment_status. */
export function normalizeFulfillment(order) {
  const f = String(order.fulfillment_status || '').trim();
  if (f) return f;
  const st = String(order.status || '').toLowerCase().trim();
  if (st === 'pending') return 'pending';
  if (st === 'confirmed') return 'confirmed';
  if (st === 'partially_shipped') return 'packed';
  if (st === 'delivered') return 'delivered';
  if (st === 'cancelled') return 'cancelled';
  return st || 'pending';
}

export async function setOrderFulfillment(env, orderId, fulfillment, { actor, action, note, legacyStatus } = {}) {
  const row = await env.DB.prepare(`SELECT status, fulfillment_status FROM orders WHERE id = ?`)
    .bind(orderId)
    .first();
  if (!row) return null;
  const from = normalizeFulfillment(row);
  const sets = [`fulfillment_status = ?`];
  const binds = [fulfillment];
  if (legacyStatus) {
    sets.push('status = ?');
    binds.push(legacyStatus);
  }
  binds.push(orderId);
  await env.DB.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  await logEvent(env, {
    entityType: 'order',
    entityId: orderId,
    fromStatus: from,
    toStatus: fulfillment,
    action: action || fulfillment,
    actor,
    note,
  });
  return fulfillment;
}

export function parsePath(pathname) {
  const rest = pathname.replace(/^\/api\/ops\/?/, '');
  return rest.split('/').filter(Boolean);
}

export function intQty(v, fallback = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}
