/**
 * Full-DB backup/restore verification (closed-file snapshot = production guarantee).
 * Uses system sqlite3 CLI — mirrors what AppData txn/daily/weekly backups restore.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const SQLITE =
  fs.existsSync('/usr/bin/sqlite3') ? '/usr/bin/sqlite3' : 'sqlite3';

function sql(db: string, query: string): string {
  return execFileSync(SQLITE, [db, query], { encoding: 'utf8' }).trim();
}

function seed(db: string) {
  const script = `
CREATE TABLE customers (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  nrc TEXT,
  address TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE prices (
  date TEXT PRIMARY KEY,
  buy INTEGER NOT NULL,
  sell INTEGER NOT NULL
);
CREATE TABLE price_logs (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  buy INTEGER NOT NULL,
  sell INTEGER NOT NULL
);
CREATE TABLE txns (
  id INTEGER PRIMARY KEY,
  voucher_no INTEGER UNIQUE NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  type TEXT CHECK(type IN ('sell','buy')) NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  yway REAL NOT NULL,
  price INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  note TEXT,
  channel TEXT NOT NULL DEFAULT 'loose',
  card_fee INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE txn_cards (
  id INTEGER PRIMARY KEY,
  txn_id INTEGER NOT NULL REFERENCES txns(id) ON DELETE CASCADE,
  denom TEXT NOT NULL,
  qty INTEGER NOT NULL
);
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE stock_adjustments (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  kind TEXT CHECK(kind IN ('in','out')) NOT NULL,
  yway REAL NOT NULL,
  note TEXT
);
CREATE TABLE card_openings (
  denom TEXT PRIMARY KEY,
  qty INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE card_adjustments (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  kind TEXT CHECK(kind IN ('in','out')) NOT NULL,
  denom TEXT NOT NULL,
  qty INTEGER NOT NULL,
  note TEXT
);

INSERT INTO customers (id, name, phone, nrc, address)
  VALUES (1, 'ဦးအောင်', '09-111', '9/သစန(နိုင်)123456', 'သာစည်');
INSERT INTO customers (id, name, phone, nrc, address)
  VALUES (2, 'ဒေါ်မာ', '09-222', '9/မထလ(နိုင်)654321', 'မိတ္ထီလာ');
INSERT INTO prices (date, buy, sell) VALUES ('2026-11-04', 3500000, 3600000);
INSERT INTO price_logs (date, time, buy, sell)
  VALUES ('2026-11-04', '09:00:00', 3500000, 3600000);
INSERT INTO settings (key, value) VALUES ('shop_name', 'ဦးသန့်စင်');
INSERT INTO settings (key, value) VALUES ('card_fee', '30000');
INSERT INTO settings (key, value) VALUES ('opening_stock_yway', '1280');
INSERT INTO stock_adjustments (date, time, kind, yway, note)
  VALUES ('2026-11-04', '08:00:00', 'in', 256, 'အစ');
INSERT INTO card_openings (denom, qty) VALUES ('1k', 10);
INSERT INTO card_openings (denom, qty) VALUES ('5k', 4);
INSERT INTO card_adjustments (date, time, kind, denom, qty, note)
  VALUES ('2026-11-04', '08:30:00', 'in', '1k', 5, 'ထည့်');
INSERT INTO txns (
  id, voucher_no, date, time, type, customer_id, yway, price, amount, note, channel, card_fee
) VALUES (
  1, 1001, '2026-11-04', '10:00:00', 'sell', 1, 128, 3600000, 3630000, 'ကဒ်ရောင်း', 'card', 30000
);
INSERT INTO txns (
  id, voucher_no, date, time, type, customer_id, yway, price, amount, note, channel, card_fee
) VALUES (
  2, 1002, '2026-11-04', '11:00:00', 'buy', 2, 64, 3500000, 1750000, 'အဝယ်', 'loose', 0
);
INSERT INTO txn_cards (txn_id, denom, qty) VALUES (1, '1k', 1);
INSERT INTO txn_cards (txn_id, denom, qty) VALUES (1, '5k', 0);
`;
  execFileSync(SQLITE, [db], { input: script, encoding: 'utf8' });
}

function assertFullData(db: string) {
  expect(sql(db, 'SELECT COUNT(*) FROM customers;')).toBe('2');
  expect(sql(db, 'SELECT COUNT(*) FROM txns;')).toBe('2');
  expect(sql(db, 'SELECT COUNT(*) FROM txn_cards;')).toBe('2');
  expect(sql(db, 'SELECT COUNT(*) FROM prices;')).toBe('1');
  expect(sql(db, 'SELECT COUNT(*) FROM price_logs;')).toBe('1');
  expect(sql(db, 'SELECT COUNT(*) FROM settings;')).toBe('3');
  expect(sql(db, 'SELECT COUNT(*) FROM stock_adjustments;')).toBe('1');
  expect(sql(db, 'SELECT COUNT(*) FROM card_openings;')).toBe('2');
  expect(sql(db, 'SELECT COUNT(*) FROM card_adjustments;')).toBe('1');

  expect(sql(db, 'SELECT name FROM customers WHERE id = 1;')).toBe('ဦးအောင်');
  expect(sql(db, 'SELECT nrc FROM customers WHERE id = 1;')).toBe('9/သစန(နိုင်)123456');
  expect(sql(db, 'SELECT voucher_no FROM txns WHERE id = 1;')).toBe('1001');
  expect(sql(db, "SELECT qty FROM txn_cards WHERE txn_id = 1 AND denom = '1k';")).toBe('1');
  expect(sql(db, "SELECT value FROM settings WHERE key = 'shop_name';")).toBe('ဦးသန့်စင်');
  expect(sql(db, 'SELECT yway FROM stock_adjustments LIMIT 1;')).toBe('256.0');
  expect(sql(db, "SELECT qty FROM card_openings WHERE denom = '1k';")).toBe('10');
}

function listNamed(dir: string, prefix: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((n) => n.startsWith(prefix) && n.endsWith('.db'))
    .sort()
    .reverse();
}

function prune(dir: string, prefix: string, keep: number) {
  for (const name of listNamed(dir, prefix).slice(keep)) {
    fs.unlinkSync(path.join(dir, name));
  }
}

const dirs: string[] = [];

afterEach(() => {
  while (dirs.length) {
    const d = dirs.pop()!;
    fs.rmSync(d, { recursive: true, force: true });
  }
});

describe('backup / recovery — full data', () => {
  it('backup_restore_roundtrip_all_tables', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-bak-'));
    dirs.push(dir);
    const live = path.join(dir, 'gold-ledger.db');
    const bak = path.join(dir, 'backup.db');

    seed(live);
    assertFullData(live);

    // Closed-file snapshot (same bytes AppData restore loads)
    fs.copyFileSync(live, bak);
    assertFullData(bak);

    // Simulate total loss on live
    fs.unlinkSync(live);
    execFileSync(SQLITE, [live], {
      input: 'CREATE TABLE customers (id INTEGER PRIMARY KEY);',
      encoding: 'utf8',
    });
    expect(sql(live, 'SELECT COUNT(*) FROM customers;')).toBe('0');

    // Recover
    fs.copyFileSync(bak, live);
    assertFullData(live);
  });

  it('prune_keeps_newest_n', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-prune-'));
    dirs.push(dir);
    for (const name of [
      'txn-20260101-010101.db',
      'txn-20260102-010101.db',
      'txn-20260103-010101.db',
    ]) {
      fs.writeFileSync(path.join(dir, name), 'x');
    }
    prune(dir, 'txn-', 2);
    const left = listNamed(dir, 'txn-');
    expect(left).toEqual(['txn-20260103-010101.db', 'txn-20260102-010101.db']);
  });

  it('validate_sqlite_rejects_garbage', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-val-'));
    dirs.push(dir);
    const bad = path.join(dir, 'bad.db');
    fs.writeFileSync(bad, 'not a database');
    const header = fs.readFileSync(bad).subarray(0, 15).toString('utf8');
    expect(header).not.toBe('SQLite format 3');

    const incomplete = path.join(dir, 'partial.db');
    execFileSync(SQLITE, [incomplete], {
      input: 'CREATE TABLE customers (id INTEGER PRIMARY KEY);',
      encoding: 'utf8',
    });
    const tables = sql(
      incomplete,
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;",
    );
    expect(tables).toBe('customers');
    expect(tables.includes('txns')).toBe(false);
  });
});
