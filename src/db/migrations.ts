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
`,
  },
] as const;
