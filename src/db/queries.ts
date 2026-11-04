import { MIGRATIONS } from './migrations';
import type {
  CardAdjustment,
  CardOpening,
  Customer,
  Price,
  SaveTxnInput,
  Settings,
  StockAdjKind,
  StockAdjustment,
  Txn,
  TxnCard,
  TxnChannel,
} from './types';
import {
  assertCardStockEnough,
  cardTxnAmount,
  cardsTotalYway,
  computeCardStock,
  DEFAULT_CARD_FEE,
  normalizeCardLines,
  type CardDenom,
} from '../lib/cards';
import { runAutoBackup, scheduleDbBackup } from '../lib/autoBackup';
import { isNrcComplete, normalizeNrcKey } from '../lib/nrc';
import {
  amount,
  assertStockEnough,
  assertStockNonNegative,
  isoDate,
  isoTime,
  stockFromParts,
  toYway,
} from '../lib/units';
import { isTauri } from './env';
import * as browser from './browserStore';

export type { SaveTxnInput };

const TXN_COLS =
  'id, voucher_no, date, time, type, customer_id, yway, price, amount, note, channel, card_fee';

function normalizeTxn(t: Txn): Txn {
  return {
    ...t,
    channel: (t.channel === 'card' ? 'card' : 'loose') as TxnChannel,
    card_fee: Number(t.card_fee ?? 0),
  };
}

type SqlDb = {
  execute: (query: string, bindValues?: unknown[]) => Promise<{ lastInsertId?: number; rowsAffected: number }>;
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T>;
  close: () => Promise<void>;
};

let db: SqlDb | null = null;
let dbPathAbs = '';
let mode: 'tauri' | 'browser' | null = null;
/** Prevents parallel initDb() from nesting SQLite transactions (Promise.all on refresh). */
let initPromise: Promise<void> | null = null;

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
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
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
  })();

  try {
    await initPromise;
  } catch (e) {
    initPromise = null;
    db = null;
    mode = null;
    throw e;
  }
}

export async function closeDb(): Promise<void> {
  if (mode === 'browser') {
    await browser.browserClose();
    initPromise = null;
    return;
  }
  if (db) {
    await db.close();
    db = null;
  }
  initPromise = null;
}

export async function reopenDb(): Promise<void> {
  await closeDb();
  mode = null;
  initPromise = null;
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
    // No explicit BEGIN — tauri-plugin-sql/sqlx can already be in a txn per execute,
    // and nested BEGIN causes: "cannot start a transaction within a transaction"
    try {
      for (const stmt of m.sql.split(';').map((s) => s.trim()).filter(Boolean)) {
        await database.execute(stmt);
      }
      await database.execute('INSERT INTO _migrations (version) VALUES ($1)', [m.version]);
    } catch (e) {
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
  const fee = Number(map.card_fee ?? DEFAULT_CARD_FEE);
  return {
    opening_stock_yway: Number(map.opening_stock_yway ?? 0),
    digits: (map.digits === 'myanmar' ? 'myanmar' : 'latin') as Settings['digits'],
    shop_name: map.shop_name?.trim() || 'ဦးသန့်စင်',
    shop_mark: map.shop_mark?.trim() || 'သ',
    shop_tagline: map.shop_tagline?.trim() || 'အခေါက်ရွှေ အရောင်းအဝယ်',
    card_fee: Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : DEFAULT_CARD_FEE,
  };
}

/** Loose-gold stock only (excludes card-channel txns). */
export async function getLooseStockYway(): Promise<number> {
  const [settings, txns, adjs] = await Promise.all([
    getSettings(),
    listTxns(),
    listStockAdjustments(),
  ]);
  const loose = txns.filter((t) => t.channel !== 'card');
  return stockFromParts(settings.opening_stock_yway, loose, adjs);
}

/** @deprecated use getLooseStockYway — kept for call-site compatibility */
export async function getStockYway(): Promise<number> {
  return getLooseStockYway();
}

export async function getCardStockMap(): Promise<Record<CardDenom, number>> {
  const [openings, adjs, txnCards, txns] = await Promise.all([
    listCardOpenings(),
    listCardAdjustments(),
    listAllTxnCards(),
    listTxns(),
  ]);
  const typeById = new Map(txns.map((t) => [t.id, t.type]));
  return computeCardStock({
    openings,
    adjustments: adjs,
    txnCards: txnCards.map((c) => ({
      type: typeById.get(c.txn_id) ?? 'sell',
      denom: c.denom,
      qty: c.qty,
    })),
  });
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
    const loose = txns.filter((t) => t.channel !== 'card');
    assertStockNonNegative(
      stockFromParts(opening, loose, adjs),
      settings.digits,
      'အစလက်ကျန် လျှော့လို့ မရပါ · လက်ကျန် အနှုတ် ဖြစ်မည်',
    );
  }
  if (mode === 'browser') return browser.browserSetSetting(key, value);
  await db!.execute(
    'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, value],
  );
  scheduleDbBackup();
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
  if (!isNrcComplete(nrc)) throw new Error('မှတ်ပုံတင် ပြည့်စုံရွေးပါ (နံပါတ် ၆ လုံး)');
}

