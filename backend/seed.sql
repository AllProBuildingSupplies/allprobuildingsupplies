-- ALL PRO SECURE DATA MIGRATION

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  fname TEXT,
  lname TEXT,
  company TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  password TEXT,
  status TEXT,
  canOrderPieces INTEGER,
  registeredAt TEXT
);

CREATE TABLE products (
  code TEXT,
  description TEXT,
  size TEXT,
  pack INTEGER,
  qty INTEGER,
  price REAL,
  image TEXT,
  main_category TEXT,
  sub_category TEXT,
  PRIMARY KEY (code, size)
);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT,
  total_amount REAL,
  delivery_method TEXT,
  delivery_address TEXT,
  po TEXT,
  notes TEXT,
  customer_snapshot TEXT,
  created_at TEXT
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT,
  product_sku TEXT,
  size TEXT,
  quantity INTEGER,
  price_at_purchase REAL
);

-- Users Data
INSERT OR IGNORE INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES ('1774464646153', 'Baruch', 'Grossman', 'ABC', 'baruchstablet@gmail.com', '7328875657', '8ebe5e444d911b3b0f860ccfbaf0d811d639a8219bedc6bd3268b381c033599a', 'approved', 1, '2026-03-25T18:50:46.153Z');
INSERT OR IGNORE INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES ('1774547143945', 'Tim', 'Papirnik', 'NJPD Plumbing & Heating LLC', 'tim@njpdplumbing.com', '7328909960', 'c1af2b9d2d2b787ea406b14f4f2078465baa6a0a9a7a65ad93a5d83d76cf1087', 'approved', 1, '2026-03-26T17:45:43.946Z');
INSERT OR IGNORE INTO users (id, fname, lname, company, email, phone, password, status, canOrderPieces, registeredAt) VALUES ('1774643872585', 'Peleg', 'Ovadia', 'EZ FullRehab LLC', 'ovadiapelegrealestate@gmail.com', '4102050486', '7d253a9cc147166ad858ad86835a3b49b4a7c5097c8e3041e2d78503021726e5', 'approved', 1, '2026-03-27T20:37:52.585Z');

-- Orders Data
INSERT OR IGNORE INTO orders (id, user_id, status, total_amount, delivery_method, created_at) VALUES ('APB-MN9BWNA2', '1774547143945', 'delivered', 4058.5, 'delivery', '2026-04-17T18:00:00.000Z');
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-1/4HH', '1-1/2', 1000, 0.6);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-1/4HH', '2', 500, 0.9);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-1/8HH', '2', 500, 0.8);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-1/8HH', '4', 90, 4.1);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-1/8HS', '1-1/2', 400, 0.5);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-1/8HS', '4', 90, 3.5);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-SANTEE', '1-1/2', 240, 1);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-SANTEE', '2', 105, 1.4);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-WYEHUB', '2', 250, 1.7);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-WYEHUB', '3', 75, 4.5);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA2', 'PVC-1/8HH', '3', 250, 2.3);
INSERT OR IGNORE INTO orders (id, user_id, status, total_amount, delivery_method, created_at) VALUES ('APB-MN9BWNA1', '1774547143945', 'delivered', 3151, 'delivery', '2026-03-27T20:03:18.361Z');
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/4HH', '1-1/2',  500, 0.6);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/4HH', '2',  500, 0.9);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/4HH', '3',  100, 2.4);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/4HH', '4',  10, 4.1);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/8HH', '1-1/2',  400, 0.6);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/8HH', '2',  500, 0.8);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/8HH', '3',  125, 2.3);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/8HH', '4',  15, 4.1);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/8HS', '1-1/2',  400, 0.5);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/8HS', '2',  500, 0.8);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/8HS', '3',  125, 2.1);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-1/8HS', '4', 9, 3.5);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-WYEHUB', '3', 30, 4.5);
INSERT OR IGNORE INTO order_items (order_id, product_sku, size, quantity, price_at_purchase) VALUES ('APB-MN9BWNA1', 'PVC-SANTEERED', '3x3x2', 30, 3.4);

