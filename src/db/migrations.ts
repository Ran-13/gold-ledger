export const MIGRATIONS = [
  {
    version: 1,
    sql: `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prices (
  date TEXT PRIMARY KEY,
  buy INTEGER NOT NULL,
  sell INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS txns (
  id INTEGER PRIMARY KEY,
  voucher_no INTEGER UNIQUE NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT CHECK(type IN ('sell','buy')) NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  yway REAL NOT NULL,
  price INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS txns_date ON txns(date);

INSERT OR IGNORE INTO settings (key, value) VALUES ('opening_stock_yway', '0');
INSERT OR IGNORE INTO settings (key, value) VALUES ('digits', 'latin');
INSERT OR IGNORE INTO settings (key, value) VALUES ('round_to', '100');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_name', 'ဦးသန့်စင်');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_mark', 'သ');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_tagline', 'အခေါက်ရွှေ အရောင်းအဝယ်');
`,
  },
  {
    version: 2,
    sql: `
ALTER TABLE customers ADD COLUMN nrc TEXT;
`,
  },
  {
    version: 3,
    sql: `
CREATE TABLE IF NOT EXISTS price_logs (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  buy INTEGER NOT NULL,
  sell INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS price_logs_dt ON price_logs(date, time);
INSERT INTO price_logs (date, time, buy, sell)
  SELECT date, '00:00:00', buy, sell FROM prices ORDER BY date ASC;
`,
  },
  {
    version: 4,
    sql: `
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  kind TEXT CHECK(kind IN ('in','out')) NOT NULL,
  yway REAL NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS stock_adj_dt ON stock_adjustments(date, time);
`,
  },
  {
    version: 5,
    sql: `
INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_name', 'ဦးသန့်စင်');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_mark', 'သ');
INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_tagline', 'အခေါက်ရွှေ အရောင်းအဝယ်');
`,
  },
  {
    version: 6,
    sql: `
INSERT OR IGNORE INTO settings (key, value) VALUES ('card_fee', '30000');

CREATE TABLE IF NOT EXISTS card_openings (
  denom TEXT PRIMARY KEY,
  qty INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO card_openings (denom, qty) VALUES ('1p', 0);
INSERT OR IGNORE INTO card_openings (denom, qty) VALUES ('2p', 0);
INSERT OR IGNORE INTO card_openings (denom, qty) VALUES ('4p', 0);
INSERT OR IGNORE INTO card_openings (denom, qty) VALUES ('8p', 0);
INSERT OR IGNORE INTO card_openings (denom, qty) VALUES ('1k', 0);
INSERT OR IGNORE INTO card_openings (denom, qty) VALUES ('2k', 0);
INSERT OR IGNORE INTO card_openings (denom, qty) VALUES ('3k', 0);
INSERT OR IGNORE INTO card_openings (denom, qty) VALUES ('5k', 0);
INSERT OR IGNORE INTO card_openings (denom, qty) VALUES ('10k', 0);

CREATE TABLE IF NOT EXISTS card_adjustments (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  kind TEXT CHECK(kind IN ('in','out')) NOT NULL,
  denom TEXT NOT NULL,
  qty INTEGER NOT NULL,
  note TEXT
);
CREATE INDEX IF NOT EXISTS card_adj_dt ON card_adjustments(date, time);

ALTER TABLE txns ADD COLUMN channel TEXT NOT NULL DEFAULT 'loose';
ALTER TABLE txns ADD COLUMN card_fee INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS txn_cards (
  id INTEGER PRIMARY KEY,
  txn_id INTEGER NOT NULL REFERENCES txns(id) ON DELETE CASCADE,
  denom TEXT NOT NULL,
  qty INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS txn_cards_txn ON txn_cards(txn_id);
`,
  },
  {
    version: 7,
    sql: `
INSERT OR IGNORE INTO settings (key, value) VALUES ('print_size', 'M');
`,
  },
  {
    version: 8,
    /** Buy card fee: amount = gold + fee (JS fix applied in runMigrations). */
    sql: `
INSERT OR IGNORE INTO settings (key, value) VALUES ('buy_card_fee_add', '1');
`,
  },
  {
    version: 9,
    sql: `
INSERT OR IGNORE INTO settings (key, value) VALUES ('auth_username', 'admin');
INSERT OR IGNORE INTO settings (key, value) VALUES ('auth_password_hash', '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8');
`,
  },
] as const;
