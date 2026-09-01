/**
 * All Pro OS — document mutations (OMS / WMS / TMS / purchasing / finance).
 */

import {
  actorFromAuth,
  intQty,
  logEvent,
  nextPrefixedId,
  normalizeFulfillment,
  nowIso,
  openException,
  setOrderFulfillment,
  timeline,
} from './core.js';
import {
  atpForPairs,
  atpForSku,
  cycleCount,
  getBalance,
  inventorySnapshot,
  listLocations,
  moveBalance,
  onPhysicalReceive,
} from './inventory.js';

function parseCustomer(row) {
  try {
    return row.customer_snapshot ? JSON.parse(row.customer_snapshot) : {};
  } catch (_) {
    return {};
  }
}

export async function hydrateOrder(env, orderId) {
  const o = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderId).first();
  if (!o) return null;
  const [itemRes, allocRes, shipRes, taskRes, stopRes, events] = await Promise.all([
    env.DB.prepare(
      `SELECT i.*, p.description, p.pack, p.qty AS catalog_qty, p.price AS catalog_price
       FROM order_items i
       LEFT JOIN products p ON p.code = i.product_sku AND p.size = i.size
       WHERE i.order_id = ?`
    )
      .bind(orderId)
      .all(),
    env.DB.prepare(`SELECT * FROM allocations WHERE order_id = ? ORDER BY created_at`)
      .bind(orderId)
      .all(),
    env.DB.prepare(`SELECT * FROM outbound_shipments WHERE order_id = ? ORDER BY created_at`)
      .bind(orderId)
      .all(),
    env.DB.prepare(`SELECT * FROM warehouse_tasks WHERE order_id = ? ORDER BY created_at`)
      .bind(orderId)
      .all(),
    env.DB.prepare(
      `SELECT st.*, l.run_date, l.truck, l.driver, l.status AS load_status
       FROM load_stops st
       JOIN loads l ON l.id = st.load_id
       WHERE st.order_id = ?
       ORDER BY st.id`
    )
      .bind(orderId)
      .all(),
    timeline(env, 'order', orderId, 60),
  ]);
  const items = itemRes.results;
  const allocs = allocRes.results;
  const ships = shipRes.results;
  const tasks = taskRes.results;
  const stops = stopRes.results;
  const shipIds = (ships || []).map((s) => s.id);
  let lines = [];
  if (shipIds.length) {
    const placeholders = shipIds.map(() => '?').join(',');
    const { results } = await env.DB.prepare(
      `SELECT * FROM shipment_lines WHERE shipment_id IN (${placeholders})`
    )
      .bind(...shipIds)
      .all();
    lines = results || [];
  }
  const customer = parseCustomer(o);
  const fulfillment = normalizeFulfillment(o);

  const mappedItems = (items || []).map((it) => {
    const qty = intQty(it.quantity);
    const shipped = intQty(it.qty_shipped);
    const allocated = intQty(it.qty_allocated);
    const picked = intQty(it.qty_picked);
    const packed = intQty(it.qty_packed);
    return {
      id: it.id,
      code: it.product_sku,
      size: it.size || '',
      description: it.description || '',
      qty,
      qtyAllocated: allocated,
      qtyPicked: picked,
      qtyPacked: packed,
      qtyShipped: shipped,
      qtyRemaining: Math.max(0, qty - shipped),
      unitPrice: Number(it.price_at_purchase) || 0,
      lineTotal: qty * (Number(it.price_at_purchase) || 0),
      pack: it.pack,
      catalogQty: intQty(it.catalog_qty),
    };
  });

  const atpMap = await atpForPairs(
    env,
    mappedItems.map((it) => ({ code: it.code, size: it.size }))
  );
  for (const it of mappedItems) {
    it.atp = atpMap[`${it.code}\x1e${it.size}`] || (await atpForSku(env, it.code, it.size));
  }

  const nextActions = nextOrderActions(fulfillment, o, mappedItems);

  return {
    id: o.id,
    status: o.status,
    fulfillment,
    holdReason: o.hold_reason || '',
    creditHold: intQty(o.credit_hold),
    promisedAt: o.promised_at || '',
    total: o.total_amount,
    delivery: { method: o.delivery_method || 'delivery', address: o.delivery_address || '' },
    po: o.po || '',
    notes: o.notes || '',
    customer,
    paymentStatus: o.payment_status || 'unpaid',
    paidAt: o.paid_at || null,
    paymentMethod: o.payment_method || '',
    paymentNote: o.payment_note || '',
    placedAt: o.created_at,
    items: mappedItems,
    allocations: allocs || [],
    shipments: (ships || []).map((s) => ({
      ...s,
      lines: lines.filter((ln) => ln.shipment_id === s.id),
    })),
    tasks: tasks || [],
    stops: stops || [],
    timeline: events,
    nextActions,
  };
}

function nextOrderActions(fulfillment, order, items) {
  const actions = [];
  const remaining = items.reduce((s, it) => s + it.qtyRemaining, 0);
  const unalloc = items.reduce((s, it) => s + Math.max(0, it.qtyRemaining - it.qtyAllocated), 0);
  const unpicked = items.reduce((s, it) => s + Math.max(0, it.qtyAllocated - it.qtyPicked), 0);
  const unpacked = items.reduce((s, it) => s + Math.max(0, it.qtyPicked - it.qtyPacked), 0);
  if (intQty(order.credit_hold) || fulfillment === 'on_hold') {
    actions.push({ id: 'release-hold', label: 'Release hold' });
    return actions;
  }
  if (fulfillment === 'pending') {
    actions.push({ id: 'confirm', label: 'Confirm & allocate' });
    actions.push({ id: 'hold', label: 'Credit / ops hold' });
  }
  if (['confirmed', 'released', 'picking', 'packed', 'staged'].includes(fulfillment)) {
    if (unalloc > 0) actions.push({ id: 'allocate', label: 'Allocate remaining' });
    if (unpicked > 0) actions.push({ id: 'pick', label: 'Create pick tasks' });
    if (unpacked > 0 || (unpicked === 0 && remaining > 0 && items.some((i) => i.qtyAllocated > i.qtyPacked))) {
      actions.push({ id: 'pack', label: 'Pack shipment' });
    }
  }
  if (remaining < 1 && fulfillment !== 'cancelled') {
    actions.push({ id: 'invoice', label: 'Issue invoice' });
  }
  return actions;
}