async function assertNrcUnique(nrc: string): Promise<void> {
  const key = normalizeNrcKey(nrc);
  if (mode === 'browser') {
    const hit = (await browser.browserListCustomers()).find(
      (c) => normalizeNrcKey(c.nrc) === key,
    );
    if (hit) throw new Error(`မှတ်ပုံတင်တူ ရှိပြီး — ${hit.name}`);
    return;
  }
  const rows = await db!.select<{ id: number; name: string }[]>(
    "SELECT id, name FROM customers WHERE REPLACE(TRIM(COALESCE(nrc, '')), ' ', '') = $1 LIMIT 1",
    [key],
  );
  if (rows[0]) throw new Error(`မှတ်ပုံတင်တူ ရှိပြီး — ${rows[0].name}`);
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
  await assertNrcUnique(nrc);
  if (mode === 'browser') return browser.browserCreateCustomer(name, phone, address, nrc);
  const res = await db!.execute(
    'INSERT INTO customers (name, phone, nrc, address) VALUES ($1, $2, $3, $4)',
    [name.trim(), phone.trim(), nrc.trim(), address.trim()],
  );
  scheduleDbBackup();
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
  scheduleDbBackup();
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
  const rows = await db!.select<Txn[]>(
    `SELECT ${TXN_COLS} FROM txns ORDER BY voucher_no DESC`,
  );
  return rows.map(normalizeTxn);
}

export async function listTxnsAsc(): Promise<Txn[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListTxnsAsc();
  const rows = await db!.select<Txn[]>(
    `SELECT ${TXN_COLS} FROM txns ORDER BY date ASC, time ASC, voucher_no ASC`,
  );
  return rows.map(normalizeTxn);
}

export async function getTxn(id: number): Promise<Txn | null> {
  await initDb();
  if (mode === 'browser') return browser.browserGetTxn(id);
  const rows = await db!.select<Txn[]>(
    `SELECT ${TXN_COLS} FROM txns WHERE id = $1`,
    [id],
  );
  return rows[0] ? normalizeTxn(rows[0]) : null;
}

export async function nextVoucherNo(): Promise<number> {
  const txns = await listTxns();
  return txns.reduce((m, t) => Math.max(m, t.voucher_no), 0) + 1;
}

