import { amount, D, DigitsMode, W, YWAY_PER_KYAT, YWAY_PER_PE } from './units';

/** Card denomination ids — fixed set */
export type CardDenom =
  | '1p'
  | '2p'
  | '4p'
  | '8p'
  | '1k'
  | '2k'
  | '3k'
  | '5k'
  | '10k';

export type TxnChannel = 'card' | 'loose';

export interface CardDenomDef {
  id: CardDenom;
  label: string;
  yway: number;
}

export const CARD_DENOMS: CardDenomDef[] = [
  { id: '1p', label: '၁ ပဲ', yway: 1 * YWAY_PER_PE },
  { id: '2p', label: '၂ ပဲ', yway: 2 * YWAY_PER_PE },
  { id: '4p', label: '၄ ပဲ', yway: 4 * YWAY_PER_PE },
  { id: '8p', label: '၈ ပဲ', yway: 8 * YWAY_PER_PE },
  { id: '1k', label: '၁ ကျပ်', yway: 1 * YWAY_PER_KYAT },
  { id: '2k', label: '၂ ကျပ်', yway: 2 * YWAY_PER_KYAT },
  { id: '3k', label: '၃ ကျပ်', yway: 3 * YWAY_PER_KYAT },
  { id: '5k', label: '၅ ကျပ်', yway: 5 * YWAY_PER_KYAT },
  { id: '10k', label: '၁၀ ကျပ်', yway: 10 * YWAY_PER_KYAT },
];

export const DEFAULT_CARD_FEE = 30_000;

const DENOM_MAP = Object.fromEntries(CARD_DENOMS.map((d) => [d.id, d])) as Record<
  CardDenom,
  CardDenomDef
>;

export function isCardDenom(s: string): s is CardDenom {
  return s in DENOM_MAP;
}

export function cardYway(denom: CardDenom): number {
  return DENOM_MAP[denom].yway;
}

export function cardLabel(denom: CardDenom): string {
  return DENOM_MAP[denom].label;
}

export type CardQtyMap = Partial<Record<CardDenom, number>>;

export function normalizeCardLines(
  lines: Array<{ denom: string; qty: number }>,
): Array<{ denom: CardDenom; qty: number }> {
  const map: Record<string, number> = {};
  for (const line of lines) {
    if (!isCardDenom(line.denom)) continue;
    const q = Math.floor(Number(line.qty) || 0);
    if (q <= 0) continue;
    map[line.denom] = (map[line.denom] ?? 0) + q;
  }
  return CARD_DENOMS.filter((d) => (map[d.id] ?? 0) > 0).map((d) => ({
    denom: d.id,
    qty: map[d.id]!,
  }));
}

export function cardsTotalQty(lines: Array<{ qty: number }>): number {
  return lines.reduce((a, l) => a + l.qty, 0);
}

export function cardsTotalYway(lines: Array<{ denom: CardDenom; qty: number }>): number {
  return lines.reduce((a, l) => a + cardYway(l.denom) * l.qty, 0);
}

/** ၁၀ ကျပ် — ကဒ်ဖိုး မယူ */
const CARD_FEE_EXEMPT = new Set<CardDenom>(['10k']);

export function cardsFeeableQty(lines: Array<{ denom: CardDenom; qty: number }>): number {
  return lines.reduce((a, l) => a + (CARD_FEE_EXEMPT.has(l.denom) ? 0 : Math.max(0, Math.floor(l.qty))), 0);
}

export function cardsFeeTotal(
  lines: Array<{ denom: CardDenom; qty: number }>,
  feePerCard: number,
): number {
  return cardsFeeableQty(lines) * Math.max(0, Math.round(feePerCard));
}

/** Sell: gold + fee · Buy: gold − fee */
export function cardTxnAmount(
  type: 'sell' | 'buy',
  yway: number,
  price: number,
  lines: Array<{ denom: CardDenom; qty: number }>,
  feePerCard: number,
): { gold: number; fee: number; total: number } {
  const gold = amount(yway, price);
  const fee = cardsFeeTotal(lines, feePerCard);
  const total = type === 'sell' ? gold + fee : gold - fee;
  return { gold, fee, total };
}

export function formatCardLines(
  lines: Array<{ denom: CardDenom; qty: number }>,
  digits: DigitsMode = 'latin',
): string {
  if (!lines.length) return '—';
  return lines.map((l) => `${cardLabel(l.denom)} × ${D(l.qty, digits)}`).join(' · ');
}

export function emptyCardQtyMap(): Record<CardDenom, number> {
  return Object.fromEntries(CARD_DENOMS.map((d) => [d.id, 0])) as Record<CardDenom, number>;
}

/**
 * Card stock per denom:
 * opening + adj_in + buy − adj_out − sell
 */
export function computeCardStock(args: {
  openings: Array<{ denom: string; qty: number }>;
  adjustments: Array<{ kind: string; denom: string; qty: number }>;
  txnCards: Array<{ type: string; denom: string; qty: number }>;
}): Record<CardDenom, number> {
  const stock = emptyCardQtyMap();
  for (const o of args.openings) {
    if (isCardDenom(o.denom)) stock[o.denom] += Math.max(0, Math.floor(o.qty) || 0);
  }
  for (const a of args.adjustments) {
    if (!isCardDenom(a.denom)) continue;
    const q = Math.max(0, Math.floor(a.qty) || 0);
    if (a.kind === 'in') stock[a.denom] += q;
    else if (a.kind === 'out') stock[a.denom] -= q;
  }
  for (const t of args.txnCards) {
    if (!isCardDenom(t.denom)) continue;
    const q = Math.max(0, Math.floor(t.qty) || 0);
    if (t.type === 'buy') stock[t.denom] += q;
    else if (t.type === 'sell') stock[t.denom] -= q;
  }
  return stock;
}

export function cardStockTotalYway(stock: Record<CardDenom, number>): number {
  return CARD_DENOMS.reduce((a, d) => a + (stock[d.id] || 0) * d.yway, 0);
}

export function assertCardStockEnough(
  available: Record<CardDenom, number>,
  need: Array<{ denom: CardDenom; qty: number }>,
  digits: DigitsMode = 'myanmar',
): void {
  for (const line of need) {
    const have = available[line.denom] ?? 0;
    if (line.qty > have) {
      throw new Error(
        `အကယ်ဒမီအခေါက်ရွှေ မလုံလောက်ပါ · ${cardLabel(line.denom)}\nလက်ကျန် · ${have} အကယ်ဒမီအခေါက်ရွှေ · တောင်းဆို · ${line.qty} အကယ်ဒမီအခေါက်ရွှေ\n(${W(have * cardYway(line.denom), digits)})`,
      );
    }
  }
}