export async function syncOrderIntoOps(env, orderId, actor = 'system') {
  const o = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderId).first();
  if (!o) return;
  const { results: items } = await env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id = ?`
  )
    .bind(orderId)
    .all();
  if (!o.fulfillment_status) {
    const f = normalizeFulfillment(o);
    await env.DB.prepare(`UPDATE orders SET fulfillment_status = ? WHERE id = ?`).bind(f, orderId).run();
  }
  const existingAlloc = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM allocations WHERE order_id = ?`
  )
    .bind(orderId)
    .first();
  if (!existingAlloc || existingAlloc.n === 0) {
    for (const it of items || []) {
      const qty = intQty(it.quantity);
      const shipped = intQty(it.qty_shipped);
      const remaining = Math.max(0, qty - shipped);
      if (remaining < 1) continue;
      const available = intQty(
        (await env.DB.prepare(`SELECT qty FROM products WHERE code = ? AND size = ?`)
          .bind(it.product_sku, it.size || '')
          .first() || {}).qty
      );
      // Stock already deducted at capture; remaining on the line is the reservation.
      const hard = remaining;
      const allocId = await nextPrefixedId(env, 'alloc', 'ALLOC-');
      await env.DB.prepare(
        `INSERT INTO allocations (id, order_id, order_item_id, code, size, qty, kind, location_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'hard', 'FLOOR', 'open', ?)`
      )
        .bind(allocId, orderId, it.id, it.product_sku, it.size || '', hard, nowIso())
        .run();
      await env.DB.prepare(
        `UPDATE order_items SET qty_allocated = ? WHERE id = ?`
      )
        .bind(hard, it.id)
        .run();
      if (available <= 0 && remaining > 0) {
        const boId = await nextPrefixedId(env, 'alloc', 'ALLOC-');
        await env.DB.prepare(
          `INSERT INTO allocations (id, order_id, order_item_id, code, size, qty, kind, location_id, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 'backorder', 'FLOOR', 'open', ?)`
        )
          .bind(boId, orderId, it.id, it.product_sku, it.size || '', remaining, nowIso())
          .run();
      }
    }
    await logEvent(env, {
      entityType: 'order',
      entityId: orderId,
      action: 'synced',
      actor,
      note: 'Ops documents created from order',
      toStatus: normalizeFulfillment(o),
    });
  }
}

export async function confirmOrder(env, orderId, auth, { promisedAt } = {}) {
  const o = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderId).first();
  if (!o) return { error: 'Order not found', status: 404 };
  const userEmail = String(o.user_id || '').toLowerCase();
  const user = userEmail
    ? await env.DB.prepare(`SELECT * FROM users WHERE LOWER(email) = ?`).bind(userEmail).first()
    : null;
  if (user && intQty(user.credit_hold)) {
    await env.DB.prepare(`UPDATE orders SET credit_hold = 1, hold_reason = ?, fulfillment_status = 'on_hold' WHERE id = ?`)
      .bind('Customer credit hold', orderId)
      .run();
    await openException(env, {
      kind: 'credit_hold',
      entityType: 'order',
      entityId: orderId,
      summary: `${orderId} blocked — customer credit hold`,
      detail: userEmail,
    });
    return { error: 'Customer is on credit hold', status: 409, fulfillment: 'on_hold' };
  }
  await syncOrderIntoOps(env, orderId, actorFromAuth(auth));
  if (promisedAt) {
    await env.DB.prepare(`UPDATE orders SET promised_at = ? WHERE id = ?`).bind(promisedAt, orderId).run();
  }
  await setOrderFulfillment(env, orderId, 'confirmed', {
    actor: actorFromAuth(auth),
    action: 'confirm',
    legacyStatus: 'confirmed',
  });
  return { ok: true, order: await hydrateOrder(env, orderId) };
}

export async function holdOrder(env, orderId, auth, { reason } = {}) {
  await env.DB.prepare(
    `UPDATE orders SET credit_hold = 1, hold_reason = ?, fulfillment_status = 'on_hold' WHERE id = ?`
  )
    .bind(reason || 'Held', orderId)
    .run();
  await logEvent(env, {
    entityType: 'order',
    entityId: orderId,
    action: 'hold',
    toStatus: 'on_hold',
    actor: actorFromAuth(auth),
    note: reason || '',
  });
  await openException(env, {
    kind: 'hold',
    entityType: 'order',
    entityId: orderId,
    summary: `${orderId} on hold`,
    detail: reason || '',
  });
  return { ok: true, order: await hydrateOrder(env, orderId) };
}

export async function releaseHold(env, orderId, auth) {
  await env.DB.prepare(
    `UPDATE orders SET credit_hold = 0, hold_reason = '', fulfillment_status = 'confirmed', status = 'confirmed' WHERE id = ?`
  )
    .bind(orderId)
    .run();
  await logEvent(env, {
    entityType: 'order',
    entityId: orderId,
    action: 'release-hold',
    fromStatus: 'on_hold',
    toStatus: 'confirmed',
    actor: actorFromAuth(auth),
  });
  return { ok: true, order: await hydrateOrder(env, orderId) };
}

export async function allocateOrder(env, orderId, auth) {
  await syncOrderIntoOps(env, orderId, actorFromAuth(auth));
  const { results: items } = await env.DB.prepare(
    `SELECT * FROM order_items WHERE order_id = ?`
  )
    .bind(orderId)
    .all();
  for (const it of items || []) {
    const remaining = Math.max(0, intQty(it.quantity) - intQty(it.qty_shipped));
    await env.DB.prepare(`UPDATE order_items SET qty_allocated = ? WHERE id = ?`)
      .bind(remaining, it.id)
      .run();
  }
  await setOrderFulfillment(env, orderId, 'confirmed', {
    actor: actorFromAuth(auth),
    action: 'allocate',
    legacyStatus: String((await env.DB.prepare(`SELECT status FROM orders WHERE id = ?`).bind(orderId).first() || {}).status || 'confirmed') === 'pending' ? 'confirmed' : undefined,
  });
  return { ok: true, order: await hydrateOrder(env, orderId) };
}

