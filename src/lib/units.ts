/** 1 ကျပ်သား = 16 ပဲ = 128 ရွေး */
export const YWAY_PER_KYAT = 128;
export const YWAY_PER_PE = 8;
export const PE_PER_KYAT = 16;

export const MMD = '၀၁၂၃၄၅၆၇၈၉';

export type DigitsMode = 'latin' | 'myanmar';
export type RoundTo = 1 | 100 | 1000;

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

/** amount = round(yway / 128 × price / R) × R */
export function amount(yway: number, price: number, R: RoundTo = 100): number {
  return Math.round((yway / YWAY_PER_KYAT) * price / R) * R;
}

/** Profit for a sale = yway/128 × (sale price − that day's buy price) */
export function profit(yway: number, salePrice: number, buyPrice: number): number {
  return (yway / YWAY_PER_KYAT) * (salePrice - buyPrice);
}

/** Stock = opening + Σ buy − Σ sell */
export function stock(
  openingYway: number,
  buyYway: number,
  sellYway: number,
): number {
  return openingYway + buyYway - sellYway;
}

export function D(x: string | number, digits: DigitsMode = 'latin'): string {
  const s = String(x);
  if (digits !== 'myanmar') return s;
  return s.replace(/[0-9]/g, (d) => MMD[Number(d)]!);
}

export function money(n: number, digits: DigitsMode = 'latin'): string {
  return D(Math.round(n).toLocaleString('en-US'), digits);
}

export function voucherNo(n: number, digits: DigitsMode = 'latin'): string {
  return D('#' + String(n).padStart(4, '0'), digits);
}

export function isoDate(d: Date = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

export function isoTime(d: Date = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${z(d.getHours())}:${z(d.getMinutes())}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
