import { MONTHS_MY } from '../styles/tokens';
import {
  D,
  DigitsMode,
  W,
  addDays,
  isoDate,
  money,
  profit,
  sumMoney,
  YWAY_PER_KYAT,
} from './units';

export type TxnType = 'sell' | 'buy';

export interface TxnLike {
  date: string;
  type: TxnType;
  yway: number;
  price: number;
  amount: number;
}

export interface PriceMap {
  [date: string]: number; // buy price that day
}

export interface Bucket {
  from: string;
  to: string;
  label: string;
  sl?: string;
  title: string;
}

export interface BucketRow extends Bucket {
  sP: number;
  bP: number;
  sA: bigint;
  bA: bigint;
  pr: number;
  bal: number;
}

export type Metric = 'w' | 'm';

/** ≤45 days → daily; ≤120 → weekly; else monthly */
export function bucketDates(dates: string[]): Bucket[] {
  if (dates.length <= 45) {
    return dates.map((d) => ({
      from: d,
      to: d,
      label: String(+d.slice(8)),
      title: d,
    }));
  }
  if (dates.length <= 120) {
    const rb: Bucket[] = [];
    for (let i = 0; i < dates.length; i += 7) {
      const g = dates.slice(i, i + 7);
      rb.push({
        from: g[0]!,
        to: g[g.length - 1]!,
        label: g[0]!.slice(5).replace('-', '/'),
        title: `${g[0]!} – ${g[g.length - 1]!}`,
      });
    }
    return rb;
  }
  const ms = [...new Set(dates.map((d) => d.slice(0, 7)))];
  return ms.map((m) => ({
    from: `${m}-01`,
    to: `${m}-31`,
    label: MONTHS_MY[+m.slice(5) - 1]!,
    sl: String(+m.slice(5)),
    title: `${m.slice(0, 4)} ${MONTHS_MY[+m.slice(5) - 1]!}`,
  }));
}

export function dayBuckets(dates: string[]): Bucket[] {
  return dates.map((d) => ({ from: d, to: d, label: String(+d.slice(8)), title: d }));
}

export function monthDayBuckets(ym: string): Bucket[] {
  const [Y, M] = ym.split('-').map(Number) as [number, number];
  const dim = new Date(Y, M, 0).getDate();
  return Array.from({ length: dim }, (_, i) => {
    const d = `${ym}-${String(i + 1).padStart(2, '0')}`;
    return { from: d, to: d, label: String(i + 1), title: d };
  });
}

export function yearMonthBuckets(year: number, digits: DigitsMode = 'latin'): Bucket[] {
  return Array.from({ length: 12 }, (_, i) => {
    const k = `${year}-${String(i + 1).padStart(2, '0')}`;
    return {
      from: `${k}-01`,
      to: `${k}-31`,
      label: MONTHS_MY[i]!,
      sl: D(String(i + 1), digits),
      title: `${D(String(year), digits)} ${MONTHS_MY[i]!}`,
    };
  });
}

export function enumerateDates(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = new Date(from + 'T00:00:00'); isoDate(d) <= to; d = addDays(d, 1)) {
    out.push(isoDate(d));
  }
  return out;
}

export function lastNDates(n: number, now = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => isoDate(addDays(now, i - n + 1)));
}

/**
 * Latest shop buy-price as of each calendar day (forward-filled from price history).
 * Missing days inherit the previous recorded buy price — never invents a fake spread.
 */