export async function createWaveFromOrders(env, orderIds, auth, note) {
  const ids = (orderIds || []).map((x) => String(x).trim()).filter(Boolean);
  if (!ids.length) return { error: 'Select at least one order', status: 400 };
  const waveId = await nextPrefixedId(env, 'wave', 'WAVE-');
  const actor = actorFromAuth(auth);
  await env.DB.prepare(
    `INSERT INTO waves (id, status, note, created_by, created_at) VALUES (?, 'open', ?, ?, ?)`
  )
    .bind(waveId, note || '', actor, nowIso())
    .run();

  let taskCount = 0;
  for (const orderId of ids) {
    await syncOrderIntoOps(env, orderId, actor);
    const { results: items } = await env.DB.prepare(
      `SELECT * FROM order_items WHERE order_id = ?`
    )
      .bind(orderId)
      .all();
    for (const it of items || []) {
      const toPick = Math.max(0, intQty(it.qty_allocated || it.quantity) - intQty(it.qty_picked) - intQty(it.qty_shipped));
      if (toPick < 1) continue;
      const taskId = await nextPrefixedId(env, 'task', 'TASK-');
      await env.DB.prepare(
        `INSERT INTO warehouse_tasks
         (id, type, status, wave_id, order_id, code, size, qty_expected, qty_done, from_location, to_location, created_at, updated_at)
         VALUES (?, 'pick', 'pending', ?, ?, ?, ?, ?, 0, 'FLOOR', 'STAGING', ?, ?)`
      )
        .bind(taskId, waveId, orderId, it.product_sku, it.size || '', toPick, nowIso(), nowIso())
        .run();
      taskCount += 1;
    }
    await setOrderFulfillment(env, orderId, 'released', {
      actor,
      action: 'wave',
      note: waveId,
    });
  }
  await logEvent(env, {
    entityType: 'wave',
    entityId: waveId,
    action: 'create',
    toStatus: 'open',
    actor,
    note: `${taskCount} pick tasks`,
  });
  return { ok: true, waveId, taskCount, wave: await hydrateWave(env, waveId) };
}

export async function hydrateWave(env, waveId) {
  const wave = await env.DB.prepare(`SELECT * FROM waves WHERE id = ?`).bind(waveId).first();
  if (!wave) return null;
  const { results: tasks } = await env.DB.prepare(
    `SELECT t.*, p.description FROM warehouse_tasks t
     LEFT JOIN products p ON p.code = t.code AND p.size = t.size
     WHERE t.wave_id = ? ORDER BY t.code, t.size`
  )
    .bind(waveId)
    .all();
  return { ...wave, tasks: tasks || [] };
}

