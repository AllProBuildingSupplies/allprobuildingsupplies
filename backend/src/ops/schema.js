/**
 * All Pro OS — relational schema (TEST). First-class documents, not JSON blobs.
 */

const LOCATIONS = [
  { id: 'RECEIVING', name: 'Receiving dock', type: 'receiving', sort_order: 10 },
  { id: 'FLOOR', name: 'Warehouse floor', type: 'storage', sort_order: 20 },
  { id: 'STAGING', name: 'Outbound staging', type: 'staging', sort_order: 30 },
  { id: 'WILLCALL', name: 'Will-call counter', type: 'willcall', sort_order: 40 },
];

export async function ensureOpsSchema(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ops_sequences (
      name TEXT PRIMARY KEY,
      next_val INTEGER NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS workflow_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      from_status TEXT DEFAULT '',
      to_status TEXT DEFAULT '',
      action TEXT NOT NULL,
      actor TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_wf_entity ON workflow_events(entity_type, entity_id, id)`
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_wf_created ON workflow_events(created_at)`
  ).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS ops_staff (
      email TEXT PRIMARY KEY,
      role TEXT NOT NULL DEFAULT 'owner',
      display_name TEXT DEFAULT '',
      updated_at TEXT
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS warehouse_locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0
    )
  `).run();
  for (const loc of LOCATIONS) {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO warehouse_locations (id, name, type, sort_order) VALUES (?, ?, ?, ?)`
    )
      .bind(loc.id, loc.name, loc.type, loc.sort_order)
      .run();
  }

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS inventory_balances (
      code TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      location_id TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (code, size, location_id)
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS allocations (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      order_item_id INTEGER,
      code TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      qty INTEGER NOT NULL,
      kind TEXT NOT NULL DEFAULT 'hard',
      location_id TEXT DEFAULT 'FLOOR',
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_alloc_order ON allocations(order_id, status)`
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_alloc_sku ON allocations(code, size, status)`
  ).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS waves (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'open',
      note TEXT DEFAULT '',
      created_by TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      completed_at TEXT DEFAULT ''
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS warehouse_tasks (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      wave_id TEXT DEFAULT '',
      order_id TEXT DEFAULT '',
      shipment_id TEXT DEFAULT '',
      inbound_id TEXT DEFAULT '',
      po_id TEXT DEFAULT '',
      code TEXT DEFAULT '',
      size TEXT DEFAULT '',
      qty_expected INTEGER NOT NULL DEFAULT 0,
      qty_done INTEGER NOT NULL DEFAULT 0,
      from_location TEXT DEFAULT '',
      to_location TEXT DEFAULT '',
      assignee TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_tasks_status ON warehouse_tasks(status, type)`
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_tasks_order ON warehouse_tasks(order_id)`
  ).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS outbound_shipments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'packed',
      method TEXT DEFAULT 'delivery',
      packed_at TEXT DEFAULT '',
      staged_at TEXT DEFAULT '',
      loaded_at TEXT DEFAULT '',
      delivered_at TEXT DEFAULT '',
      load_id TEXT DEFAULT '',
      invoice_doc_id TEXT DEFAULT '',
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_ob_order ON outbound_shipments(order_id)`
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_ob_status ON outbound_shipments(status)`
  ).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS shipment_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shipment_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      code TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      qty INTEGER NOT NULL,
      unit_price REAL DEFAULT 0,
      description TEXT DEFAULT ''
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_ship_lines ON shipment_lines(shipment_id)`
  ).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS loads (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'planned',
      truck TEXT DEFAULT '',
      driver TEXT DEFAULT '',
      run_date TEXT DEFAULT '',
      note TEXT DEFAULT '',
      departed_at TEXT DEFAULT '',
      completed_at TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_loads_date ON loads(run_date, status)`
  ).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS load_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      load_id TEXT NOT NULL,
      seq INTEGER NOT NULL,
      shipment_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      stop_type TEXT NOT NULL DEFAULT 'delivery',
      address TEXT DEFAULT '',
      customer_name TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'pending',
      pod_id TEXT DEFAULT '',
      note TEXT DEFAULT ''
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_stops_load ON load_stops(load_id, seq)`
  ).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_stops_ship ON load_stops(shipment_id)`
  ).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS proofs_of_delivery (
      id TEXT PRIMARY KEY,
      shipment_id TEXT NOT NULL,
      load_id TEXT DEFAULT '',
      stop_id INTEGER,
      signer_name TEXT DEFAULT '',
      signature_data TEXT DEFAULT '',
      outcome TEXT NOT NULL DEFAULT 'delivered',
      note TEXT DEFAULT '',
      captured_at TEXT NOT NULL,
      captured_by TEXT DEFAULT ''
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS vendor_pos (
      id TEXT PRIMARY KEY,
      vendor TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      freight REAL DEFAULT 0,
      duty REAL DEFAULT 0,
      landed_cost REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      ordered_at TEXT DEFAULT '',
      eta TEXT DEFAULT '',
      created_at TEXT NOT NULL
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS po_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_id TEXT NOT NULL,
      code TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      qty_ordered INTEGER NOT NULL DEFAULT 0,
      qty_received INTEGER NOT NULL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      description TEXT DEFAULT ''
    )
  `).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_po_lines ON po_lines(po_id)`).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS inbound_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inbound_id TEXT NOT NULL,
      code TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      qty_expected INTEGER NOT NULL DEFAULT 0,
      qty_received INTEGER NOT NULL DEFAULT 0,
      tommur_code TEXT DEFAULT '',
      description TEXT DEFAULT ''
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_ib_lines ON inbound_lines(inbound_id)`
  ).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      inbound_id TEXT DEFAULT '',
      po_id TEXT DEFAULT '',
      received_at TEXT NOT NULL,
      received_by TEXT DEFAULT '',
      note TEXT DEFAULT ''
    )
  `).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS receipt_lines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id TEXT NOT NULL,
      code TEXT NOT NULL,
      size TEXT NOT NULL DEFAULT '',
      qty INTEGER NOT NULL,
      location_id TEXT NOT NULL DEFAULT 'RECEIVING'
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_receipt_lines ON receipt_lines(receipt_id)`
  ).run();

  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      entity_type TEXT DEFAULT '',
      entity_id TEXT DEFAULT '',
      summary TEXT NOT NULL,
      detail TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      resolved_at TEXT DEFAULT '',
      resolved_by TEXT DEFAULT ''
    )
  `).run();
  await env.DB.prepare(
    `CREATE INDEX IF NOT EXISTS idx_exc_open ON exceptions(status, kind)`
  ).run();

  const orderCols = [
    `fulfillment_status TEXT DEFAULT ''`,
    `hold_reason TEXT DEFAULT ''`,
    `promised_at TEXT DEFAULT ''`,
    `credit_hold INTEGER DEFAULT 0`,
  ];
  for (const col of orderCols) {
    try {
      await env.DB.prepare(`ALTER TABLE orders ADD COLUMN ${col}`).run();
    } catch (_) {}
  }

  const itemCols = [
    `qty_allocated INTEGER DEFAULT 0`,
    `qty_picked INTEGER DEFAULT 0`,
    `qty_packed INTEGER DEFAULT 0`,
  ];
  for (const col of itemCols) {
    try {
      await env.DB.prepare(`ALTER TABLE order_items ADD COLUMN ${col}`).run();
    } catch (_) {}
  }

  const userCols = [`credit_limit REAL DEFAULT 0`, `credit_hold INTEGER DEFAULT 0`];
  for (const col of userCols) {
    try {
      await env.DB.prepare(`ALTER TABLE users ADD COLUMN ${col}`).run();
    } catch (_) {}
  }

  const inboundCols = [
    `po_id TEXT DEFAULT ''`,
    `appointment_at TEXT DEFAULT ''`,
  ];
  for (const col of inboundCols) {
    try {
      await env.DB.prepare(`ALTER TABLE inbound_shipments ADD COLUMN ${col}`).run();
    } catch (_) {}
  }

  await seedFloorBalances(env);
  await backfillInboundLines(env);
  await backfillOutboundFromJson(env);
}

