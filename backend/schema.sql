-- Local development schema for the "allpro-db" D1 database.
-- Production D1 already has these tables; this file lets a local
-- `wrangler dev` instance work end to end. Apply with:
--   npx wrangler d1 execute allpro-db --local --file schema.sql

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
);

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
);

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
  created_at       TEXT
);

CREATE TABLE IF NOT EXISTS order_items (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id          TEXT NOT NULL,
  product_sku       TEXT,
  size              TEXT,
  quantity          INTEGER,
  price_at_purchase REAL
);