export async function completeTask(env, taskId, auth, { qty, note, short } = {}) {
  const task = await env.DB.prepare(`SELECT * FROM warehouse_tasks WHERE id = ?`).bind(taskId).first();
  if (!task) return { error: 'Task not found', status: 404 };
  const actor = actorFromAuth(auth);
  const done = Math.max(0, intQty(qty != null ? qty : task.qty_expected - task.qty_done));
  const newDone = intQty(task.qty_done) + done;
  const expected = intQty(task.qty_expected);
  let status = newDone >= expected ? 'done' : 'in_progress';
  if (short) status = 'short';

  if (task.type === 'pick' && done > 0) {
    await moveBalance(env, task.code, task.size, task.from_location || 'FLOOR', task.to_location || 'STAGING', done);
    if (task.order_id) {
      await env.DB.prepare(
        `UPDATE order_items SET qty_picked = COALESCE(qty_picked, 0) + ?
         WHERE order_id = ? AND product_sku = ? AND size = ?`
      )
        .bind(done, task.order_id, task.code, task.size || '')
        .run();
      await setOrderFulfillment(env, task.order_id, 'picking', { actor, action: 'pick' });
    }
  }
  if (task.type === 'putaway' && done > 0) {
    await moveBalance(env, task.code, task.size, task.from_location || 'RECEIVING', task.to_location || 'FLOOR', done);
  }
  if (task.type === 'count' && qty != null) {
    await cycleCount(env, { code: task.code, size: task.size, locationId: task.from_location || 'FLOOR', countedQty: qty });
    status = 'done';
  }

  await env.DB.prepare(
    `UPDATE warehouse_tasks SET qty_done = ?, status = ?, note = ?, assignee = ?, updated_at = ? WHERE id = ?`
  )
    .bind(status === 'done' || status === 'short' ? Math.min(newDone, expected) : newDone, status, note || task.note || '', actor, nowIso(), taskId)
    .run();

  if (status === 'short') {
    await openException(env, {
      kind: 'short_pick',
      entityType: 'task',
      entityId: taskId,
      summary: `Short pick ${task.code} ${task.size} on ${task.order_id || task.wave_id}`,
      detail: `expected ${expected}, got ${newDone}`,
    });
  }

  await logEvent(env, {
    entityType: 'task',
    entityId: taskId,
    action: short ? 'short' : 'complete',
    toStatus: status,
    actor,
    note: note || '',
  });

  if (task.wave_id) {
    const open = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM warehouse_tasks WHERE wave_id = ? AND status IN ('pending', 'in_progress')`
    )
      .bind(task.wave_id)
      .first();
    if (open && open.n === 0) {
      await env.DB.prepare(`UPDATE waves SET status = 'complete', completed_at = ? WHERE id = ?`)
        .bind(nowIso(), task.wave_id)
        .run();
    }
  }

  const updated = await env.DB.prepare(`SELECT * FROM warehouse_tasks WHERE id = ?`).bind(taskId).first();
  return { ok: true, task: updated };
}

export async function packOrder(env, orderId, auth, { lines, note, method } = {}) {
  const o = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(orderId).first();
  if (!o) return { error: 'Order not found', status: 404 };
  const { results: items } = await env.DB.prepare(
    `SELECT i.*, p.description FROM order_items i
     LEFT JOIN products p ON p.code = i.product_sku AND p.size = i.size
     WHERE i.order_id = ?`
  )
    .bind(orderId)
    .all();
  const packLines = [];
  if (Array.isArray(lines) && lines.length) {
    for (const ln of lines) {
      const qty = intQty(ln.qty);
      if (qty < 1) continue;
      const match = (items || []).find(
        (it) => String(it.product_sku) === String(ln.code) && String(it.size || '') === String(ln.size || '')
      );
      if (!match) continue;
      packLines.push({
        code: match.product_sku,
        size: match.size || '',
        qty,
        unitPrice: Number(match.price_at_purchase) || 0,
        description: match.description || '',
        itemId: match.id,
      });
    }
  } else {
    for (const it of items || []) {
      const picked = intQty(it.qty_picked);
      const packed = intQty(it.qty_packed);
      const shipped = intQty(it.qty_shipped);
      const alloc = intQty(it.qty_allocated) || intQty(it.quantity);
      let qty = picked - packed;
      if (qty < 1) qty = Math.max(0, alloc - packed - shipped);
      if (qty < 1) continue;
      packLines.push({
        code: it.product_sku,
        size: it.size || '',
        qty,
        unitPrice: Number(it.price_at_purchase) || 0,
        description: it.description || '',
        itemId: it.id,
      });
    }
  }
  if (!packLines.length) return { error: 'Nothing to pack', status: 400 };

  const shipId = await nextPrefixedId(env, 'ob', 'OB-');
  const actor = actorFromAuth(auth);
  const methodUse = method || o.delivery_method || 'delivery';
  await env.DB.prepare(
    `INSERT INTO outbound_shipments
     (id, order_id, status, method, packed_at, note, created_at)
     VALUES (?, ?, 'packed', ?, ?, ?, ?)`
  )
    .bind(shipId, orderId, methodUse, nowIso(), note || '', nowIso())
    .run();

  let subtotal = 0;
  const jsonItems = [];
  for (const ln of packLines) {
    await env.DB.prepare(
      `INSERT INTO shipment_lines (shipment_id, order_id, code, size, qty, unit_price, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(shipId, orderId, ln.code, ln.size, ln.qty, ln.unitPrice, ln.description)
      .run();
    await env.DB.prepare(
      `UPDATE order_items
       SET qty_packed = COALESCE(qty_packed, 0) + ?,
           qty_shipped = COALESCE(qty_shipped, 0) + ?
       WHERE id = ?`
    )
      .bind(ln.qty, ln.qty, ln.itemId)
      .run();
    subtotal += ln.qty * ln.unitPrice;
    jsonItems.push({
      code: ln.code,
      size: ln.size,
      description: ln.description,
      qty: ln.qty,
      unitPrice: ln.unitPrice,
      lineTotal: ln.qty * ln.unitPrice,
    });
  }

  // Dual-write shipments_json so legacy admin still shows the shipment.
  const prev = o.shipments_json ? (() => { try { return JSON.parse(o.shipments_json); } catch { return []; } })() : [];
  const list = Array.isArray(prev) ? prev : [];
  list.push({
    id: shipId,
    shippedAt: nowIso(),
    note: note || '',
    items: jsonItems,
    subtotal,
  });
  await env.DB.prepare(`UPDATE orders SET shipments_json = ? WHERE id = ?`)
    .bind(JSON.stringify(list), orderId)
    .run();

  const destLoc = methodUse === 'pickup' || methodUse === 'willcall' ? 'WILLCALL' : 'STAGING';
  for (const ln of packLines) {
    const staging = await getBalance(env, ln.code, ln.size, 'STAGING');
    if (staging > 0) {
      await moveBalance(env, ln.code, ln.size, 'STAGING', destLoc, Math.min(staging, ln.qty));
    }
  }

  // packed ≠ delivered: classic admin stays partially_shipped until POD.
  await setOrderFulfillment(env, orderId, 'packed', {
    actor,
    action: 'pack',
    note: shipId,
    legacyStatus: 'partially_shipped',
  });

  await logEvent(env, {
    entityType: 'shipment',
    entityId: shipId,
    action: 'pack',
    toStatus: 'packed',
    actor,
    note: orderId,
  });

  return { ok: true, shipmentId: shipId, shipment: await hydrateShipment(env, shipId), order: await hydrateOrder(env, orderId) };
}

export async function hydrateShipment(env, shipmentId) {
  const s = await env.DB.prepare(`SELECT * FROM outbound_shipments WHERE id = ?`).bind(shipmentId).first();
  if (!s) return null;
  const { results: lines } = await env.DB.prepare(
    `SELECT * FROM shipment_lines WHERE shipment_id = ?`
  )
    .bind(shipmentId)
    .all();
  const stop = await env.DB.prepare(`SELECT * FROM load_stops WHERE shipment_id = ?`).bind(shipmentId).first();
  const events = await timeline(env, 'shipment', shipmentId, 40);
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(s.order_id).first();
  return {
    ...s,
    lines: lines || [],
    stop: stop || null,
    customer: order ? parseCustomer(order) : {},
    deliveryAddress: order ? order.delivery_address : '',
    timeline: events,
  };
}

export async function stageShipment(env, shipmentId, auth) {
  const s = await env.DB.prepare(`SELECT * FROM outbound_shipments WHERE id = ?`).bind(shipmentId).first();
  if (!s) return { error: 'Shipment not found', status: 404 };
  await env.DB.prepare(
    `UPDATE outbound_shipments SET status = 'staged', staged_at = ? WHERE id = ?`
  )
    .bind(nowIso(), shipmentId)
    .run();
  await setOrderFulfillment(env, s.order_id, 'staged', {
    actor: actorFromAuth(auth),
    action: 'stage',
    note: shipmentId,
  });
  await logEvent(env, {
    entityType: 'shipment',
    entityId: shipmentId,
    action: 'stage',
    fromStatus: s.status,
    toStatus: 'staged',
    actor: actorFromAuth(auth),
  });
  return { ok: true, shipment: await hydrateShipment(env, shipmentId) };
}

export async function createLoad(env, auth, { truck, driver, runDate, note } = {}) {
  const id = await nextPrefixedId(env, 'load', 'LOAD-');
  const date = runDate || nowIso().slice(0, 10);
  await env.DB.prepare(
    `INSERT INTO loads (id, status, truck, driver, run_date, note, created_at)
     VALUES (?, 'planned', ?, ?, ?, ?, ?)`
  )
    .bind(id, truck || '', driver || '', date, note || '', nowIso())
    .run();
  await logEvent(env, {
    entityType: 'load',
    entityId: id,
    action: 'create',
    toStatus: 'planned',
    actor: actorFromAuth(auth),
  });
  return { ok: true, load: await hydrateLoad(env, id) };
}

export async function hydrateLoad(env, loadId) {
  const load = await env.DB.prepare(`SELECT * FROM loads WHERE id = ?`).bind(loadId).first();
  if (!load) return null;
  const { results: stops } = await env.DB.prepare(
    `SELECT st.*, s.status AS shipment_status, s.method
     FROM load_stops st
     LEFT JOIN outbound_shipments s ON s.id = st.shipment_id
     WHERE st.load_id = ?
     ORDER BY st.seq, st.id`
  )
    .bind(loadId)
    .all();
  return { ...load, stops: stops || [] };
}

export async function listLoads(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM loads ORDER BY run_date DESC, created_at DESC LIMIT 50`
  ).all();
  const loads = results || [];
  if (!loads.length) return [];
  const ids = loads.map((l) => l.id);
  const { results: stops } = await env.DB.prepare(
    `SELECT st.*, s.status AS shipment_status, s.method
     FROM load_stops st
     LEFT JOIN outbound_shipments s ON s.id = st.shipment_id
     WHERE st.load_id IN (${ids.map(() => '?').join(',')})
     ORDER BY st.seq, st.id`
  )
    .bind(...ids)
    .all();
  const by = {};
  for (const st of stops || []) {
    (by[st.load_id] || (by[st.load_id] = [])).push(st);
  }
  return loads.map((l) => ({ ...l, stops: by[l.id] || [] }));
}

export async function addStopToLoad(env, loadId, shipmentId, auth) {
  const load = await env.DB.prepare(`SELECT * FROM loads WHERE id = ?`).bind(loadId).first();
  const ship = await env.DB.prepare(`SELECT * FROM outbound_shipments WHERE id = ?`).bind(shipmentId).first();
  if (!load) return { error: 'Load not found', status: 404 };
  if (!ship) return { error: 'Shipment not found', status: 404 };
  const dup = await env.DB.prepare(`SELECT id FROM load_stops WHERE shipment_id = ?`).bind(shipmentId).first();
  if (dup) return { error: 'Shipment already on a load', status: 409 };
  const max = await env.DB.prepare(`SELECT COALESCE(MAX(seq), 0) AS seq FROM load_stops WHERE load_id = ?`)
    .bind(loadId)
    .first();
  const seq = intQty(max && max.seq) + 1;
  const order = await env.DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(ship.order_id).first();
  const customer = order ? parseCustomer(order) : {};
  const stopType = ship.method === 'pickup' || ship.method === 'willcall' ? 'willcall' : 'delivery';
  await env.DB.prepare(
    `INSERT INTO load_stops (load_id, seq, shipment_id, order_id, stop_type, address, customer_name, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
  )
    .bind(
      loadId,
      seq,
      shipmentId,
      ship.order_id,
      stopType,
      (order && order.delivery_address) || '',
      customer.name || customer.company || '',
    )
    .run();
  await env.DB.prepare(`UPDATE outbound_shipments SET load_id = ?, status = 'loaded', loaded_at = ? WHERE id = ?`)
    .bind(loadId, nowIso(), shipmentId)
    .run();
  await setOrderFulfillment(env, ship.order_id, 'loaded', {
    actor: actorFromAuth(auth),
    action: 'load',
    note: loadId,
  });
  return { ok: true, load: await hydrateLoad(env, loadId) };
}

export async function reorderStops(env, loadId, stopIds) {
  let seq = 1;
  for (const id of stopIds || []) {
    await env.DB.prepare(`UPDATE load_stops SET seq = ? WHERE id = ? AND load_id = ?`)
      .bind(seq, id, loadId)
      .run();
    seq += 1;
  }
  return { ok: true, load: await hydrateLoad(env, loadId) };
}

export async function departLoad(env, loadId, auth) {
  await env.DB.prepare(
    `UPDATE loads SET status = 'departed', departed_at = ? WHERE id = ?`
  )
    .bind(nowIso(), loadId)
    .run();
  const { results: stops } = await env.DB.prepare(`SELECT * FROM load_stops WHERE load_id = ?`).bind(loadId).all();
  for (const st of stops || []) {
    await env.DB.prepare(`UPDATE outbound_shipments SET status = 'out_for_delivery' WHERE id = ?`)
      .bind(st.shipment_id)
      .run();
    await setOrderFulfillment(env, st.order_id, 'out_for_delivery', {
      actor: actorFromAuth(auth),
      action: 'depart',
      note: loadId,
    });
  }
  await logEvent(env, {
    entityType: 'load',
    entityId: loadId,
    action: 'depart',
    toStatus: 'departed',
    actor: actorFromAuth(auth),
  });
  return { ok: true, load: await hydrateLoad(env, loadId) };
}

export async function capturePod(env, stopId, auth, { signerName, signatureData, note, outcome } = {}) {
  const stop = await env.DB.prepare(`SELECT * FROM load_stops WHERE id = ?`).bind(stopId).first();
  if (!stop) return { error: 'Stop not found', status: 404 };
  const actor = actorFromAuth(auth);
  const podId = await nextPrefixedId(env, 'pod', 'POD-');
  const result = outcome || 'delivered';
  const sig = String(signatureData || '').slice(0, 120000);
  await env.DB.prepare(
    `INSERT INTO proofs_of_delivery
     (id, shipment_id, load_id, stop_id, signer_name, signature_data, outcome, note, captured_at, captured_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(podId, stop.shipment_id, stop.load_id, stop.id, signerName || '', sig, result, note || '', nowIso(), actor)
    .run();
  await env.DB.prepare(`UPDATE load_stops SET status = ?, pod_id = ? WHERE id = ?`)
    .bind(result === 'refused' ? 'refused' : 'delivered', podId, stopId)
    .run();

  if (result === 'refused') {
    await openException(env, {
      kind: 'refused',
      entityType: 'shipment',
      entityId: stop.shipment_id,
      summary: `${stop.shipment_id} refused`,
      detail: note || signerName || '',
    });
    await env.DB.prepare(`UPDATE outbound_shipments SET status = 'packed' WHERE id = ?`).bind(stop.shipment_id).run();
  } else {
    await env.DB.prepare(
      `UPDATE outbound_shipments SET status = 'delivered', delivered_at = ? WHERE id = ?`
    )
      .bind(nowIso(), stop.shipment_id)
      .run();
    const { results: ships } = await env.DB.prepare(
      `SELECT status FROM outbound_shipments WHERE order_id = ?`
    )
      .bind(stop.order_id)
      .all();
    const { results: items } = await env.DB.prepare(
      `SELECT quantity, qty_shipped FROM order_items WHERE order_id = ?`
    )
      .bind(stop.order_id)
      .all();
    const allLines = (items || []).every((it) => intQty(it.qty_shipped) >= intQty(it.quantity));
    const allShips = (ships || []).every((s) => s.status === 'delivered');
    if (allLines && allShips) {
      await setOrderFulfillment(env, stop.order_id, 'delivered', {
        actor,
        action: 'pod',
        note: podId,
        legacyStatus: 'delivered',
      });
    }
  }

  const pending = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM load_stops WHERE load_id = ? AND status = 'pending'`
  )
    .bind(stop.load_id)
    .first();
  if (pending && pending.n === 0) {
    await env.DB.prepare(`UPDATE loads SET status = 'complete', completed_at = ? WHERE id = ?`)
      .bind(nowIso(), stop.load_id)
      .run();
  }

  await logEvent(env, {
    entityType: 'shipment',
    entityId: stop.shipment_id,
    action: 'pod',
    toStatus: result,
    actor,
    note: signerName || '',
  });

  return { ok: true, podId, invoiceReady: result === 'delivered', load: await hydrateLoad(env, stop.load_id) };
}

export async function markShipmentInvoiced(env, shipmentId, auth, invoiceDocId) {
  const s = await env.DB.prepare(`SELECT * FROM outbound_shipments WHERE id = ?`).bind(shipmentId).first();
  if (!s) return { error: 'Shipment not found', status: 404 };
  await env.DB.prepare(`UPDATE outbound_shipments SET invoice_doc_id = ? WHERE id = ?`)
    .bind(invoiceDocId || '', shipmentId)
    .run();
  await setOrderFulfillment(env, s.order_id, 'invoiced', {
    actor: actorFromAuth(auth),
    action: 'invoice',
    note: shipmentId,
  });
  return { ok: true, shipment: await hydrateShipment(env, shipmentId) };
}

export async function createPurchaseOrder(env, auth, body) {
  const id = await nextPrefixedId(env, 'po', 'PO-');
  const lines = Array.isArray(body.lines) ? body.lines : [];
  let landed = Number(body.freight || 0) + Number(body.duty || 0);
  await env.DB.prepare(
    `INSERT INTO vendor_pos (id, vendor, status, freight, duty, landed_cost, notes, ordered_at, eta, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      body.vendor || '',
      body.status || 'draft',
      Number(body.freight) || 0,
      Number(body.duty) || 0,
      0,
      body.notes || '',
      body.orderedAt || nowIso(),
      body.eta || '',
      nowIso()
    )
    .run();
  for (const ln of lines) {
    const qty = intQty(ln.qty || ln.qtyOrdered);
    if (!ln.code || qty < 1) continue;
    const cost = Number(ln.unitCost || ln.unit_cost) || 0;
    landed += cost * qty;
    await env.DB.prepare(
      `INSERT INTO po_lines (po_id, code, size, qty_ordered, qty_received, unit_cost, description)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    )
      .bind(id, ln.code, ln.size || '', qty, cost, ln.description || '')
      .run();
  }
  await env.DB.prepare(`UPDATE vendor_pos SET landed_cost = ? WHERE id = ?`).bind(landed, id).run();
  await logEvent(env, {
    entityType: 'po',
    entityId: id,
    action: 'create',
    toStatus: body.status || 'draft',
    actor: actorFromAuth(auth),
  });
  return { ok: true, po: await hydratePo(env, id) };
}

