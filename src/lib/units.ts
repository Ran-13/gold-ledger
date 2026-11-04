/** 1 ကျပ်သား = 16 ပဲ = 128 ရွေး */
export const YWAY_PER_KYAT = 128;
export const YWAY_PER_PE = 8;
export const PE_PER_KYAT = 16;

export const MMD = '၀၁၂၃၄၅၆၇၈၉';

export type DigitsMode = 'latin' | 'myanmar';

export function toYway(k: number, p: number, y: number): number {
  return (k || 0) * YWAY_PER_KYAT + (p || 0) * YWAY_PER_PE + (y || 0);
}

export function fromYway(yway: number): { k: number; p: number; y: number } {
  const neg = yway < 0;
  let y = Math.abs(yway);
  let k = Math.floor(y / YWAY_PER_KYAT);
  let rm = y - k * YWAY_PER_KYAT;
  let p = Math.floor(rm / YWAY_PER_PE);
  let yw = Math.round((rm - p * YWAY_PER_PE) * 100) / 100;
  if (yw >= YWAY_PER_PE) {
    p++;
    yw = 0;
  }
  if (p >= PE_PER_KYAT) {
    k++;
    p = 0;
  }
  return { k: neg ? -k : k, p, y: yw };
}

/** Format weight: show only non-zero parts. Zero → "0". Negative → "− " prefix. */
export function W(yway: number, digits: DigitsMode = 'latin'): string {
  const neg = yway < 0;
  let y = Math.abs(yway);
  let k = Math.floor(y / YWAY_PER_KYAT);
  let rm = y - k * YWAY_PER_KYAT;
  let p = Math.floor(rm / YWAY_PER_PE);
  let yw = Math.round((rm - p * YWAY_PER_PE) * 100) / 100;
  if (yw >= YWAY_PER_PE) {
    p++;
    yw = 0;
  }
  if (p >= PE_PER_KYAT) {
    k++;
    p = 0;
  }
  const parts: string[] = [];
  if (k) parts.push(`${k} ကျပ်`);
  if (p) parts.push(`${p} ပဲ`);
  if (yw) parts.push(`${yw} ရွေး`);
  if (!parts.length) parts.push('0');
  return D((neg ? '− ' : '') + parts.join(' '), digits);
}

/** amount = round(yway / 128 × price) to nearest ကျပ် */
export function amount(yway: number, price: number): number {
  return Math.round((yway / YWAY_PER_KYAT) * price);
}

/** Profit for a sale = yway/128 × (sale price − that day's buy price) */
export function profit(yway: number, salePrice: number, buyPrice: number): number {
  return (yway / YWAY_PER_KYAT) * (salePrice - buyPrice);
}

/** Stock = opening + Σ buy + Σ adj_in − Σ sell − Σ adj_out */
export function stock(
  openingYway: number,
  buyYway: number,
  sellYway: number,
  adjInYway = 0,
  adjOutYway = 0,
): number {
  return openingYway + buyYway + adjInYway - sellYway - adjOutYway;
}

const STOCK_EPS = 1e-9;

/** Current stock from opening + all movements. */
export function stockFromParts(
  openingYway: number,
  txns: Array<{ type: string; yway: number }>,
  adjs: Array<{ kind: string; yway: number }>,
): number {
  let buy = 0;
  let sell = 0;
  let adjIn = 0;
  let adjOut = 0;
  for (const t of txns) {
    if (t.type === 'buy') buy += t.yway;
    else if (t.type === 'sell') sell += t.yway;
  }
  for (const a of adjs) {
    if (a.kind === 'in') adjIn += a.yway;
    else if (a.kind === 'out') adjOut += a.yway;
  }
  return stock(openingYway, buy, sell, adjIn, adjOut);
}

/** Throw if `need` exceeds available stock (cannot go negative / overdraw). */
export function assertStockEnough(
  available: number,
  need: number,
  digits: DigitsMode = 'myanmar',
): void {
  if (need > available + STOCK_EPS) {
    throw new Error(
      `လက်ကျန်ထက် ပို၍ မရပါ\nလက်ရှိလက်ကျန် · ${W(Math.max(0, available), digits)}`,
    );
  }
}

