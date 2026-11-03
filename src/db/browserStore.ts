import type {
  Customer,
  Price,
  SaveTxnInput,
  Settings,
  StockAdjKind,
  StockAdjustment,
  Txn,
  TxnType,
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

const KEY = 'uthantsin-gold-browser-v1';

interface BrowserData {
  customers: Customer[];
  prices: Price[];
  txns: Txn[];
  stockAdjustments: StockAdjustment[];
  settings: Record<string, string>;
  nextCustomerId: number;
  nextTxnId: number;
  nextPriceId: number;
  nextStockAdjId: number;
}

function empty(): BrowserData {
  return {
    customers: [],
    prices: [],
    txns: [],
    stockAdjustments: [],
    settings: {
      opening_stock_yway: '0',
      digits: 'latin',
      round_to: '100',
      shop_name: 'ဦးသန့်စင်',
      shop_mark: 'သ',
      shop_tagline: 'အခေါက်ရွှေ အရောင်းအဝယ်',
    },
    nextCustomerId: 1,
    nextTxnId: 1,
    nextPriceId: 1,
    nextStockAdjId: 1,
  };
}

function normalizePrices(d: BrowserData): void {
  if (!d.nextPriceId) d.nextPriceId = 1;
  d.prices = (d.prices || []).map((p) => {
    const row = p as Price & { id?: number; time?: string };
    const id = row.id ?? d.nextPriceId++;
    if (id >= d.nextPriceId) d.nextPriceId = id + 1;
    return {
      id,
      date: row.date,
      time: row.time || '00:00:00',
      buy: row.buy,
      sell: row.sell,
    };
  });
}

let data: BrowserData | null = null;

function load(): BrowserData {
  if (data) return data;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      data = JSON.parse(raw) as BrowserData;
      if (!data.stockAdjustments) data.stockAdjustments = [];
      if (!data.nextStockAdjId) data.nextStockAdjId = 1;
      normalizePrices(data);
      return data;
    }
  } catch {
    /* ignore */
  }
  data = empty();
  persist();
  return data;
}