export async function hydratePo(env, poId) {
  const po = await env.DB.prepare(`SELECT * FROM vendor_pos WHERE id = ?`).bind(poId).first();
  if (!po) return null;
  const { results: lines } = await env.DB.prepare(`SELECT * FROM po_lines WHERE po_id = ?`).bind(poId).all();
  const { results: inbound } = await env.DB.prepare(
    `SELECT * FROM inbound_shipments WHERE po_id = ?`
  )
    .bind(poId)
    .all();
  return { ...po, lines: lines || [], inbound: inbound || [] };
}

export async function sendPurchaseOrder(env, poId, auth) {
  await env.DB.prepare(`UPDATE vendor_pos SET status = 'sent' WHERE id = ?`).bind(poId).run();
  await logEvent(env, {
    entityType: 'po',
    entityId: poId,
    action: 'send',
    toStatus: 'sent',
    actor: actorFromAuth(auth),
  });
  return { ok: true, po: await hydratePo(env, poId) };
}

export async function attachInboundToPo(env, poId, inboundId) {
  await env.DB.prepare(`UPDATE inbound_shipments SET po_id = ? WHERE id = ?`).bind(poId, inboundId).run();
  return { ok: true };
}

export async function createInbound(env, auth, body) {
  const id = String(body.id || body.containerNumber || '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase() || (await nextPrefixedId(env, 'ib', 'IB-')).toLowerCase();
  const now = nowIso();
  await env.DB.prepare(
    `INSERT INTO inbound_shipments
     (id, label, container_number, carrier, eta, invoice_ref, invoice_date, status, items_json, notes, received_at, created_at, updated_at, po_id, appointment_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, '', ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       label=excluded.label, container_number=excluded.container_number, carrier=excluded.carrier,
       eta=excluded.eta, notes=excluded.notes, po_id=excluded.po_id, appointment_at=excluded.appointment_at, updated_at=excluded.updated_at`
  )
    .bind(
      id,
      body.label || '',
      body.containerNumber || body.container_number || '',
      body.carrier || '',
      body.eta || '',
      body.invoiceRef || '',
      body.invoiceDate || '',
      body.status || 'in_transit',
      body.notes || '',
      now,
      now,
      body.poId || '',
      body.appointmentAt || ''
    )
    .run();
  if (Array.isArray(body.lines) && body.lines.length) {
    await env.DB.prepare(`DELETE FROM inbound_lines WHERE inbound_id = ?`).bind(id).run();
    const jsonItems = [];
    for (const ln of body.lines) {
      const qty = intQty(ln.qty);
      if (!ln.code || qty < 1) continue;
      await env.DB.prepare(
        `INSERT INTO inbound_lines (inbound_id, code, size, qty_expected, qty_received, tommur_code, description)
         VALUES (?, ?, ?, ?, 0, ?, ?)`
      )
        .bind(id, ln.code, ln.size || '', qty, ln.tommur_code || '', ln.description || '')
        .run();
      jsonItems.push({ code: ln.code, size: ln.size || '', qty });
    }
    await env.DB.prepare(`UPDATE inbound_shipments SET items_json = ? WHERE id = ?`)
      .bind(JSON.stringify(jsonItems), id)
      .run();
  }
  return { ok: true, inbound: await hydrateInbound(env, id) };
}

export async function hydrateInbound(env, id) {
  const row = await env.DB.prepare(`SELECT * FROM inbound_shipments WHERE id = ?`).bind(id).first();
  if (!row) return null;
  const { results: lines } = await env.DB.prepare(`SELECT * FROM inbound_lines WHERE inbound_id = ?`).bind(id).all();
  return { ...row, lines: lines || [] };
}

export async function listInbounds(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM inbound_shipments ORDER BY datetime(COALESCE(updated_at, created_at)) DESC LIMIT 50`
  ).all();
  const rows = results || [];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const { results: lines } = await env.DB.prepare(
    `SELECT * FROM inbound_lines WHERE inbound_id IN (${ids.map(() => '?').join(',')})`
  )
    .bind(...ids)
    .all();
  const by = {};
  for (const ln of lines || []) {
    (by[ln.inbound_id] || (by[ln.inbound_id] = [])).push(ln);
  }
  return rows.map((r) => ({ ...r, lines: by[r.id] || [] }));
}

export async function arriveInbound(env, id, auth) {
  await env.DB.prepare(`UPDATE inbound_shipments SET status = 'arrived', updated_at = ? WHERE id = ?`)
    .bind(nowIso(), id)
    .run();
  await logEvent(env, {
    entityType: 'inbound',
    entityId: id,
    action: 'arrive',
    toStatus: 'arrived',
    actor: actorFromAuth(auth),
  });
  return { ok: true, inbound: await hydrateInbound(env, id) };
}

export async function receiveInbound(env, id, auth, { lines } = {}) {
  const ib = await hydrateInbound(env, id);
  if (!ib) return { error: 'Inbound not found', status: 404 };
  const actor = actorFromAuth(auth);
  const receiptId = await nextPrefixedId(env, 'rcv', 'RCV-');
  await env.DB.prepare(
    `INSERT INTO receipts (id, inbound_id, po_id, received_at, received_by) VALUES (?, ?, ?, ?, ?)`
  )
    .bind(receiptId, id, ib.po_id || '', nowIso(), actor)
    .run();

  const toRecv = Array.isArray(lines) && lines.length ? lines : (ib.lines || []).map((l) => ({
    code: l.code,
    size: l.size,
    qty: Math.max(0, intQty(l.qty_expected) - intQty(l.qty_received)),
    lineId: l.id,
  }));

  for (const ln of toRecv) {
    const qty = intQty(ln.qty);
    if (qty < 1) continue;
    await env.DB.prepare(
      `INSERT INTO receipt_lines (receipt_id, code, size, qty, location_id) VALUES (?, ?, ?, ?, 'RECEIVING')`
    )
      .bind(receiptId, ln.code, ln.size || '', qty)
      .run();
    await onPhysicalReceive(env, ln.code, ln.size || '', qty, 'RECEIVING');
    if (ln.lineId) {
      await env.DB.prepare(
        `UPDATE inbound_lines SET qty_received = COALESCE(qty_received, 0) + ? WHERE id = ?`
      )
        .bind(qty, ln.lineId)
        .run();
    } else {
      await env.DB.prepare(
        `UPDATE inbound_lines SET qty_received = COALESCE(qty_received, 0) + ?
         WHERE inbound_id = ? AND code = ? AND size = ?`
      )
        .bind(qty, id, ln.code, ln.size || '')
        .run();
    }
    if (ib.po_id) {
      await env.DB.prepare(
        `UPDATE po_lines SET qty_received = COALESCE(qty_received, 0) + ?
         WHERE po_id = ? AND code = ? AND size = ?`
      )
        .bind(qty, ib.po_id, ln.code, ln.size || '')
        .run();
    }
    const taskId = await nextPrefixedId(env, 'task', 'TASK-');
    await env.DB.prepare(
      `INSERT INTO warehouse_tasks
       (id, type, status, inbound_id, po_id, code, size, qty_expected, qty_done, from_location, to_location, created_at, updated_at)
       VALUES (?, 'putaway', 'pending', ?, ?, ?, ?, ?, 0, 'RECEIVING', 'FLOOR', ?, ?)`
    )
      .bind(taskId, id, ib.po_id || '', ln.code, ln.size || '', qty, nowIso(), nowIso())
      .run();
  }

  await env.DB.prepare(
    `UPDATE inbound_shipments SET status = 'received', received_at = ?, updated_at = ? WHERE id = ?`
  )
    .bind(nowIso(), nowIso(), id)
    .run();
  if (ib.po_id) {
    const poLines = await env.DB.prepare(`SELECT qty_ordered, qty_received FROM po_lines WHERE po_id = ?`)
      .bind(ib.po_id)
      .all();
    const all = (poLines.results || []).every((l) => intQty(l.qty_received) >= intQty(l.qty_ordered));
    await env.DB.prepare(`UPDATE vendor_pos SET status = ? WHERE id = ?`)
      .bind(all ? 'received' : 'partial', ib.po_id)
      .run();
  }
  await logEvent(env, {
    entityType: 'inbound',
    entityId: id,
    action: 'receive',
    toStatus: 'received',
    actor,
    note: receiptId,
  });
  return { ok: true, receiptId, inbound: await hydrateInbound(env, id) };
}

export async function inbox(env) {
  const [pending, hold, picks, putaway, unpacked, unassigned, ar, exceptions, inbound, workRes] =
    await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM orders WHERE LOWER(COALESCE(fulfillment_status, status, '')) IN ('pending', '')`
      ).first(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM orders WHERE fulfillment_status = 'on_hold' OR credit_hold = 1`
      ).first(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM warehouse_tasks WHERE type = 'pick' AND status IN ('pending', 'in_progress')`
      ).first(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM warehouse_tasks WHERE type = 'putaway' AND status IN ('pending', 'in_progress')`
      ).first(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM outbound_shipments WHERE status = 'packed'`).first(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM outbound_shipments WHERE COALESCE(load_id, '') = '' AND status IN ('packed', 'staged')`
      ).first(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n, COALESCE(SUM(total_amount), 0) AS amt FROM orders
         WHERE LOWER(COALESCE(payment_status, 'unpaid')) IN ('unpaid', 'partial')
           AND LOWER(COALESCE(status, '')) != 'cancelled'`
      ).first(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM exceptions WHERE status = 'open'`).first(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM inbound_shipments WHERE LOWER(status) IN ('in_transit', 'arrived')`
      ).first(),
      env.DB.prepare(
    `SELECT id, status, fulfillment_status, total_amount, customer_snapshot, created_at, po
     FROM orders
     WHERE LOWER(COALESCE(fulfillment_status, status, '')) IN ('pending', 'confirmed', 'released', 'picking', 'packed', 'staged', 'loaded', 'out_for_delivery', 'on_hold')
     ORDER BY datetime(created_at) DESC
     LIMIT 40`
      ).all(),
    ]);
  const work = workRes.results;

  return {
    kpis: {
      pendingConfirm: intQty(pending && pending.n),
      onHold: intQty(hold && hold.n),
      pickTasks: intQty(picks && picks.n),
      putawayTasks: intQty(putaway && putaway.n),
      packedReady: intQty(unpacked && unpacked.n),
      needLoad: intQty(unassigned && unassigned.n),
      arOpen: intQty(ar && ar.n),
      arAmount: Number(ar && ar.amt) || 0,
      exceptions: intQty(exceptions && exceptions.n),
      inboundOpen: intQty(inbound && inbound.n),
    },
    orders: (work || []).map((o) => ({
      id: o.id,
      status: o.status,
      fulfillment: normalizeFulfillment(o),
      total: o.total_amount,
      po: o.po,
      placedAt: o.created_at,
      customer: parseCustomer(o),
    })),
  };
}