export function assertStockNonNegative(
  nextStock: number,
  digits: DigitsMode = 'myanmar',
  detail = 'လက်ကျန် အနှုတ် ဖြစ်လို့ မရပါ',
): void {
  if (nextStock < -STOCK_EPS) {
    throw new Error(`${detail}\nရလဒ်လက်ကျန် · ${W(nextStock, digits)}`);
  }
}

export function D(x: string | number, digits: DigitsMode = 'latin'): string {
  const s = String(x);
  if (digits !== 'myanmar') return s;
  return s.replace(/[0-9]/g, (d) => MMD[Number(d)]!);
}

/** Convert Myanmar digits ၀–၉ → 0–9 (leaves Latin digits unchanged). */
export function toLatinDigits(s: string): string {
  return String(s).replace(/[၀-၉]/g, (d) => String(MMD.indexOf(d)));
}

/**
 * Parse a number from Latin or Myanmar digits.
 * Accepts commas as thousand separators. Empty / invalid → 0.
 */
export function N(x: string | number | null | undefined): number {
  if (typeof x === 'number') return Number.isFinite(x) ? x : 0;
  if (x == null || x === '') return 0;
  const cleaned = toLatinDigits(String(x)).replace(/,/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** Keep only digits (Latin/Myanmar), one decimal point, optional leading minus. */
export function keepNumInput(s: string): string {
  let out = '';
  let seenDot = false;
  for (const ch of String(s)) {
    if (/[0-9၀-၉]/.test(ch)) {
      out += ch;
      continue;
    }
    if ((ch === '.' || ch === '။') && !seenDot) {
      out += '.';
      seenDot = true;
      continue;
    }
    if (ch === '-' && out.length === 0) {
      out += '-';
    }
  }
  return out;
}

/** Exact ကျပ် integer — use for totals that can exceed Number.MAX_SAFE_INTEGER. */
export function toMoneyInt(n: number | bigint): bigint {
  if (typeof n === 'bigint') return n;
  if (!Number.isFinite(n)) return 0n;
  return BigInt(Math.round(n));
}

/** Sum money fields with BigInt (လချုပ် / နှစ်ချုပ် safe). */
export function sumMoney<T>(arr: T[], f: (t: T) => number | bigint): bigint {
  let total = 0n;
  for (const t of arr) total += toMoneyInt(f(t));
  return total;
}

export function money(n: number | bigint, digits: DigitsMode = 'latin'): string {
  const v = toMoneyInt(n);
  const neg = v < 0n;
  const abs = neg ? -v : v;
  const grouped = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${D(`${neg ? '-' : ''}${grouped}`, digits)} ကျပ်`;
}

export function voucherNo(n: number, digits: DigitsMode = 'latin'): string {
  return D('#' + String(n).padStart(4, '0'), digits);
}

export function isoDate(d: Date = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

/** `YYYY-MM-DD` → `D-M-YYYY` (ရက်-လ-နှစ်, no leading zeros). Storage stays ISO. */
export function formatDate(iso: string, digits: DigitsMode = 'latin'): string {
  const m = (iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return D(iso || '—', digits);
  const day = String(Number(m[3]));
  const month = String(Number(m[2]));
  return D(`${day}-${month}-${m[1]}`, digits);
}

export function isoTime(d: Date = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
}

/** `HH:MM` or `HH:MM:SS` → `h:MM AM/PM` (always Latin digits). */
export function formatTimeAmPm(time: string, _digits?: DigitsMode): string {
  const m = (time || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return (time || '').slice(0, 5) || '—';
  const h24 = Number(m[1]);
  const min = m[2]!;
  const am = h24 < 12;
  const h12 = h24 % 12 || 12;
  return `${h12}:${min} ${am ? 'AM' : 'PM'}`;
}

/** Sort key for price logs / txns: date then time */
export function dateTimeKey(date: string, time: string): string {
  const t = time.length === 5 ? `${time}:00` : time;
  return `${date}T${t}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