function persist(): void {
  if (!data) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function browserGetDbPath(): string {
  return 'localStorage:' + KEY;
}

export async function browserInit(): Promise<void> {
  load();
  // Browser preview stays empty unless SEED=1; seed uses same demo generator as Tauri.
  if (import.meta.env.SEED === '1' || import.meta.env.VITE_SEED === '1') {
    if (load().txns.length === 0) {
      // Soft skip if seed helper missing — production browser path is empty.
    }
  }
}

export async function browserClose(): Promise<void> {
  persist();
}

export async function browserReopen(): Promise<void> {
  data = null;
  await browserInit();
}

export async function browserGetSettings(): Promise<Settings> {
  const d = load();
  const round = Number(d.settings.round_to ?? 100);
  return {
    opening_stock_yway: Number(d.settings.opening_stock_yway ?? 0),
    digits: d.settings.digits === 'myanmar' ? 'myanmar' : 'latin',
    round_to: ([1, 100, 1000].includes(round) ? round : 100) as RoundTo,
    shop_name: d.settings.shop_name?.trim() || 'ဦးသန့်စင်',
    shop_mark: d.settings.shop_mark?.trim() || 'သ',
    shop_tagline: d.settings.shop_tagline?.trim() || 'အခေါက်ရွှေ အရောင်းအဝယ်',
  };
}

export async function browserSetSetting(key: string, value: string): Promise<void> {
  const d = load();
  if (key === 'opening_stock_yway') {
    const settings = await browserGetSettings();
    assertStockNonNegative(
      stockFromParts(Number(value), d.txns, d.stockAdjustments),
      settings.digits,
      'အစလက်ကျန် လျှော့လို့ မရပါ · လက်ကျန် အနှုတ် ဖြစ်မည်',
    );
  }
  d.settings[key] = value;
  persist();
}

export async function browserListCustomers(): Promise<Customer[]> {
  return [...load().customers]
    .map((c) => ({ ...c, nrc: c.nrc ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

export async function browserCreateCustomer(
  name: string,
  phone = '',
  address = '',
  nrc = '',
): Promise<number> {
  const d = load();
  const id = d.nextCustomerId++;
  d.customers.push({
    id,
    name: name.trim(),
    phone: phone.trim(),
    nrc: nrc.trim(),
    address: address.trim(),
    created_at: new Date().toISOString(),
  });
  persist();
  return id;
}

export async function browserListPrices(): Promise<Price[]> {
  return [...load().prices].sort((a, b) => {
    const ka = `${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}`;
    const kb = `${b.date}T${b.time.length === 5 ? b.time + ':00' : b.time}`;
    return ka < kb ? -1 : ka > kb ? 1 : a.id - b.id;
  });
}

export async function browserUpsertPrice(
  date: string,
  buy: number,
  sell: number,
): Promise<void> {
  const d = load();
  const list = await browserListPrices();
  const latest = list[list.length - 1];
  if (latest && latest.buy === buy && latest.sell === sell) return;
  const now = new Date();
  d.prices.push({
    id: d.nextPriceId++,
    date: date || isoDate(now),
    time: isoTime(now),
    buy,
    sell,
  });
  persist();
}

export async function browserListTxns(): Promise<Txn[]> {
  return [...load().txns].sort((a, b) => b.voucher_no - a.voucher_no);
}

export async function browserListTxnsAsc(): Promise<Txn[]> {
  return [...load().txns].sort((a, b) =>
    a.date + a.time + String(a.voucher_no).padStart(8, '0') <
    b.date + b.time + String(b.voucher_no).padStart(8, '0')
      ? -1
      : 1,
  );
}

export async function browserGetTxn(id: number): Promise<Txn | null> {
  return load().txns.find((t) => t.id === id) ?? null;
}

export async function browserSaveTxn(input: SaveTxnInput): Promise<number> {
  const d = load();
  const yway = Math.round(toYway(input.k, input.p, input.y) * 1000) / 1000;
  if (yway <= 0) throw new Error('ရွှေချိန် ထည့်ပါ');
  if (input.type === 'sell') {
    const settings = await browserGetSettings();
    const avail = stockFromParts(settings.opening_stock_yway, d.txns, d.stockAdjustments);
    assertStockEnough(avail, yway, settings.digits);
  }
  const amt = amount(yway, input.price, input.roundTo);
  const now = new Date();
  let customerId = input.customerId;
  if (input.newCustomer) {
    const id = d.nextCustomerId++;
    d.customers.push({
      id,
      name: input.newCustomer.name.trim(),
      phone: input.newCustomer.phone.trim(),
      nrc: input.newCustomer.nrc.trim(),
      address: input.newCustomer.address.trim(),
      created_at: now.toISOString(),
    });
    customerId = id;
  }
  const voucher_no = d.txns.reduce((m, t) => Math.max(m, t.voucher_no), 0) + 1;
  const id = d.nextTxnId++;
  d.txns.push({
    id,
    voucher_no,
    date: isoDate(now),
    time: isoTime(now),
    type: input.type,
    customer_id: customerId,
    yway,
    price: input.price,
    amount: amt,
    note: input.note || null,
  });
  persist();
  return id;
}

export async function browserDeleteTxn(id: number): Promise<void> {
  const d = load();
  const txn = d.txns.find((t) => t.id === id);
  if (txn?.type === 'buy') {
    const settings = await browserGetSettings();
    const avail = stockFromParts(settings.opening_stock_yway, d.txns, d.stockAdjustments);
    assertStockEnough(avail, txn.yway, settings.digits);
  }
  d.txns = d.txns.filter((t) => t.id !== id);
  persist();
}

export async function browserSumsByType(): Promise<{ buyYway: number; sellYway: number }> {
  let buyYway = 0;
  let sellYway = 0;
  for (const t of load().txns) {
    if (t.type === 'buy') buyYway += t.yway;
    else sellYway += t.yway;
  }
  return { buyYway, sellYway };
}

export async function browserListStockAdjustments(): Promise<StockAdjustment[]> {
  return [...load().stockAdjustments].sort((a, b) => {
    const ka = `${a.date}T${a.time}`;
    const kb = `${b.date}T${b.time}`;
    return ka < kb ? -1 : ka > kb ? 1 : a.id - b.id;
  });
}

export async function browserCreateStockAdjustment(
  kind: StockAdjKind,
  yway: number,
  note = '',
): Promise<number> {
  if (yway <= 0) throw new Error('ရွှေချိန် ထည့်ပါ');
  const d = load();
  if (kind === 'out') {
    const settings = await browserGetSettings();
    const avail = stockFromParts(settings.opening_stock_yway, d.txns, d.stockAdjustments);
    assertStockEnough(avail, yway, settings.digits);
  }
  const now = new Date();
  const id = d.nextStockAdjId++;
  d.stockAdjustments.push({
    id,
    date: isoDate(now),
    time: isoTime(now),
    kind,
    yway,
    note: note.trim() || null,
  });
  persist();
  return id;
}

export async function browserDeleteStockAdjustment(id: number): Promise<void> {
  const d = load();
  const adj = d.stockAdjustments.find((a) => a.id === id);
  if (adj?.kind === 'in') {
    const settings = await browserGetSettings();
    const avail = stockFromParts(settings.opening_stock_yway, d.txns, d.stockAdjustments);
    assertStockEnough(avail, adj.yway, settings.digits);
  }
  d.stockAdjustments = d.stockAdjustments.filter((a) => a.id !== id);
  persist();
}

export type { TxnType };