export async function searchOps(env, q) {
  const needle = String(q || '').trim();
  if (!needle) return { orders: [], shipments: [], loads: [], pos: [], inbound: [] };
  const like = `%${needle}%`;
  const [orders, shipments, loads, pos, inbound] = await Promise.all([
    env.DB.prepare(
      `SELECT id, status, fulfillment_status, total_amount, po, customer_snapshot FROM orders
       WHERE id LIKE ? OR po LIKE ? OR customer_snapshot LIKE ? LIMIT 15`
    )
      .bind(like, like, like)
      .all(),
    env.DB.prepare(
      `SELECT id, order_id, status FROM outbound_shipments WHERE id LIKE ? OR order_id LIKE ? LIMIT 10`
    )
      .bind(like, like)
      .all(),
    env.DB.prepare(
      `SELECT id, status, truck, run_date FROM loads WHERE id LIKE ? OR truck LIKE ? OR driver LIKE ? LIMIT 10`
    )
      .bind(like, like, like)
      .all(),
    env.DB.prepare(`SELECT id, vendor, status FROM vendor_pos WHERE id LIKE ? OR vendor LIKE ? LIMIT 10`)
      .bind(like, like)
      .all(),
    env.DB.prepare(
      `SELECT id, container_number, status FROM inbound_shipments WHERE id LIKE ? OR container_number LIKE ? LIMIT 10`
    )
      .bind(like, like)
      .all(),
  ]);
  return {
    orders: orders.results || [],
    shipments: shipments.results || [],
    loads: loads.results || [],
    pos: pos.results || [],
    inbound: inbound.results || [],
  };
}