async function seedFloorBalances(env) {
  const { results } = await env.DB.prepare(
    `SELECT code, size, qty FROM products`
  ).all();
  for (const p of results || []) {
    const qty = parseInt(p.qty, 10) || 0;
    const existing = await env.DB.prepare(
      `SELECT qty FROM inventory_balances WHERE code = ? AND size = ? AND location_id = 'FLOOR'`
    )
      .bind(p.code, p.size || '')
      .first();
    if (existing) continue;
    if (qty <= 0) continue;
    await env.DB.prepare(
      `INSERT INTO inventory_balances (code, size, location_id, qty) VALUES (?, ?, 'FLOOR', ?)`
    )
      .bind(p.code, p.size || '', qty)
      .run();
  }
}

function parseJsonArray(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

async function backfillInboundLines(env) {
  const { results } = await env.DB.prepare(`SELECT id, items_json FROM inbound_shipments`).all();
  for (const row of results || []) {
    const count = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM inbound_lines WHERE inbound_id = ?`
    )
      .bind(row.id)
      .first();
    if (count && count.n > 0) continue;
    const items = parseJsonArray(row.items_json);
    for (const it of items) {
      const code = String(it.code || it.sku || '').trim();
      const size = String(it.size || '').trim();
      const qty = parseInt(it.qty ?? it.quantity, 10) || 0;
      if (!code || qty < 1) continue;
      const received = String(row.status || '') === 'received' ? qty : 0;
      await env.DB.prepare(
        `INSERT INTO inbound_lines (inbound_id, code, size, qty_expected, qty_received, tommur_code, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          row.id,
          code,
          size,
          qty,
          received,
          String(it.tommur_code || it.tommur || ''),
          String(it.description || '')
        )
        .run();
    }
  }
}

