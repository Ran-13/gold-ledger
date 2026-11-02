import Database from '@tauri-apps/plugin-sql';
import { appDataDir, join } from '@tauri-apps/api/path';
import { MIGRATIONS } from './migrations';
import type { Customer, Price, Settings, Txn, TxnType } from './types';
import { amount, isoDate, isoTime, RoundTo, toYway } from '../lib/units';

let db: Database | null = null;
let dbPathAbs = '';

export function getDbPath(): string {
  return dbPathAbs;
}

export async function initDb(): Promise<Database> {
  if (db) return db;
  const dir = await appDataDir();
  dbPathAbs = await join(dir, 'gold-ledger.db');
  // Absolute path for sqlite via tauri-plugin-sql
  db = await Database.load(`sqlite:${dbPathAbs}`);
  await runMigrations(db);
  if (import.meta.env.SEED === '1' || import.meta.env.VITE_SEED === '1') {
    await seedIfEmpty(db);
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}

export async function reopenDb(): Promise<Database> {
  await closeDb();
  return initDb();
}

async function runMigrations(database: Database): Promise<void> {
  await database.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const applied = await database.select<{ version: number }[]>(
    'SELECT version FROM _migrations ORDER BY version',
  );
  const have = new Set(applied.map((r) => r.version));
  for (const m of MIGRATIONS) {
    if (have.has(m.version)) continue;
    await database.execute('BEGIN');
    try {
      for (const stmt of m.sql.split(';').map((s) => s.trim()).filter(Boolean)) {
        await database.execute(stmt);
      }
      await database.execute('INSERT INTO _migrations (version) VALUES ($1)', [m.version]);
      await database.execute('COMMIT');
    } catch (e) {
      await database.execute('ROLLBACK');
      throw e;
    }
  }
}

async function seedIfEmpty(database: Database): Promise<void> {
  const rows = await database.select<{ c: number }[]>('SELECT COUNT(*) as c FROM txns');
  if ((rows[0]?.c ?? 0) > 0) return;
  // Minimal empty-safe seed: prices only if SEED — full demo seed elsewhere if needed
  const { makeSeed } = await import('./seed');
  await makeSeed(database);
}

export async function getSettings(): Promise<Settings> {
  const database = await initDb();
  const rows = await database.select<{ key: string; value: string }[]>(
    'SELECT key, value FROM settings',
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const round = Number(map.round_to ?? 100);
  return {
    opening_stock_yway: Number(map.opening_stock_yway ?? 0),
    digits: (map.digits === 'myanmar' ? 'myanmar' : 'latin') as Settings['digits'],
    round_to: ([1, 100, 1000].includes(round) ? round : 100) as RoundTo,
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await initDb();
  await database.execute(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function listCustomers(): Promise<Customer[]> {
  const database = await initDb();
  return database.select<Customer[]>(
    'SELECT id, name, phone, address, created_at FROM customers ORDER BY name COLLATE NOCASE',
  );
}

export async function createCustomer(
  name: string,
  phone = '',
  address = '',
): Promise<number> {
  const database = await initDb();
  const res = await database.execute(
    'INSERT INTO customers (name, phone, address) VALUES ($1, $2, $3)',
    [name, phone || null, address || null],
  );
  return res.lastInsertId as number;
}

export async function listPrices(): Promise<Price[]> {
  const database = await initDb();
  return database.select<Price[]>(
    'SELECT date, buy, sell FROM prices ORDER BY date ASC',
  );
}

export async function upsertPrice(date: string, buy: number, sell: number): Promise<void> {
  const database = await initDb();
  await database.execute(
    `INSERT INTO prices (date, buy, sell) VALUES ($1, $2, $3)
     ON CONFLICT(date) DO UPDATE SET buy = excluded.buy, sell = excluded.sell`,
    [date, buy, sell],
  );
}

export async function getLatestPrice(): Promise<Price | null> {
  const database = await initDb();
  const rows = await database.select<Price[]>(
    'SELECT date, buy, sell FROM prices ORDER BY date DESC LIMIT 1',
  );
  return rows[0] ?? null;
}

export async function getPriceOn(date: string): Promise<Price | null> {
  const database = await initDb();
  const rows = await database.select<Price[]>(
    'SELECT date, buy, sell FROM prices WHERE date = $1',
    [date],
  );
  return rows[0] ?? null;
}

export async function listTxns(): Promise<Txn[]> {
  const database = await initDb();
  return database.select<Txn[]>(
    `SELECT id, voucher_no, date, time, type, customer_id, yway, price, amount, note
     FROM txns ORDER BY voucher_no DESC`,
  );
}

export async function listTxnsAsc(): Promise<Txn[]> {
  const database = await initDb();
  return database.select<Txn[]>(
    `SELECT id, voucher_no, date, time, type, customer_id, yway, price, amount, note
     FROM txns ORDER BY date ASC, time ASC, voucher_no ASC`,
  );
}

export async function getTxn(id: number): Promise<Txn | null> {
  const database = await initDb();
  const rows = await database.select<Txn[]>(
    `SELECT id, voucher_no, date, time, type, customer_id, yway, price, amount, note
     FROM txns WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function nextVoucherNo(): Promise<number> {
  const database = await initDb();
  const rows = await database.select<{ m: number | null }[]>(
    'SELECT MAX(voucher_no) as m FROM txns',
  );
  return (rows[0]?.m ?? 0) + 1;
}

export interface SaveTxnInput {
  type: TxnType;
  customerId: number | null;
  newCustomer?: { name: string; phone: string };
  k: number;
  p: number;
  y: number;
  price: number;
  note: string;
  roundTo: RoundTo;
}

export async function saveTxn(input: SaveTxnInput): Promise<number> {
  const database = await initDb();
  const yway = Math.round(toYway(input.k, input.p, input.y) * 1000) / 1000;
  if (yway <= 0) throw new Error('အလေးချိန် ထည့်ပါ');
  const amt = amount(yway, input.price, input.roundTo);
  const now = new Date();
  const date = isoDate(now);
  const time = isoTime(now);

  await database.execute('BEGIN');
  try {
    let customerId = input.customerId;
    if (input.newCustomer) {
      const res = await database.execute(
        'INSERT INTO customers (name, phone, address) VALUES ($1, $2, $3)',
        [input.newCustomer.name, input.newCustomer.phone || null, null],
      );
      customerId = res.lastInsertId as number;
    }
    const no = await nextVoucherNoInTx(database);
    const res = await database.execute(
      `INSERT INTO txns (voucher_no, date, time, type, customer_id, yway, price, amount, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [no, date, time, input.type, customerId, yway, input.price, amt, input.note || null],
    );
    await database.execute('COMMIT');
    return res.lastInsertId as number;
  } catch (e) {
    await database.execute('ROLLBACK');
    throw e;
  }
}

async function nextVoucherNoInTx(database: Database): Promise<number> {
  const rows = await database.select<{ m: number | null }[]>(
    'SELECT MAX(voucher_no) as m FROM txns',
  );
  return (rows[0]?.m ?? 0) + 1;
}

export async function deleteTxn(id: number): Promise<void> {
  const database = await initDb();
  await database.execute('DELETE FROM txns WHERE id = $1', [id]);
}

export async function sumsByType(): Promise<{ buyYway: number; sellYway: number }> {
  const database = await initDb();
  const rows = await database.select<{ type: string; y: number }[]>(
    `SELECT type, COALESCE(SUM(yway), 0) as y FROM txns GROUP BY type`,
  );
  let buyYway = 0;
  let sellYway = 0;
  for (const r of rows) {
    if (r.type === 'buy') buyYway = r.y;
    if (r.type === 'sell') sellYway = r.y;
  }
  return { buyYway, sellYway };
}
