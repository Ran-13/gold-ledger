import { MIGRATIONS } from './migrations';
import type {
  Customer,
  Price,
  SaveTxnInput,
  Settings,
  StockAdjKind,
  StockAdjustment,
  Txn,
} from './types';
import {
  amount,
  assertStockEnough,
  assertStockNonNegative,
  isoDate,
  isoTime,
  RoundTo,
  stockFromParts,
  toYway,
} from '../lib/units';
import { isTauri } from './env';
import * as browser from './browserStore';

export type { SaveTxnInput };

type SqlDb = {
  execute: (query: string, bindValues?: unknown[]) => Promise<{ lastInsertId?: number; rowsAffected: number }>;
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T>;
  close: () => Promise<void>;
};

let db: SqlDb | null = null;
let dbPathAbs = '';
let mode: 'tauri' | 'browser' | null = null;

export function getDbPath(): string {
  if (mode === 'browser') return browser.browserGetDbPath();
  return dbPathAbs;
}

export async function initDb(): Promise<void> {
  if (mode === 'browser') {
    await browser.browserInit();
    return;
  }
  if (db) return;

  if (!isTauri()) {
    mode = 'browser';
    await browser.browserInit();
    return;
  }

  mode = 'tauri';
  const { default: Database } = await import('@tauri-apps/plugin-sql');
  const { appDataDir, join } = await import('@tauri-apps/api/path');
  const dir = await appDataDir();
  dbPathAbs = await join(dir, 'gold-ledger.db');
  db = (await Database.load(`sqlite:${dbPathAbs}`)) as unknown as SqlDb;
  await runMigrations(db);
  if (import.meta.env.SEED === '1' || import.meta.env.VITE_SEED === '1') {
    await seedIfEmpty(db);
  }
}

export async function closeDb(): Promise<void> {
  if (mode === 'browser') {
    await browser.browserClose();
    return;
  }
  if (db) {
    await db.close();
    db = null;
  }
}

export async function reopenDb(): Promise<void> {
  await closeDb();
  mode = null;
  await initDb();
}

