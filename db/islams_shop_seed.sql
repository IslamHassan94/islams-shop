-- =====================================================================
-- Islam's Shop: fitness-wear e-commerce schema + seed data (PostgreSQL / Aurora PG)
-- Safe to re-run: drops and recreates the "shop" schema.
-- Deterministic: setseed() makes the "random" data identical every run.
-- Every seeded customer can log in with password:  Test@1234
-- =====================================================================

DROP SCHEMA IF EXISTS shop CASCADE;
CREATE SCHEMA shop;
SET search_path TO shop;

SELECT setseed(0.42);

-- ---------- Types ----------
CREATE TYPE customer_status AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING_VERIFICATION');
CREATE TYPE order_status    AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
CREATE TYPE payment_method  AS ENUM ('CARD', 'PAYPAL', 'SEPA', 'KLARNA', 'GIFT_CARD');
CREATE TYPE payment_status  AS ENUM ('AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED');
CREATE TYPE shipment_status AS ENUM ('LABEL_CREATED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'LOST');

-- ---------- Tables ----------
CREATE TABLE customers (
    id               SERIAL PRIMARY KEY,
    email            VARCHAR(255) NOT NULL UNIQUE,
    password_hash    VARCHAR(100),
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    phone            VARCHAR(30),
    status           customer_status NOT NULL DEFAULT 'ACTIVE',
    is_vip           BOOLEAN NOT NULL DEFAULT FALSE,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at    TIMESTAMPTZ
);

CREATE TABLE addresses (
    id            SERIAL PRIMARY KEY,
    customer_id   INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type          VARCHAR(10) NOT NULL CHECK (type IN ('SHIPPING', 'BILLING')),
    street        VARCHAR(200) NOT NULL,
    city          VARCHAR(100) NOT NULL,
    postal_code   VARCHAR(20)  NOT NULL,
    country_code  CHAR(2)      NOT NULL,
    is_default    BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE categories (
    id    SERIAL PRIMARY KEY,
    slug  VARCHAR(50)  NOT NULL UNIQUE,
    name  VARCHAR(100) NOT NULL UNIQUE,
    sort  INT NOT NULL DEFAULT 0
);

CREATE TABLE products (
    id               SERIAL PRIMARY KEY,
    sku              VARCHAR(30)  NOT NULL UNIQUE,
    slug             VARCHAR(160) NOT NULL UNIQUE,
    name             VARCHAR(200) NOT NULL,
    description      TEXT,
    category_id      INT NOT NULL REFERENCES categories(id),
    gender           VARCHAR(10) NOT NULL CHECK (gender IN ('WOMEN', 'MEN', 'UNISEX')),
    image_key        VARCHAR(30) NOT NULL,          -- drawing type used by /img/<key>/<color>
    colors           VARCHAR(200) NOT NULL,         -- comma separated, first = default
    sizes            VARCHAR(100) NOT NULL,         -- comma separated
    price            NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    compare_at_price NUMERIC(10,2),                 -- set = product is on sale
    currency         CHAR(3) NOT NULL DEFAULT 'EUR',
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE inventory (
    product_id   INT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    quantity     INT NOT NULL CHECK (quantity >= 0),
    reserved     INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    warehouse    VARCHAR(50) NOT NULL DEFAULT 'FRA-1'
);

CREATE TABLE coupons (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(30) NOT NULL UNIQUE,
    discount_type   VARCHAR(10) NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
    discount_value  NUMERIC(10,2) NOT NULL,
    min_order_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    valid_from      TIMESTAMPTZ NOT NULL,
    valid_to        TIMESTAMPTZ NOT NULL,
    max_uses        INT,
    times_used      INT NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE orders (
    id                  SERIAL PRIMARY KEY,
    order_number        VARCHAR(20) NOT NULL UNIQUE,
    access_token        VARCHAR(40) NOT NULL,        -- lets guests open their confirmation page
    customer_id         INT REFERENCES customers(id), -- NULL = guest checkout
    guest_email         VARCHAR(255),
    shipping_address_id INT REFERENCES addresses(id),
    ship_name           VARCHAR(200),
    ship_street         VARCHAR(200),
    ship_city           VARCHAR(100),
    ship_postal_code    VARCHAR(20),
    ship_country        CHAR(2),
    coupon_id           INT REFERENCES coupons(id),
    status              order_status NOT NULL DEFAULT 'PENDING',
    subtotal            NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount            NUMERIC(10,2) NOT NULL DEFAULT 0,
    shipping_fee        NUMERIC(10,2) NOT NULL DEFAULT 0,
    total               NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency            CHAR(3) NOT NULL DEFAULT 'EUR',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (customer_id IS NOT NULL OR guest_email IS NOT NULL)
);

CREATE TABLE order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   INT NOT NULL REFERENCES products(id),
    product_name VARCHAR(200) NOT NULL,
    size         VARCHAR(20),
    color        VARCHAR(30),
    quantity     INT NOT NULL CHECK (quantity > 0),
    unit_price   NUMERIC(10,2) NOT NULL
);

CREATE TABLE payments (
    id             SERIAL PRIMARY KEY,
    order_id       INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    method         payment_method NOT NULL,
    status         payment_status NOT NULL,
    amount         NUMERIC(10,2) NOT NULL,
    card_brand     VARCHAR(20),
    card_last4     CHAR(4),                -- never store full card numbers
    failure_reason VARCHAR(100),
    provider_ref   VARCHAR(50),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipments (
    id              SERIAL PRIMARY KEY,
    order_id        INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    carrier         VARCHAR(30) NOT NULL,
    tracking_number VARCHAR(50) NOT NULL,
    status          shipment_status NOT NULL,
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ
);

CREATE TABLE reviews (
    id           SERIAL PRIMARY KEY,
    product_id   INT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_id  INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (product_id, customer_id)
);

CREATE TABLE cart_items (
    id          SERIAL PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    product_id  INT NOT NULL REFERENCES products(id),
    quantity    INT NOT NULL CHECK (quantity > 0),
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (customer_id, product_id)
);

CREATE INDEX idx_orders_customer   ON orders(customer_id);
CREATE INDEX idx_orders_status     ON orders(status);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_payments_order    ON payments(order_id);
CREATE INDEX idx_customers_status  ON customers(status);
CREATE INDEX idx_products_category ON products(category_id);

-- =====================================================================
-- SEED DATA
-- =====================================================================

-- ---------- Categories ----------
INSERT INTO categories (slug, name, sort) VALUES
 ('leggings',        'Leggings',          1),
 ('sports-bras',     'Sports Bras',       2),
 ('tops',            'Tops & Tanks',      3),
 ('shorts',          'Shorts',            4),
 ('hoodies-jackets', 'Hoodies & Jackets', 5),
 ('joggers',         'Joggers',           6),
 ('accessories',     'Accessories',       7);

-- ---------- Products (40 regular, ids 1-40) ----------
INSERT INTO products (sku, slug, name, category_id, gender, image_key, colors, sizes, price, compare_at_price, is_featured, created_at)
SELECT v.sku, v.slug, v.name, c.id, v.gender, v.image_key, v.colors, v.sizes, v.price, v.compare_at, v.featured,
       now() - (v.age_days * interval '1 day')
FROM (VALUES
 (1,  'IS-LEG-001','aeroflex-high-rise-leggings',  'AeroFlex High-Rise Leggings',     'leggings','WOMEN','leggings','Black,Navy,Sage',              'XS,S,M,L,XL', 64.00, NULL::numeric, TRUE,  120),
 (2,  'IS-LEG-002','sculpt-seamless-leggings',     'Sculpt Seamless Leggings',        'leggings','WOMEN','leggings','Lilac,Black,Rose',             'XS,S,M,L,XL', 58.00, 72.00,         TRUE,  90),
 (3,  'IS-LEG-003','pocket-pro-7-8-leggings',      'Pocket Pro 7/8 Leggings',         'leggings','WOMEN','leggings','Charcoal,Olive,Black',         'XS,S,M,L,XL', 69.00, NULL,          FALSE, 60),
 (4,  'IS-LEG-004','studio-flare-leggings',        'Studio Flare Leggings',           'leggings','WOMEN','leggings','Black,Sand',                   'XS,S,M,L',    54.00, NULL,          FALSE, 30),
 (5,  'IS-LEG-005','thermarun-winter-tights',      'ThermaRun Winter Tights',         'leggings','UNISEX','leggings','Navy,Black',                  'XS,S,M,L,XL', 79.00, NULL,          FALSE, 10),
 (6,  'IS-BRA-001','core-support-sports-bra',      'Core Support Sports Bra',         'sports-bras','WOMEN','bra','Rose,Black,Sage',                'XS,S,M,L,XL', 39.00, NULL,          TRUE,  150),
 (7,  'IS-BRA-002','impact-max-sports-bra',        'Impact Max Sports Bra',           'sports-bras','WOMEN','bra','Electric Blue,Black,Navy',       'XS,S,M,L,XL', 49.00, NULL,          FALSE, 80),
 (8,  'IS-BRA-003','seamless-racerback-bra',       'Seamless Racerback Bra',          'sports-bras','WOMEN','bra','Lilac,Sand,White',               'XS,S,M,L',    34.00, 42.00,         FALSE, 45),
 (9,  'IS-BRA-004','cross-back-yoga-bra',          'Cross-Back Yoga Bra',             'sports-bras','WOMEN','bra','Sage,Rose',                      'XS,S,M,L',    32.00, NULL,          FALSE, 20),
 (10, 'IS-TOP-001','breeze-racer-tank',            'Breeze Racer Tank',               'tops','WOMEN','tank','White,Black,Rose',                     'XS,S,M,L,XL', 29.00, NULL,          FALSE, 200),
 (11, 'IS-TOP-002','muscle-fit-tank',              'Muscle Fit Tank',                 'tops','MEN','tank','Black,Charcoal,Olive',                   'S,M,L,XL,XXL',27.00, NULL,          TRUE,  170),
 (12, 'IS-TOP-003','drytech-training-tee',         'DryTech Training Tee',            'tops','MEN','tee','Electric Blue,Black,Navy,White',          'S,M,L,XL,XXL',32.00, NULL,          TRUE,  140),
 (13, 'IS-TOP-004','oversized-pump-tee',           'Oversized Pump Tee',              'tops','MEN','tee','Sand,Charcoal,Black',                     'S,M,L,XL,XXL',35.00, NULL,          FALSE, 50),
 (14, 'IS-TOP-005','essential-crop-tee',           'Essential Crop Tee',              'tops','WOMEN','tee','Lilac,White,Sage',                      'XS,S,M,L',    28.00, NULL,          FALSE, 25),
 (15, 'IS-TOP-006','long-sleeve-run-top',          'Long Sleeve Run Top',             'tops','UNISEX','tee','Electric Blue,Black',                  'XS,S,M,L,XL', 42.00, NULL,          FALSE, 5),
 (16, 'IS-TOP-007','mesh-panel-tank',              'Mesh Panel Tank',                 'tops','WOMEN','tank','Red,Black',                            'XS,S,M,L',    31.00, 38.00,         FALSE, 70),
 (17, 'IS-SHO-001','velocity-5-running-shorts',    'Velocity 5" Running Shorts',      'shorts','MEN','shorts','Navy,Black,Red',                     'S,M,L,XL',    36.00, NULL,          TRUE,  110),
 (18, 'IS-SHO-002','lifting-shorts-7',             'Lifting Shorts 7"',               'shorts','MEN','shorts','Charcoal,Olive,Black',               'S,M,L,XL,XXL',38.00, NULL,          FALSE, 95),
 (19, 'IS-SHO-003','biker-shorts-6',               'Biker Shorts 6"',                 'shorts','WOMEN','shorts','Black,Rose,Sage',                  'XS,S,M,L,XL', 34.00, NULL,          FALSE, 40),
 (20, 'IS-SHO-004','2-in-1-trail-shorts',          '2-in-1 Trail Shorts',             'shorts','UNISEX','shorts','Olive,Sand',                      'XS,S,M,L,XL', 45.00, NULL,          FALSE, 15),
 (21, 'IS-SHO-005','mesh-basketball-shorts',       'Mesh Basketball Shorts',          'shorts','MEN','shorts','Red,Black,Electric Blue',            'S,M,L,XL,XXL',33.00, 40.00,         FALSE, 60),
 (22, 'IS-HOO-001','recovery-fleece-hoodie',       'Recovery Fleece Hoodie',          'hoodies-jackets','UNISEX','hoodie','Charcoal,Sand,Black',    'XS,S,M,L,XL', 69.00, NULL,          TRUE,  130),
 (23, 'IS-HOO-002','cropped-zip-hoodie',           'Cropped Zip Hoodie',              'hoodies-jackets','WOMEN','hoodie','Lilac,Rose,Black',        'XS,S,M,L',    62.00, NULL,          FALSE, 55),
 (24, 'IS-HOO-003','heavyweight-pump-cover-hoodie','Heavyweight Pump Cover Hoodie',   'hoodies-jackets','MEN','hoodie','Black,Olive',               'S,M,L,XL,XXL',74.00, NULL,          FALSE, 35),
 (25, 'IS-HOO-004','windbreaker-run-jacket',       'Windbreaker Run Jacket',          'hoodies-jackets','UNISEX','hoodie','Electric Blue,Black,Red','XS,S,M,L,XL', 89.00, 110.00,        TRUE,  12),
 (26, 'IS-HOO-005','quarter-zip-training-top',     'Quarter-Zip Training Top',        'hoodies-jackets','MEN','hoodie','Navy,Charcoal',             'S,M,L,XL',    58.00, NULL,          FALSE, 85),
 (27, 'IS-JOG-001','everyday-tapered-joggers',     'Everyday Tapered Joggers',        'joggers','UNISEX','joggers','Charcoal,Black,Sand',           'XS,S,M,L,XL', 59.00, NULL,          TRUE,  160),
 (28, 'IS-JOG-002','tech-fleece-joggers',          'Tech Fleece Joggers',             'joggers','MEN','joggers','Navy,Black',                       'S,M,L,XL,XXL',72.00, NULL,          FALSE, 75),
 (29, 'IS-JOG-003','relaxed-wide-leg-sweatpants',  'Relaxed Wide-Leg Sweatpants',     'joggers','WOMEN','joggers','Sand,Lilac,Sage',                'XS,S,M,L',    55.00, NULL,          FALSE, 22),
 (30, 'IS-JOG-004','cargo-training-joggers',       'Cargo Training Joggers',          'joggers','MEN','joggers','Olive,Black',                      'S,M,L,XL',    64.00, 79.00,         FALSE, 18),
 (31, 'IS-ACC-001','crew-training-socks-3-pack',   'Crew Training Socks 3-Pack',      'accessories','UNISEX','socks','White,Black',                 'S/M,L/XL',    18.00, NULL,          FALSE, 190),
 (32, 'IS-ACC-002','ankle-grip-socks',             'Ankle Grip Socks',                'accessories','WOMEN','socks','Rose,Lilac,Black',             'S/M,L/XL',    14.00, NULL,          FALSE, 100),
 (33, 'IS-ACC-003','compression-run-socks',        'Compression Run Socks',           'accessories','UNISEX','socks','Electric Blue,Black',         'S/M,L/XL',    22.00, NULL,          FALSE, 65),
 (34, 'IS-ACC-004','performance-cap',              'Performance Cap',                 'accessories','UNISEX','cap','Black,White,Navy',              'One Size',    25.00, NULL,          FALSE, 125),
 (35, 'IS-ACC-005','dad-cap-logo',                 'Dad Cap Logo',                    'accessories','UNISEX','cap','Sand,Olive,Charcoal',           'One Size',    22.00, NULL,          FALSE, 48),
 (36, 'IS-ACC-006','gym-duffel-bag-40l',           'Gym Duffel Bag 40L',              'accessories','UNISEX','bag','Black,Charcoal',                'One Size',    65.00, NULL,          TRUE,  140),
 (37, 'IS-ACC-007','mini-gym-bag-15l',             'Mini Gym Bag 15L',                'accessories','UNISEX','bag','Rose,Sage,Black',               'One Size',    39.00, NULL,          FALSE, 33),
 (38, 'IS-LEG-006','mens-compression-tights',      'Men''s Compression Tights',       'leggings','MEN','leggings','Black,Navy',                     'S,M,L,XL',    44.00, NULL,          FALSE, 58),
 (39, 'IS-HOO-006','training-hoodie-lite',         'Training Hoodie Lite',            'hoodies-jackets','MEN','hoodie','Electric Blue,Charcoal',    'S,M,L,XL',    55.00, 65.00,         FALSE, 28),
 (40, 'IS-HOO-007','womens-running-jacket',        'Women''s Running Jacket',         'hoodies-jackets','WOMEN','hoodie','Sage,Black',              'XS,S,M,L',    84.00, NULL,          FALSE, 8)
) AS v(n, sku, slug, name, cat, gender, image_key, colors, sizes, price, compare_at, featured, age_days)
JOIN categories c ON c.slug = v.cat
ORDER BY v.n;

-- ---------- Edge-case products (ids 41+) ----------
INSERT INTO products (sku, slug, name, category_id, gender, image_key, colors, sizes, price, compare_at_price, is_active, created_at)
SELECT v.sku, v.slug, v.name, c.id, v.gender, v.image_key, v.colors, v.sizes, v.price, v.compare_at, v.active, now() - interval '3 days'
FROM (VALUES
 (41, 'IS-EDGE-FREE',     'free-gift-mini-resistance-band', 'Free Gift: Mini Resistance Band', 'accessories','UNISEX','band','Rose,Black',  'One Size', 0.00,   NULL::numeric, TRUE),  -- zero price
 (42, 'IS-EDGE-OOS',      'neon-pulse-leggings-limited',    'Limited Drop: Neon Pulse Leggings','leggings','WOMEN','leggings','Electric Blue','XS,S,M,L', 74.00, NULL,        TRUE),  -- stock 0
 (43, 'IS-EDGE-INACTIVE', 'retired-classic-tank',           'Retired Classic Tank',            'tops','UNISEX','tank','Charcoal',          'S,M,L',    19.00,  NULL,         FALSE), -- hidden from shop
 (44, 'IS-EDGE-UNICODE',  'gruesse-yoga-hose-edition',      'Grüße Yoga-Hose „Ünïcødé“ – Édition', 'leggings','WOMEN','leggings','Lilac','XS,S,M,L', 59.90,  NULL,         TRUE),  -- unicode
 (45, 'IS-EDGE-LONGNAME', 'ultra-long-name-training-tee',   'Ultra Lightweight Breathable Moisture-Wicking Anti-Odour Four-Way-Stretch Performance Training Tee For High Intensity Interval Sessions', 'tops','MEN','tee','Navy', 'S,M,L,XL', 39.00, NULL, TRUE), -- UI truncation
 (46, 'IS-EDGE-LOWSTOCK', 'last-chance-seamless-bra',       'Last Chance Seamless Bra',        'sports-bras','WOMEN','bra','Red',          'S,M',      24.00,  48.00,        TRUE),  -- 2 left, 50% off
 (47, 'IS-EDGE-PRICEY',   'signature-cashmere-hoodie',      'Signature Cashmere Training Hoodie','hoodies-jackets','UNISEX','hoodie','Sand','S,M,L',   899.00, NULL,         TRUE)   -- high price
) AS v(n, sku, slug, name, cat, gender, image_key, colors, sizes, price, compare_at, active)
JOIN categories c ON c.slug = v.cat
ORDER BY v.n;

-- ---------- Descriptions (by category) ----------
UPDATE products p SET description = CASE c.slug
  WHEN 'leggings'        THEN 'Buttery-soft four-way stretch fabric that stays squat-proof through every rep. High-rise waistband, flatlock seams and a hidden key pocket.'
  WHEN 'sports-bras'     THEN 'Supportive, breathable and made to move. Removable pads, moisture-wicking fabric and a soft elastic underband that never digs in.'
  WHEN 'tops'            THEN 'Lightweight training top with quick-dry fabric and an athletic cut that moves with you from warm-up to cool-down.'
  WHEN 'shorts'          THEN 'Built for speed and lifting days alike: lightweight stretch shell, secure zip pocket and a drawcord waist.'
  WHEN 'hoodies-jackets' THEN 'Your go-to layer before and after training. Brushed interior, relaxed fit and thumbholes to keep sleeves in place.'
  WHEN 'joggers'         THEN 'Tapered joggers in soft loopback cotton blend with ribbed cuffs, deep pockets and an adjustable waist.'
  ELSE                        'Gym essential designed to keep up with your routine, wash after wash.'
END
FROM categories c WHERE c.id = p.category_id;

-- ---------- Inventory ----------
INSERT INTO inventory (product_id, quantity, reserved, warehouse)
SELECT p.id,
       CASE WHEN p.sku = 'IS-EDGE-OOS'      THEN 0
            WHEN p.sku = 'IS-EDGE-LOWSTOCK' THEN 2
            WHEN p.id % 13 = 0              THEN 4      -- low stock
            ELSE 25 + floor(random() * 175)::int END,
       0,
       (ARRAY['FRA-1','BER-1','HAM-1'])[1 + (p.id % 3)]
FROM products p;

-- ---------- Coupons ----------
INSERT INTO coupons (code, discount_type, discount_value, min_order_total, valid_from, valid_to, max_uses, times_used, is_active) VALUES
 ('WELCOME10',  'PERCENT', 10,   0,  now() - interval '1 year',  now() + interval '1 year',  NULL, 0, TRUE),   -- valid
 ('SAVE20',     'FIXED',   20, 100,  now() - interval '30 days', now() + interval '30 days', 500,  0, TRUE),   -- valid, min order 100
 ('EXPIRED50',  'PERCENT', 50,   0,  now() - interval '60 days', now() - interval '1 day',   NULL, 0, TRUE),   -- expired
 ('FUTURE15',   'PERCENT', 15,   0,  now() + interval '10 days', now() + interval '40 days', NULL, 0, TRUE),   -- not started
 ('USEDUP5',    'FIXED',    5,   0,  now() - interval '30 days', now() + interval '30 days', 10,  10, TRUE),   -- max uses reached
 ('DISABLED25', 'PERCENT', 25,   0,  now() - interval '30 days', now() + interval '30 days', NULL, 0, FALSE);  -- inactive

-- ---------- Customers (200 generated, password Test@1234) ----------
WITH names AS (
  SELECT ARRAY['Anna','Lukas','Mia','Leon','Emma','Paul','Sofia','Jonas','Lea','Finn','Hannah','Elias','Laura','Noah','Sara','Omar','Lina','Youssef','Nour','Karim'] AS fn,
         ARRAY['Müller','Schmidt','Schneider','Fischer','Weber','Meyer','Wagner','Becker','Hoffmann','Schulz','Hassan','Ali','Rossi','García','Novak','Kowalski','Dubois','Smith','Yılmaz','Jansen'] AS ln
)
INSERT INTO customers (email, password_hash, first_name, last_name, phone, status, is_vip, marketing_opt_in, created_at, last_login_at)
SELECT
  'customer' || g || '@islamsshop.test',
  '$2b$10$vKiknuD45pF4pmelSyqwaeOSiyWQV6pTqMtPcn04eBmKxYSNxGv26',
  fn[1 + (g % 20)],
  ln[1 + ((g * 7) % 20)],
  '+49 15' || lpad((10000000 + g * 3571)::text, 9, '0'),
  CASE WHEN g % 25 = 0 THEN 'BLOCKED'::customer_status
       WHEN g % 17 = 0 THEN 'INACTIVE'
       WHEN g % 19 = 0 THEN 'PENDING_VERIFICATION'
       ELSE 'ACTIVE' END,
  (g % 10 = 0),
  (g % 3 = 0),
  now() - (random() * interval '730 days'),
  CASE WHEN g % 11 = 0 THEN NULL ELSE now() - (random() * interval '60 days') END
FROM generate_series(1, 200) g, names;

-- Named test accounts (all use password Test@1234)
INSERT INTO customers (email, password_hash, first_name, last_name, phone, status, is_vip, marketing_opt_in, created_at, last_login_at) VALUES
 ('demo@islamsshop.test',        '$2b$10$vKiknuD45pF4pmelSyqwaeOSiyWQV6pTqMtPcn04eBmKxYSNxGv26', 'Demo',    'User',        '+49 1510000000', 'ACTIVE',               FALSE, TRUE,  now() - interval '300 days', now()),
 ('new.no.orders@islamsshop.test','$2b$10$vKiknuD45pF4pmelSyqwaeOSiyWQV6pTqMtPcn04eBmKxYSNxGv26','Nora',    'Neukunde',    '+49 1511111111', 'ACTIVE',               FALSE, FALSE, now() - interval '1 day',    NULL),
 ('blocked.user@islamsshop.test','$2b$10$vKiknuD45pF4pmelSyqwaeOSiyWQV6pTqMtPcn04eBmKxYSNxGv26', 'Bruno',   'Blockiert',   '+49 1512222222', 'BLOCKED',              FALSE, FALSE, now() - interval '200 days', now() - interval '100 days'),
 ('vip.big.spender@islamsshop.test','$2b$10$vKiknuD45pF4pmelSyqwaeOSiyWQV6pTqMtPcn04eBmKxYSNxGv26','Valerie','Vip',        '+49 1513333333', 'ACTIVE',               TRUE,  TRUE,  now() - interval '900 days', now()),
 ('unicode.umlaut@islamsshop.test','$2b$10$vKiknuD45pF4pmelSyqwaeOSiyWQV6pTqMtPcn04eBmKxYSNxGv26','Jürgen', 'Groß-Öztürk', '+49 1514444444', 'ACTIVE',               FALSE, TRUE,  now() - interval '50 days',  now() - interval '2 days'),
 ('pending.verify@islamsshop.test','$2b$10$vKiknuD45pF4pmelSyqwaeOSiyWQV6pTqMtPcn04eBmKxYSNxGv26','Petra',  'Prüfung',     NULL,             'PENDING_VERIFICATION', FALSE, FALSE, now() - interval '2 days',   NULL),
 ('no.address@islamsshop.test',  '$2b$10$vKiknuD45pF4pmelSyqwaeOSiyWQV6pTqMtPcn04eBmKxYSNxGv26', 'Adam',    'Ohneadresse', NULL,             'ACTIVE',               FALSE, FALSE, now() - interval '10 days',  now() - interval '1 day');

-- ---------- Addresses ----------
INSERT INTO addresses (customer_id, type, street, city, postal_code, country_code, is_default)
SELECT c.id, 'SHIPPING',
       (ARRAY['Hauptstraße','Bahnhofstraße','Gartenweg','Schillerstraße','Goethestraße','Lindenallee'])[1 + (c.id % 6)] || ' ' || (1 + c.id % 120),
       (ARRAY['Berlin','München','Hamburg','Frankfurt am Main','Köln','Wetzlar','Gießen','Stuttgart','Wien','Amsterdam'])[1 + (c.id % 10)],
       lpad((10000 + (c.id * 389) % 89999)::text, 5, '0'),
       (ARRAY['DE','DE','DE','DE','DE','DE','DE','DE','AT','NL'])[1 + (c.id % 10)],
       TRUE
FROM customers c
WHERE c.email <> 'no.address@islamsshop.test';

INSERT INTO addresses (customer_id, type, street, city, postal_code, country_code, is_default)
SELECT c.id, 'BILLING', 'Rechnungsweg ' || c.id, 'Wetzlar', '35578', 'DE', TRUE
FROM customers c
WHERE c.id % 4 = 0 AND c.email <> 'no.address@islamsshop.test';

-- ---------- Orders (~600 generated) ----------
INSERT INTO orders (order_number, access_token, customer_id, shipping_address_id, ship_name, ship_street, ship_city, ship_postal_code, ship_country,
                    coupon_id, status, shipping_fee, created_at)
SELECT
  'IS-' || lpad(g::text, 6, '0'),
  md5('tok' || g),
  c.id, a.id, c.first_name || ' ' || c.last_name, a.street, a.city, a.postal_code, a.country_code,
  CASE WHEN g % 9 = 0 THEN 1 WHEN g % 13 = 0 THEN 2 ELSE NULL END,
  (ARRAY['DELIVERED','DELIVERED','DELIVERED','SHIPPED','PAID','PENDING','CANCELLED','REFUNDED'])[1 + floor(random() * 8)::int]::order_status,
  CASE WHEN g % 4 = 0 THEN 0 ELSE 4.99 END,
  now() - (random() * interval '365 days')
FROM generate_series(1, 600) g
JOIN customers c ON c.id = 1 + (g * 37) % 200
JOIN addresses a ON a.customer_id = c.id AND a.type = 'SHIPPING';

-- Demo user: a handful of orders in different states
INSERT INTO orders (order_number, access_token, customer_id, shipping_address_id, ship_name, ship_street, ship_city, ship_postal_code, ship_country, status, shipping_fee, created_at)
SELECT 'IS-DEMO-' || lpad(g::text, 2, '0'), md5('demo' || g), c.id, a.id, 'Demo User', a.street, a.city, a.postal_code, a.country_code,
       (ARRAY['DELIVERED','SHIPPED','PAID','CANCELLED','REFUNDED'])[g]::order_status, 4.99, now() - (g * interval '9 days')
FROM generate_series(1, 5) g
JOIN customers c ON c.email = 'demo@islamsshop.test'
JOIN addresses a ON a.customer_id = c.id AND a.type = 'SHIPPING';

-- VIP customer: many orders
INSERT INTO orders (order_number, access_token, customer_id, shipping_address_id, ship_name, ship_street, ship_city, ship_postal_code, ship_country, status, shipping_fee, created_at)
SELECT 'IS-VIP-' || lpad(g::text, 4, '0'), md5('vip' || g), c.id, a.id, 'Valerie Vip', a.street, a.city, a.postal_code, a.country_code,
       'DELIVERED', 0, now() - (g * interval '7 days')
FROM generate_series(1, 25) g
JOIN customers c ON c.email = 'vip.big.spender@islamsshop.test'
JOIN addresses a ON a.customer_id = c.id AND a.type = 'SHIPPING';

-- A few guest orders
INSERT INTO orders (order_number, access_token, guest_email, ship_name, ship_street, ship_city, ship_postal_code, ship_country, status, shipping_fee, created_at)
SELECT 'IS-GUEST-' || lpad(g::text, 3, '0'), md5('guest' || g), 'guest' || g || '@example.test', 'Guest Shopper ' || g,
       'Gaststraße ' || g, 'Wetzlar', '35576', 'DE', 'PAID', 4.99, now() - (g * interval '2 days')
FROM generate_series(1, 10) g;

-- ---------- Order items (1-4 per order, regular products only) ----------
INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, unit_price)
SELECT o.id, p.id, p.name,
       split_part(p.sizes,  ',', 1 + ((o.id + n) % array_length(string_to_array(p.sizes, ','), 1))),
       split_part(p.colors, ',', 1 + ((o.id * n) % array_length(string_to_array(p.colors, ','), 1))),
       1 + floor(random() * 3)::int,
       p.price
FROM orders o
CROSS JOIN LATERAL generate_series(1, 1 + (o.id % 4)) n
JOIN products p ON p.id = 1 + ((o.id * 7 + n * 13) % 40);

-- ---------- Order totals ----------
UPDATE orders o SET subtotal = s.subtotal
FROM (SELECT order_id, sum(quantity * unit_price) AS subtotal FROM order_items GROUP BY order_id) s
WHERE s.order_id = o.id;

UPDATE orders o SET discount =
  CASE WHEN cp.discount_type = 'PERCENT' THEN round(o.subtotal * cp.discount_value / 100, 2)
       WHEN cp.discount_type = 'FIXED' AND o.subtotal >= cp.min_order_total THEN cp.discount_value
       ELSE 0 END
FROM coupons cp WHERE cp.id = o.coupon_id;

UPDATE orders SET total = subtotal - discount + shipping_fee, updated_at = created_at + interval '1 hour';

-- ---------- Payments ----------
INSERT INTO payments (order_id, method, status, amount, card_brand, card_last4, failure_reason, provider_ref, created_at)
SELECT o.id,
       (ARRAY['CARD','CARD','PAYPAL','SEPA','KLARNA','GIFT_CARD'])[1 + (o.id % 6)]::payment_method,
       CASE o.status
         WHEN 'PENDING'   THEN 'AUTHORIZED'
         WHEN 'CANCELLED' THEN 'FAILED'
         WHEN 'REFUNDED'  THEN 'REFUNDED'
         ELSE 'CAPTURED' END::payment_status,
       o.total,
       CASE WHEN o.id % 6 IN (0, 1) THEN (ARRAY['VISA','MASTERCARD'])[1 + (o.id % 2)] END,
       CASE WHEN o.id % 6 IN (0, 1) THEN lpad(((o.id * 7919) % 10000)::text, 4, '0') END,
       CASE WHEN o.status = 'CANCELLED' THEN 'card_declined' END,
       'PSP-' || substr(md5(o.id::text), 1, 12),
       o.created_at + interval '5 minutes'
FROM orders o;

-- ---------- Shipments ----------
INSERT INTO shipments (order_id, carrier, tracking_number, status, shipped_at, delivered_at)
SELECT o.id,
       (ARRAY['DHL','DPD','Hermes','UPS'])[1 + (o.id % 4)],
       'TRK' || lpad((o.id * 7919)::text, 10, '0'),
       CASE o.status WHEN 'DELIVERED' THEN 'DELIVERED'
                     WHEN 'REFUNDED'  THEN 'RETURNED'
                     ELSE 'IN_TRANSIT' END::shipment_status,
       o.created_at + interval '1 day',
       CASE WHEN o.status = 'DELIVERED' THEN o.created_at + interval '3 days' END
FROM orders o
WHERE o.status IN ('SHIPPED', 'DELIVERED', 'REFUNDED');

-- ---------- Reviews (only from customers who received the product) ----------
INSERT INTO reviews (product_id, customer_id, rating, comment, created_at)
SELECT DISTINCT ON (oi.product_id, o.customer_id)
       oi.product_id, o.customer_id,
       (ARRAY[5,5,4,4,4,3,2,1])[1 + floor(random() * 8)::int]::smallint,
       (ARRAY['Fits perfectly, squat-proof and comfy.','Great quality, survived 20+ washes.','Runs a bit small, size up.','Love the colour!','Good for the price.','Fabric pilled after a month.', NULL])[1 + floor(random() * 7)::int],
       o.created_at + interval '5 days'
FROM orders o JOIN order_items oi ON oi.order_id = o.id
WHERE o.status = 'DELIVERED' AND o.customer_id IS NOT NULL AND o.id % 2 = 0;

-- ---------- Saved carts ----------
INSERT INTO cart_items (customer_id, product_id, quantity, added_at)
SELECT c.id, 1 + (c.id % 40), 1 + (c.id % 3), now() - (c.id % 30) * interval '1 day'
FROM customers c WHERE c.id % 6 = 0;

-- ---------- Coupon usage counters ----------
UPDATE coupons cp SET times_used = cp.times_used + u.cnt
FROM (SELECT coupon_id, count(*) cnt FROM orders WHERE coupon_id IS NOT NULL GROUP BY coupon_id) u
WHERE u.coupon_id = cp.id;

-- =====================================================================
-- Views for test-data lookups
-- =====================================================================
CREATE VIEW v_customer_summary AS
SELECT c.id, c.email, c.first_name, c.last_name, c.status, c.is_vip,
       count(o.id)               AS order_count,
       coalesce(sum(o.total), 0) AS lifetime_value,
       max(o.created_at)         AS last_order_at
FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id;

CREATE VIEW v_product_stock AS
SELECT p.id, p.sku, p.slug, p.name, p.price, p.is_active, i.quantity - i.reserved AS available, i.warehouse
FROM products p JOIN inventory i ON i.product_id = p.id;

-- ---------- Summary ----------
SELECT 'customers' AS table_name, count(*) FROM customers
UNION ALL SELECT 'products',    count(*) FROM products
UNION ALL SELECT 'orders',      count(*) FROM orders
UNION ALL SELECT 'order_items', count(*) FROM order_items
UNION ALL SELECT 'payments',    count(*) FROM payments
UNION ALL SELECT 'reviews',     count(*) FROM reviews
UNION ALL SELECT 'coupons',     count(*) FROM coupons;