export async function saveTxn(input: SaveTxnInput): Promise<number> {
  await initDb();
  const channel: TxnChannel = input.channel === 'card' ? 'card' : 'loose';
  const settings = await getSettings();
  const feePerCard =
    input.cardFee != null && Number.isFinite(input.cardFee)
      ? Math.max(0, Math.round(input.cardFee))
      : settings.card_fee;

  let yway: number;
  let lines: Array<{ denom: CardDenom; qty: number }> = [];
  let amt: number;
  let cardFeeStored = 0;

  if (channel === 'card') {
    lines = normalizeCardLines(input.cards ?? []);
    if (!lines.length) throw new Error('ကဒ် အရေအတွက် ထည့်ပါ');
    yway = cardsTotalYway(lines);
    const parts = cardTxnAmount(input.type, yway, input.price, lines, feePerCard);
    if (parts.total < 0) {
      throw new Error('ကဒ်ဖိုးသည် ကျသင့်ငွေထက် များနေသည် · ဝယ်ငွေ အနှုတ် ဖြစ်မည်');
    }
    amt = parts.total;
    cardFeeStored = feePerCard;
    if (input.type === 'sell') {
      const stock = await getCardStockMap();
      assertCardStockEnough(stock, lines, settings.digits);
    }
  } else {
    yway = Math.round(toYway(input.k, input.p, input.y) * 1000) / 1000;
    if (yway <= 0) throw new Error('ရွှေချိန် ထည့်ပါ');
    amt = amount(yway, input.price);
    if (input.type === 'sell') {
      const avail = await getLooseStockYway();
      assertStockEnough(avail, yway, settings.digits);
    }
  }

  if (input.newCustomer) {
    if (!input.newCustomer.name.trim()) throw new Error('ဝယ်သူအမည် ထည့်ပါ');
    assertCustomerDetails(
      input.newCustomer.phone,
      input.newCustomer.address,
      input.newCustomer.nrc,
    );
    await assertNrcUnique(input.newCustomer.nrc);
  } else if (input.customerId == null) {
    throw new Error('ဝယ်သူ ရွေးပါ သို့မဟုတ် အသစ်ထည့်ပါ');
  }

  if (mode === 'browser') {
    const id = await browser.browserSaveTxn({ ...input, channel, cardFee: feePerCard });
    // browser mode has no file DB — skip auto backup
    return id;
  }

  const database = db!;
  const now = new Date();
  const date = isoDate(now);
  const time = isoTime(now);

  // Avoid explicit BEGIN/COMMIT — plugin-sql can nest transactions and error
  let customerId = input.customerId;
  if (input.newCustomer) {
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
    `INSERT INTO txns (voucher_no, date, time, type, customer_id, yway, price, amount, note, channel, card_fee)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      no,
      date,
      time,
      input.type,
      customerId,
      yway,
      input.price,
      amt,
      input.note || null,
      channel,
      cardFeeStored,
    ],
  );
  const txnId = res.lastInsertId as number;
  if (channel === 'card') {
    for (const line of lines) {
      await database.execute(
        'INSERT INTO txn_cards (txn_id, denom, qty) VALUES ($1, $2, $3)',
        [txnId, line.denom, line.qty],
      );
    }
  }
  scheduleDbBackup();
  return txnId;
}

export async function deleteTxn(id: number): Promise<void> {
  await initDb();
  const txn = await getTxn(id);
  if (!txn) return;
  const settings = await getSettings();

  if (txn.channel === 'card') {
    if (txn.type === 'buy') {
      const lines = await listTxnCards(id);
      const stock = await getCardStockMap();
      assertCardStockEnough(
        stock,
        normalizeCardLines(lines),
        settings.digits,
      );
    }
  } else if (txn.type === 'buy') {
    const avail = await getLooseStockYway();
    assertStockEnough(avail, txn.yway, settings.digits);
  }

  if (mode === 'browser') return browser.browserDeleteTxn(id);
  // Snapshot full DB (incl. this voucher) before delete
  await runAutoBackup('txn');
  await db!.execute('DELETE FROM txn_cards WHERE txn_id = $1', [id]);
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
    const [avail, settings] = await Promise.all([getLooseStockYway(), getSettings()]);
    assertStockEnough(avail, yway, settings.digits);
  }
  if (mode === 'browser') return browser.browserCreateStockAdjustment(kind, yway, note);
  const now = new Date();
  const res = await db!.execute(
    `INSERT INTO stock_adjustments (date, time, kind, yway, note)
     VALUES ($1, $2, $3, $4, $5)`,
    [isoDate(now), isoTime(now), kind, yway, note.trim() || null],
  );
  scheduleDbBackup();
  return res.lastInsertId as number;
}

export async function deleteStockAdjustment(id: number): Promise<void> {
  await initDb();
  const adj = (await listStockAdjustments()).find((a) => a.id === id);
  if (adj?.kind === 'in') {
    const [avail, settings] = await Promise.all([getLooseStockYway(), getSettings()]);
    assertStockEnough(avail, adj.yway, settings.digits);
  }
  if (mode === 'browser') return browser.browserDeleteStockAdjustment(id);
  await runAutoBackup('txn');
  await db!.execute('DELETE FROM stock_adjustments WHERE id = $1', [id]);
}

export async function listCardOpenings(): Promise<CardOpening[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListCardOpenings();
  return db!.select<CardOpening[]>('SELECT denom, qty FROM card_openings ORDER BY denom');
}

export async function setCardOpening(denom: string, qty: number): Promise<void> {
  await initDb();
  const q = Math.max(0, Math.floor(qty) || 0);
  if (mode === 'browser') return browser.browserSetCardOpening(denom, q);
  await db!.execute(
    `INSERT INTO card_openings (denom, qty) VALUES ($1, $2)
     ON CONFLICT(denom) DO UPDATE SET qty = excluded.qty`,
    [denom, q],
  );
  scheduleDbBackup();
}

export async function setCardOpenings(map: Record<string, number>): Promise<void> {
  for (const [denom, qty] of Object.entries(map)) {
    await setCardOpening(denom, qty);
  }
  // setCardOpening already schedules; one more debounce coalesce is fine
}

export async function listCardAdjustments(): Promise<CardAdjustment[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListCardAdjustments();
  return db!.select<CardAdjustment[]>(
    `SELECT id, date, time, kind, denom, qty, note
     FROM card_adjustments
     ORDER BY date ASC, time ASC, id ASC`,
  );
}

export async function createCardAdjustment(
  kind: StockAdjKind,
  denom: string,
  qty: number,
  note = '',
): Promise<number> {
  await initDb();
  const q = Math.floor(qty) || 0;
  if (q <= 0) throw new Error('ကဒ် အရေအတွက် ထည့်ပါ');
  if (kind === 'out') {
    const [stock, settings] = await Promise.all([getCardStockMap(), getSettings()]);
    assertCardStockEnough(
      stock,
      normalizeCardLines([{ denom, qty: q }]),
      settings.digits,
    );
  }
  if (mode === 'browser') return browser.browserCreateCardAdjustment(kind, denom, q, note);
  const now = new Date();
  const res = await db!.execute(
    `INSERT INTO card_adjustments (date, time, kind, denom, qty, note)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [isoDate(now), isoTime(now), kind, denom, q, note.trim() || null],
  );
  scheduleDbBackup();
  return res.lastInsertId as number;
}

export async function deleteCardAdjustment(id: number): Promise<void> {
  await initDb();
  const adj = (await listCardAdjustments()).find((a) => a.id === id);
  if (adj?.kind === 'in') {
    const [stock, settings] = await Promise.all([getCardStockMap(), getSettings()]);
    assertCardStockEnough(
      stock,
      normalizeCardLines([{ denom: adj.denom, qty: adj.qty }]),
      settings.digits,
    );
  }
  if (mode === 'browser') return browser.browserDeleteCardAdjustment(id);
  await runAutoBackup('txn');
  await db!.execute('DELETE FROM card_adjustments WHERE id = $1', [id]);
}

export async function listTxnCards(txnId: number): Promise<TxnCard[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListTxnCards(txnId);
  return db!.select<TxnCard[]>(
    'SELECT id, txn_id, denom, qty FROM txn_cards WHERE txn_id = $1 ORDER BY id',
    [txnId],
  );
}

export async function listAllTxnCards(): Promise<TxnCard[]> {
  await initDb();
  if (mode === 'browser') return browser.browserListAllTxnCards();
  return db!.select<TxnCard[]>('SELECT id, txn_id, denom, qty FROM txn_cards ORDER BY id');
}