async function runMigrations(database: SqlDb): Promise<void> {
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

async function seedIfEmpty(database: SqlDb): Promise<void> {
  const rows = await database.select<{ c: number }[]>('SELECT COUNT(*) as c FROM txns');
  if ((rows[0]?.c ?? 0) > 0) return;
  const { makeSeed } = await import('./seed');
  await makeSeed(database as never);
}

export async function getSettings(): Promise<Settings> {
  await initDb();
  if (mode === 'browser') return browser.browserGetSettings();
  const rows = await db!.select<{ key: string; value: string }[]>(
    'SELECT key, value FROM settings',
  );
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const round = Number(map.round_to ?? 100);
  return {
    opening_stock_yway: Number(map.opening_stock_yway ?? 0),
    digits: (map.digits === 'myanmar' ? 'myanmar' : 'latin') as Settings['digits'],
    round_to: ([1, 100, 1000].includes(round) ? round : 100) as RoundTo,
    shop_name: map.shop_name?.trim() || 'ဦးသန့်စင်',
    shop_mark: map.shop_mark?.trim() || 'သ',
    shop_tagline: map.shop_tagline?.trim() || 'အခေါက်ရွှေ အရောင်းအဝယ်',
  };
}

export async function getStockYway(): Promise<number> {
  const [settings, txns, adjs] = await Promise.all([
    getSettings(),
    listTxns(),
    listStockAdjustments(),
  ]);
  return stockFromParts(settings.opening_stock_yway, txns, adjs);
}

export async function setSetting(key: string, value: string): Promise<void> {
  await initDb();
  if (key === 'opening_stock_yway') {
    const opening = Number(value);
    const [settings, txns, adjs] = await Promise.all([
      getSettings(),
      listTxns(),
      listStockAdjustments(),
    ]);
    assertStockNonNegative(
      stockFromParts(opening, txns, adjs),
      settings.digits,
      'အစလက်ကျန် လျှော့လို့ မရပါ · လက်ကျန် အနှုတ် ဖြစ်မည်',
    );
  }
  if (mode === 'browser') return browser.browserSetSetting(key, value);
  await db!.execute(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
}

export async function listCustomers(): Promise<Customer[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListCustomers();
  return db!.select<Customer[]>(
    'SELECT id, name, phone, nrc, address, created_at FROM customers ORDER BY name COLLATE NOCASE',
  );
}

/** Phone, address, and NRC are required for every customer. */
export function assertCustomerDetails(phone: string, address: string, nrc: string): void {
  if (!phone.trim()) throw new Error('ဖုန်းနံပါတ် ထည့်ပါ');
  if (!address.trim()) throw new Error('နေရပ်လိပ်စာ ထည့်ပါ');
  if (!nrc.trim()) throw new Error('မှတ်ပုံတင် ထည့်ပါ');
}

export async function createCustomer(
  name: string,
  phone = '',
  address = '',
  nrc = '',
): Promise<number> {
  await initDb();
  if (!name.trim()) throw new Error('ဝယ်သူအမည် ထည့်ပါ');
  assertCustomerDetails(phone, address, nrc);
  if (mode === 'browser') return browser.browserCreateCustomer(name, phone, address, nrc);
  const res = await db!.execute(
    'INSERT INTO customers (name, phone, nrc, address) VALUES ($1, $2, $3, $4)',
    [name.trim(), phone.trim(), nrc.trim(), address.trim()],
  );
  return res.lastInsertId as number;
}

export async function listPrices(): Promise<Price[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListPrices();
  return db!.select<Price[]>(
    'SELECT id, date, time, buy, sell FROM price_logs ORDER BY date ASC, time ASC, id ASC',
  );
}

/** Always append a new price-change record with current time (skip if unchanged). */
export async function upsertPrice(date: string, buy: number, sell: number): Promise<void> {
  await initDb();
  if (mode === 'browser') return browser.browserUpsertPrice(date, buy, sell);

  const latest = await getLatestPrice();
  if (latest && latest.buy === buy && latest.sell === sell) return;

  const now = new Date();
  const d = date || isoDate(now);
  const t = isoTime(now);
  await db!.execute(
    'INSERT INTO price_logs (date, time, buy, sell) VALUES ($1, $2, $3, $4)',
    [d, t, buy, sell],
  );
  // keep legacy prices table in sync for any leftover readers
  await db!.execute(
    `INSERT INTO prices (date, buy, sell) VALUES ($1, $2, $3)
     ON CONFLICT(date) DO UPDATE SET buy = excluded.buy, sell = excluded.sell`,
    [d, buy, sell],
  );
}

export async function getLatestPrice(): Promise<Price | null> {
  await initDb();
  if (mode === 'browser') {
    const list = await browser.browserListPrices();
    return list.length ? list[list.length - 1]! : null;
  }
  const rows = await db!.select<Price[]>(
    'SELECT id, date, time, buy, sell FROM price_logs ORDER BY date DESC, time DESC, id DESC LIMIT 1',
  );
  return rows[0] ?? null;
}

export async function getPriceOn(date: string): Promise<Price | null> {
  await initDb();
  if (mode === 'browser') {
    const list = await browser.browserListPrices();
    const onOrBefore = list.filter((p) => p.date <= date);
    return onOrBefore.length ? onOrBefore[onOrBefore.length - 1]! : null;
  }
  const rows = await db!.select<Price[]>(
    `SELECT id, date, time, buy, sell FROM price_logs
     WHERE date <= $1
     ORDER BY date DESC, time DESC, id DESC LIMIT 1`,
    [date],
  );
  return rows[0] ?? null;
}

export async function listTxns(): Promise<Txn[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListTxns();
  return db!.select<Txn[]>(
    `SELECT id, voucher_no, date, time, type, customer_id, yway, price, amount, note
     FROM txns ORDER BY voucher_no DESC`,
  );
}

export async function listTxnsAsc(): Promise<Txn[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListTxnsAsc();
  return db!.select<Txn[]>(
    `SELECT id, voucher_no, date, time, type, customer_id, yway, price, amount, note
     FROM txns ORDER BY date ASC, time ASC, voucher_no ASC`,
  );
}

export async function getTxn(id: number): Promise<Txn | null> {
  await initDb();
  if (mode === 'browser') return browser.browserGetTxn(id);
  const rows = await db!.select<Txn[]>(
    `SELECT id, voucher_no, date, time, type, customer_id, yway, price, amount, note
     FROM txns WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function nextVoucherNo(): Promise<number> {
  const txns = await listTxns();
  return txns.reduce((m, t) => Math.max(m, t.voucher_no), 0) + 1;
}

export async function saveTxn(input: SaveTxnInput): Promise<number> {
  await initDb();
  const yway = Math.round(toYway(input.k, input.p, input.y) * 1000) / 1000;
  if (yway <= 0) throw new Error('ရွှေချိန် ထည့်ပါ');
  if (input.newCustomer) {
    if (!input.newCustomer.name.trim()) throw new Error('ဝယ်သူအမည် ထည့်ပါ');
    assertCustomerDetails(
      input.newCustomer.phone,
      input.newCustomer.address,
      input.newCustomer.nrc,
    );
  }
  if (input.type === 'sell') {
    const [avail, settings] = await Promise.all([getStockYway(), getSettings()]);
    assertStockEnough(avail, yway, settings.digits);
  }
  if (mode === 'browser') return browser.browserSaveTxn(input);

  const database = db!;
  const amt = amount(yway, input.price, input.roundTo);
  const now = new Date();
  const date = isoDate(now);
  const time = isoTime(now);

  await database.execute('BEGIN');
  try {
    let customerId = input.customerId;
    if (input.newCustomer) {
      assertCustomerDetails(
        input.newCustomer.phone,
        input.newCustomer.address,
        input.newCustomer.nrc,
      );
      const res = await database.execute(
        'INSERT INTO customers (name, phone, nrc, address) VALUES ($1, $2, $3, $4)',
        [
          input.newCustomer.name.trim(),
          input.newCustomer.phone.trim(),
          input.newCustomer.nrc.trim(),
          input.newCustomer.address.trim(),
        ],
      );
      customerId = res.lastInsertId as number;
    }
    const rows = await database.select<{ m: number | null }[]>(
      'SELECT MAX(voucher_no) as m FROM txns',
    );
    const no = (rows[0]?.m ?? 0) + 1;
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

export async function deleteTxn(id: number): Promise<void> {
  await initDb();
  const txn = await getTxn(id);
  if (txn?.type === 'buy') {
    const [avail, settings] = await Promise.all([getStockYway(), getSettings()]);
    assertStockEnough(avail, txn.yway, settings.digits);
  }
  if (mode === 'browser') return browser.browserDeleteTxn(id);
  await db!.execute('DELETE FROM txns WHERE id = $1', [id]);
}

export async function sumsByType(): Promise<{ buyYway: number; sellYway: number }> {
  await initDb();
  if (mode === 'browser') return browser.browserSumsByType();
  const rows = await db!.select<{ type: string; y: number }[]>(
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

export async function listStockAdjustments(): Promise<StockAdjustment[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListStockAdjustments();
  return db!.select<StockAdjustment[]>(
    `SELECT id, date, time, kind, yway, note
     FROM stock_adjustments
     ORDER BY date ASC, time ASC, id ASC`,
  );
}

export async function createStockAdjustment(
  kind: StockAdjKind,
  yway: number,
  note = '',
): Promise<number> {
  await initDb();
  if (yway <= 0) throw new Error('ရွှေချိန် ထည့်ပါ');
  if (kind === 'out') {
    const [avail, settings] = await Promise.all([getStockYway(), getSettings()]);
    assertStockEnough(avail, yway, settings.digits);
  }
  if (mode === 'browser') return browser.browserCreateStockAdjustment(kind, yway, note);
  const now = new Date();
  const res = await db!.execute(
    `INSERT INTO stock_adjustments (date, time, kind, yway, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [isoDate(now), isoTime(now), kind, yway, note.trim() || null],
  );
  return res.lastInsertId as number;
}

export async function deleteStockAdjustment(id: number): Promise<void> {
  await initDb();
  const adj = (await listStockAdjustments()).find((a) => a.id === id);
  if (adj?.kind === 'in') {
    const [avail, settings] = await Promise.all([getStockYway(), getSettings()]);
    assertStockEnough(avail, adj.yway, settings.digits);
  }
  if (mode === 'browser') return browser.browserDeleteStockAdjustment(id);
  await db!.execute('DELETE FROM stock_adjustments WHERE id = $1', [id]);
}
