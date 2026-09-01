/**
 * All Pro OS — location inventory + ATP.
 * products.qty remains catalog ATP for the storefront.
 * inventory_balances is physical qty by location.
 */

import { intQty, nowIso } from './core.js';

export async function listLocations(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM warehouse_locations ORDER BY sort_order, id`
  ).all();
  return results || [];
}

export async function getBalance(env, code, size, locationId) {
  const row = await env.DB.prepare(
    `SELECT qty FROM inventory_balances WHERE code = ? AND size = ? AND location_id = ?`
  )
    .bind(code, size || '', locationId)
    .first();
  return intQty(row && row.qty);
}

export async function addBalance(env, code, size, locationId, delta) {
  if (!code || !locationId || !delta) return getBalance(env, code, size, locationId);
  const loc = locationId;
  const sz = size || '';
  const existing = await env.DB.prepare(
    `SELECT qty FROM inventory_balances WHERE code = ? AND size = ? AND location_id = ?`
  )
    .bind(code, sz, loc)
    .first();
  if (!existing) {
    const qty = Math.max(0, delta);
    await env.DB.prepare(
      `INSERT INTO inventory_balances (code, size, location_id, qty) VALUES (?, ?, ?, ?)`
    )
      .bind(code, sz, loc, qty)
      .run();
    return qty;
  }
  const next = Math.max(0, intQty(existing.qty) + delta);
  await env.DB.prepare(
    `UPDATE inventory_balances SET qty = ? WHERE code = ? AND size = ? AND location_id = ?`
  )
    .bind(next, code, sz, loc)
    .run();
  return next;
}

export async function moveBalance(env, code, size, fromLoc, toLoc, qty) {
  const n = intQty(qty);
  if (n < 1) return { moved: 0 };
  const fromQty = await getBalance(env, code, size, fromLoc);
  const moved = Math.min(fromQty, n);
  if (moved < 1) return { moved: 0, fromQty };
  await addBalance(env, code, size, fromLoc, -moved);
  await addBalance(env, code, size, toLoc, moved);
  return { moved, fromQty };
}

export async function physicalOnHand(env, code, size) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(qty), 0) AS qty FROM inventory_balances WHERE code = ? AND size = ?`
  )
    .bind(code, size || '')
    .first();
  return intQty(row && row.qty);
}

export async function allocatedOpen(env, code, size) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(qty), 0) AS qty FROM allocations
     WHERE code = ? AND size = ? AND status IN ('open', 'released') AND kind = 'hard'`
  )
    .bind(code, size || '')
    .first();
  return intQty(row && row.qty);
}

export async function inboundExpected(env, code, size) {
  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(l.qty_expected - l.qty_received), 0) AS qty
     FROM inbound_lines l
     JOIN inbound_shipments s ON s.id = l.inbound_id
     WHERE l.code = ? AND l.size = ?
       AND LOWER(COALESCE(s.status, '')) IN ('in_transit', 'arrived')`
  )
    .bind(code, size || '')
    .first();
  return Math.max(0, intQty(row && row.qty));
}

export async function catalogQty(env, code, size) {
  const row = await env.DB.prepare(`SELECT qty FROM products WHERE code = ? AND size = ?`)
    .bind(code, size || '')
    .first();
  return intQty(row && row.qty);
}

/**
 * ATP = catalog available (products.qty) + inbound not yet received.
 * products.qty is decremented at order capture (existing storefront contract).
 */
export async function atpForSku(env, code, size) {
  const available = await catalogQty(env, code, size);
  const physical = await physicalOnHand(env, code, size);
  const allocated = await allocatedOpen(env, code, size);
  const inbound = await inboundExpected(env, code, size);
  const floor = await getBalance(env, code, size, 'FLOOR');
  return {
    code,
    size: size || '',
    available,
    physical,
    floor,
    allocated,
    inbound,
    atp: available + inbound,
  };
}

export async function atpMapForCodes(env, pairs) {
  const out = {};
  for (const p of pairs) {
    const key = `${p.code}\x1e${p.size || ''}`;
    if (out[key]) continue;
    out[key] = await atpForSku(env, p.code, p.size || '');
  }
  return out;
}

export async function applyCatalogDelta(env, code, size, delta) {
  if (!code || !delta) return;
  await env.DB.prepare(
    `UPDATE products SET qty = MAX(0, COALESCE(qty, 0) + ?) WHERE code = ? AND size = ?`
  )
    .bind(delta, code, size || '')
    .run();
}

export async function setCatalogQty(env, code, size, qty) {
  await env.DB.prepare(`UPDATE products SET qty = ? WHERE code = ? AND size = ?`)
    .bind(Math.max(0, intQty(qty)), code, size || '')
    .run();
}

export async function onPhysicalReceive(env, code, size, qty, locationId = 'FLOOR') {
  const n = intQty(qty);
  if (n < 1) return;
  await addBalance(env, code, size, locationId, n);
  await applyCatalogDelta(env, code, size, n);
}

export async function onPhysicalAdjust(env, code, size, delta, locationId = 'FLOOR') {
  const d = intQty(delta);
  if (!d) return;
  await addBalance(env, code, size, locationId, d);
  await applyCatalogDelta(env, code, size, d);
}

export async function cycleCount(env, { code, size, locationId, countedQty }) {
  const loc = locationId || 'FLOOR';
  const counted = Math.max(0, intQty(countedQty));
  const before = await getBalance(env, code, size, loc);
  const delta = counted - before;
  await env.DB.prepare(
    `INSERT INTO inventory_balances (code, size, location_id, qty) VALUES (?, ?, ?, ?)
     ON CONFLICT(code, size, location_id) DO UPDATE SET qty = excluded.qty`
  )
    .bind(code, size || '', loc, counted)
    .run();
  if (loc === 'FLOOR') {
    await applyCatalogDelta(env, code, size, delta);
  }
  return { before, counted, delta };
}

export async function inventorySnapshot(env, { q = '', limit = 80 } = {}) {
  const needle = String(q || '').trim();
  let sql = `
    SELECT p.code, p.size, p.description, p.pack, p.qty AS available,
           p.tommur_code, p.lesso_code
    FROM products p
  `;
  const binds = [];
  if (needle) {
    sql += ` WHERE p.code LIKE ? OR p.description LIKE ? OR p.tommur_code LIKE ? OR p.lesso_code LIKE ? OR p.size LIKE ?`;
    const like = `%${needle}%`;
    binds.push(like, like, like, like, like);
  }
  sql += ` ORDER BY p.code, p.size LIMIT ?`;
  binds.push(limit);
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  const rows = [];
  for (const p of results || []) {
    const atp = await atpForSku(env, p.code, p.size);
    rows.push({
      ...p,
      ...atp,
    });
  }
  return rows;
}

export { nowIso };