export async function listOrders(env, { status, q, limit } = {}) {
  const lim = Math.min(200, intQty(limit, 80));
  let sql = `SELECT * FROM orders WHERE 1=1`;
  const binds = [];
  if (status && status !== 'all' && status !== 'open') {
    sql += ` AND (fulfillment_status = ? OR status = ?)`;
    binds.push(status, status);
  } else if (status === 'open') {
    sql += ` AND LOWER(COALESCE(status, '')) NOT IN ('delivered', 'cancelled')`;
  }
  if (q) {
    sql += ` AND (id LIKE ? OR po LIKE ? OR customer_snapshot LIKE ?)`;
    const like = `%${q}%`;
    binds.push(like, like, like);
  }
  sql += ` ORDER BY datetime(created_at) DESC LIMIT ?`;
  binds.push(lim);
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return (results || []).map((o) => ({
    id: o.id,
    status: o.status,
    fulfillment: normalizeFulfillment(o),
    total: o.total_amount,
    po: o.po,
    paymentStatus: o.payment_status || 'unpaid',
    placedAt: o.created_at,
    deliveryMethod: o.delivery_method,
    customer: parseCustomer(o),
    holdReason: o.hold_reason || '',
    promisedAt: o.promised_at || '',
  }));
}

export async function financeAr(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM orders
     WHERE LOWER(COALESCE(status, '')) != 'cancelled'
     ORDER BY datetime(created_at) DESC LIMIT 200`
  ).all();
  return (results || []).map((o) => ({
    id: o.id,
    total: o.total_amount,
    paymentStatus: o.payment_status || 'unpaid',
    paymentMethod: o.payment_method || '',
    paidAt: o.paid_at,
    fulfillment: normalizeFulfillment(o),
    status: o.status,
    customer: parseCustomer(o),
    placedAt: o.created_at,
  }));
}

export async function setCustomerCredit(env, email, { creditLimit, creditHold }) {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return { error: 'Email required', status: 400 };
  const user = await env.DB.prepare(`SELECT * FROM users WHERE LOWER(email) = ?`).bind(em).first();
  if (!user) return { error: 'Customer not found', status: 404 };
  if (creditLimit != null) {
    await env.DB.prepare(`UPDATE users SET credit_limit = ? WHERE id = ?`)
      .bind(Number(creditLimit) || 0, user.id)
      .run();
  }
  if (creditHold != null) {
    await env.DB.prepare(`UPDATE users SET credit_hold = ? WHERE id = ?`)
      .bind(creditHold ? 1 : 0, user.id)
      .run();
  }
  return {
    ok: true,
    user: await env.DB.prepare(
      `SELECT id, email, fname, lname, company, status, credit_limit, credit_hold FROM users WHERE id = ?`
    )
      .bind(user.id)
      .first(),
  };
}

export async function enrichOrdersForCustomer(env, formattedOrders) {
  const out = [];
  for (const o of formattedOrders || []) {
    const { results: ships } = await env.DB.prepare(
      `SELECT id, status, method, packed_at, loaded_at, delivered_at, load_id, invoice_doc_id
       FROM outbound_shipments WHERE order_id = ?`
    )
      .bind(o.id)
      .all();
    const { results: stops } = await env.DB.prepare(
      `SELECT st.status AS stop_status, st.stop_type, l.id AS load_id, l.run_date, l.status AS load_status
       FROM load_stops st JOIN loads l ON l.id = st.load_id
       WHERE st.order_id = ?`
    )
      .bind(o.id)
      .all();
    const row = await env.DB.prepare(
      `SELECT fulfillment_status, promised_at, hold_reason FROM orders WHERE id = ?`
    )
      .bind(o.id)
      .first();
    out.push({
      ...o,
      fulfillment: row ? normalizeFulfillment(row) : o.status,
      promisedAt: row && row.promised_at,
      holdReason: row && row.hold_reason,
      outboundShipments: ships || [],
      loads: stops || [],
    });
  }
  return out;
}

export async function listExceptions(env) {
  const { results } = await env.DB.prepare(
    `SELECT * FROM exceptions ORDER BY id DESC LIMIT 80`
  ).all();
  return results || [];
}

export async function resolveException(env, id, auth) {
  await env.DB.prepare(
    `UPDATE exceptions SET status = 'resolved', resolved_at = ?, resolved_by = ? WHERE id = ?`
  )
    .bind(nowIso(), actorFromAuth(auth), id)
    .run();
  return { ok: true };
}

export {
  listLocations,
  inventorySnapshot,
  cycleCount,
  atpForSku,
};