async function backfillOutboundFromJson(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, status, delivery_method, shipments_json, created_at FROM orders`
  ).all();
  for (const o of results || []) {
    const existing = await env.DB.prepare(
      `SELECT id FROM outbound_shipments WHERE order_id = ? LIMIT 1`
    )
      .bind(o.id)
      .first();
    if (existing) continue;
    const shipments = parseJsonArray(o.shipments_json);
    if (!shipments.length) continue;
    let n = 0;
    for (const s of shipments) {
      n += 1;
      const shipId = String(s.id || '').startsWith('OB-')
        ? String(s.id)
        : `OB-${String(o.id).replace(/^APBS-/i, '')}-${n}`;
      const shippedAt = s.shippedAt || o.created_at || new Date().toISOString();
      const delivered = String(o.status || '').toLowerCase() === 'delivered';
      await env.DB.prepare(
        `INSERT OR IGNORE INTO outbound_shipments
         (id, order_id, status, method, packed_at, delivered_at, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          shipId,
          o.id,
          delivered ? 'delivered' : 'packed',
          o.delivery_method || 'delivery',
          shippedAt,
          delivered ? shippedAt : '',
          String(s.note || ''),
          shippedAt
        )
        .run();
      for (const it of s.items || []) {
        const qty = parseInt(it.qty, 10) || 0;
        if (qty < 1) continue;
        await env.DB.prepare(
          `INSERT INTO shipment_lines (shipment_id, order_id, code, size, qty, unit_price, description)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            shipId,
            o.id,
            String(it.code || ''),
            String(it.size || ''),
            qty,
            Number(it.unitPrice) || 0,
            String(it.description || '')
          )
          .run();
      }
    }
  }
}