export function buildBuyPriceLookup(
  prices: Array<{ date: string; time: string; buy: number }>,
): (date: string) => number {
  const sorted = [...prices].sort((a, b) => {
    const ka = `${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}`;
    const kb = `${b.date}T${b.time.length === 5 ? b.time + ':00' : b.time}`;
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return (date: string) => {
    let buy = 0;
    for (const p of sorted) {
      if (p.date > date) break;
      if (p.buy > 0) buy = p.buy;
    }
    return buy;
  };
}

/** @deprecated Prefer buildBuyPriceLookup; kept for chart helpers that still pass maps */
export function marginOf(txns: TxnLike[], buyByDate: PriceMap | ((date: string) => number)): number {
  const getBuy =
    typeof buyByDate === 'function'
      ? buyByDate
      : (date: string) => {
          // map may be sparse — walk keys ≤ date
          let buy = 0;
          for (const d of Object.keys(buyByDate).sort()) {
            if (d > date) break;
            if (buyByDate[d]! > 0) buy = buyByDate[d]!;
          }
          return buy;
        };
  return txns
    .filter((t) => t.type === 'sell')
    .reduce((a, t) => {
      const buy = getBuy(t.date);
      if (buy <= 0) return a;
      return a + profit(t.yway, t.price, buy);
    }, 0);
}

/** True when every sell has a known shop buy-price for its date */
export function marginComplete(
  txns: TxnLike[],
  getBuy: (date: string) => number,
): boolean {
  return txns.filter((t) => t.type === 'sell').every((t) => getBuy(t.date) > 0);
}

export type AdjLike = { date: string; kind: 'in' | 'out'; yway: number };

export function stockAt(
  opening: number,
  txnsAsc: TxnLike[],
  throughDate: string,
  adjsAsc: AdjLike[] = [],
): number {
  let bal = opening;
  for (const t of txnsAsc) {
    if (t.date > throughDate) break;
    bal += t.type === 'buy' ? t.yway : -t.yway;
  }
  for (const a of adjsAsc) {
    if (a.date > throughDate) break;
    bal += a.kind === 'in' ? a.yway : -a.yway;
  }
  return bal;
}

export function makeChartData(
  buckets: Bucket[],
  txns: TxnLike[],
  buyByDate: PriceMap,
  opening: number,
  txnsAsc: TxnLike[],
  metric: Metric,
  digits: DigitsMode = 'latin',
  adjsAsc: AdjLike[] = [],
) {
  const sum = (arr: TxnLike[], f: (t: TxnLike) => number) =>
    arr.reduce((a, t) => a + f(t), 0);

  const balAt = (d: string) => stockAt(opening, txnsAsc, d, adjsAsc);

  const rows: BucketRow[] = buckets.map((bk) => {
    const a = txns.filter((t) => t.date >= bk.from && t.date <= bk.to);
    const sa = a.filter((t) => t.type === 'sell');
    const ba = a.filter((t) => t.type === 'buy');
    return {
      ...bk,
      sP: sum(sa, (t) => t.yway),
      bP: sum(ba, (t) => t.yway),
      sA: sumMoney(sa, (t) => t.amount),
      bA: sumMoney(ba, (t) => t.amount),
      pr: marginOf(sa, buyByDate),
      bal: balAt(bk.to),
    };
  });

  const isW = metric === 'w';
  /** Chart bar scale only — display uses BigInt money() */
  const moneyBar = (n: bigint) => Number(n / 100000n) + Number(n % 100000n) / 1e5;
  const sv = (r: BucketRow) => (isW ? r.sP / YWAY_PER_KYAT : moneyBar(r.sA));
  const bv = (r: BucketRow) => (isW ? r.bP / YWAY_PER_KYAT : moneyBar(r.bA));
  const mx = Math.max(0.0001, ...rows.map((r) => Math.max(sv(r), bv(r))));
  const pmx = Math.max(0.0001, ...rows.map((r) => Math.abs(r.pr)));
  const few = rows.length <= 16;
  const f1 = (v: number) =>
    v ? D(v >= 100 ? String(Math.round(v)) : v.toFixed(1), digits) : '';

  const bar = (v: number, m: number, col: string, up: boolean) => ({
    width: '72%',
    maxWidth: 40,
    height: `${(v / m) * 100 * (few ? 0.85 : 1)}%`,
    minHeight: v ? 2 : 0,
    background: col,
    borderRadius: up ? '4px 4px 0 0' : '0 0 4px 4px',
  });

  const every = labelEvery(rows.length);
  const cols = rows.map((r, i) => {
    const showLabel = i % every === 0 || i === rows.length - 1;
    return {
      label: showLabel ? r.label : '',
      slabel: showLabel ? r.sl || r.label : '',
      title: `${r.title} · ရောင်း ${W(r.sP, digits)} (${money(r.sA, digits)}) · ဝယ် ${W(r.bP, digits)} (${money(r.bA, digits)})`,
      up: bar(sv(r), mx, '#D9A93A', true),
      down: bar(bv(r), mx, '#9AA6B8', false),
      upTxt: f1(sv(r)),
      downTxt: f1(bv(r)),
      showTxt: few,
      p: {
        width: '72%',
        maxWidth: 40,
        height: `${(Math.abs(r.pr) / pmx) * 85}%`,
        minHeight: r.pr ? 2 : 0,
        background: r.pr >= 0 ? '#1F7A4D' : '#B23A2A',
        borderRadius: '4px 4px 0 0',
      },
      pTxt: f1(r.pr / 1e5),
      pTitle: `${r.title} · အမြတ် ${money(r.pr, digits)}`,
    };
  });

  const firstFrom = buckets[0]?.from;
  const startBal = firstFrom
    ? balAt(isoDate(addDays(new Date(firstFrom + 'T00:00:00'), -1)))
    : opening;
  const bals = [startBal, ...rows.map((r) => r.bal)];
  const lo = Math.min(...bals);
  const hi = Math.max(...bals);
  const rg = Math.max(1, hi - lo);
  const pts = bals.map((b, i) => [
    (i / Math.max(1, bals.length - 1)) * 1000,
    150 - ((b - lo) / rg) * 130,
  ]);
  const line = pts.map((p) => `${p[0]!.toFixed(1)},${p[1]!.toFixed(1)}`).join(' ');
  const chg = bals[bals.length - 1]! - bals[0]!;

  return {
    cols,
    rows,
    profitTotal: `${D((rows.reduce((a, r) => a + r.pr, 0) / 1e5).toFixed(1), digits)} သိန်း`,
    profitSum: rows.reduce((a, r) => a + r.pr, 0),
    stock: {
      line,
      area: `0,160 ${line} 1000,160`,
      start: W(bals[0]!, digits),
      end: W(bals[bals.length - 1]!, digits),
      chg: `${chg >= 0 ? '+ ' : ''}${W(chg, digits)}`,
      chgPositive: chg >= 0,
    },
  };
}

/** Label every Nth bar (and always last). For half-width charts prefer month numbers via sl. */
export function labelEvery(count: number): number {
  return count > 20 ? 5 : 1;
}