-- Products Data
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PIPE-SOLID', 'ASTM D1785 SCH40 PVC', '2', 20, 2806, 16.20, 'images/Sch40Solid.png', 'Plumbing', 'PIPE-SOLID');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PIPE-SOLID', 'ASTM D1785 SCH40 PVC', '3', 20, 2806, 30.00, 'images/Sch40Solid.png', 'Plumbing', 'PIPE-SOLID');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PIPE-SOLID', 'ASTM D1785 SCH40 PVC', '4', 20, 2800, 54.80, 'images/Sch40Solid.png', 'Plumbing', 'PIPE-SOLID');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PIPE-FOAM', 'ASTM F891 PVC Foam Core DWV Pipe', '1-1/2', 20, 1, 7.70, 'images/Sch40Foam.png', 'Plumbing', 'PIPE-FOAM');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PIPE-FOAM', 'ASTM F891 PVC Foam Core DWV Pipe', '2', 20, 1, 9.80, 'images/Sch40Foam.png', 'Plumbing', 'PIPE-FOAM');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PIPE-FOAM', 'ASTM F891 PVC Foam Core DWV Pipe', '3', 20, 1, 18.60, 'images/Sch40Foam.png', 'Plumbing', 'PIPE-FOAM');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PIPE-FOAM', 'ASTM F891 PVC Foam Core DWV Pipe', '4', 20, 1, 27.60, 'images/Sch40Foam.png', 'Plumbing', 'PIPE-FOAM');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/4HH', '1/4 BEND (H x H)', '1-1/2', 100, 3300, 0.60, 'images/90Elbow.png', 'Plumbing', 'PVC-1/4HH');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/4HH', '1/4 BEND (H x H)', '2', 50, 2700, 0.90, 'images/90Elbow.png', 'Plumbing', 'PVC-1/4HH');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/4HH', '1/4 BEND (H x H)', '3', 25, 1975, 2.40, 'images/90Elbow.png', 'Plumbing', 'PVC-1/4HH');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/4HH', '1/4 BEND (H x H)', '4', 10, 220, 4.10, 'images/90Elbow.png', 'Plumbing', 'PVC-1/4HH');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/8HH', '1/8 BEND (H x H)', '1-1/2', 100, 600, 0.60, 'images/90Elbow.png', 'Plumbing', 'PVC-1/8HH');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/8HH', '1/8 BEND (H x H)', '2', 50, 1400, 0.80, 'images/90Elbow.png', 'Plumbing', 'PVC-1/8HH');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/8HH', '1/8 BEND (H x H)', '3', 25, 1350, 2.30, 'images/90Elbow.png', 'Plumbing', 'PVC-1/8HH');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/8HH', '1/8 BEND (H x H)', '4', 15, 75, 4.10, 'images/90Elbow.png', 'Plumbing', 'PVC-1/8HH');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/8HS', '1/8 BEND STREET (H x S)', '1-1/2', 100, 0, 0.50, 'images/90Elbow.png', 'Plumbing', 'PVC-1/8HS');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/8HS', '1/8 BEND STREET (H x S)', '2', 50, 1900, 0.80, 'images/90Elbow.png', 'Plumbing', 'PVC-1/8HS');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/8HS', '1/8 BEND STREET (H x S)', '3', 25, 1375, 2.10, 'images/90Elbow.png', 'Plumbing', 'PVC-1/8HS');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-1/8HS', '1/8 BEND STREET (H x S)', '4', 9, 144, 3.50, 'images/90Elbow.png', 'Plumbing', 'PVC-1/8HS');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-SANTEE', 'SANITARY TEE (ALL HUB)', '1-1/2', 60, 120, 1.00, 'images/SanTee.png', 'Plumbing', 'PVC-SANTEE');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-SANTEE', 'SANITARY TEE (ALL HUB)', '2', 35, 0, 1.40, 'images/SanTee.png', 'Plumbing', 'PVC-SANTEE');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-SANTEE', 'SANITARY TEE (ALL HUB)', '3', 15, 105, 3.50, 'images/SanTee.png', 'Plumbing', 'PVC-SANTEE');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-SANTEE', 'SANITARY TEE (ALL HUB)', '4', 5, 100, 8.60, 'images/SanTee.png', 'Plumbing', 'PVC-SANTEE');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-WYEHUB', 'WYE (ALL HUB)', '1-1/2', 50, 100, 1.10, 'images/RedWye.png', 'Plumbing', 'PVC-WYEHUB');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-WYEHUB', 'WYE (ALL HUB)', '2', 25, 450, 1.70, 'images/RedWye.png', 'Plumbing', 'PVC-WYEHUB');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-WYEHUB', 'WYE (ALL HUB)', '3', 15, 0, 4.50, 'images/RedWye.png', 'Plumbing', 'PVC-WYEHUB');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-WYEHUB', 'WYE (ALL HUB)', '4', 8, 104, 7.90, 'images/RedWye.png', 'Plumbing', 'PVC-WYEHUB');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-SANTEERED', 'REDUCING SANITARY TEE (ALL HUB)', '3x3x2', 15, 345, 3.40, 'images/RedSanTee.png', 'Plumbing', 'PVC-SANTEERED');
INSERT OR IGNORE INTO products (code, description, size, pack, qty, price, image, main_category, sub_category) VALUES ('PVC-CLSTFLNGH', 'CLOSET FLANGE W/TEST PLATE (H)', '4x3', 20, 1620, 3.10, 'images/CapSOC.png', 'Plumbing', 'PVC-CLSTFLNGH');
