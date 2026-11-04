import { describe, expect, it } from 'vitest';
import { money, sumMoney, toMoneyInt } from '../src/lib/units';

describe('လချုပ် / နှစ်ချုပ် amount totals (BigInt)', () => {
  it('sums many large single-txn amounts exactly (လချုပ်-scale)', () => {
    const perTxn = 50_000_000;
    const count = 30 * 20;
    const rows = Array.from({ length: count }, () => ({ amount: perTxn }));
    const total = sumMoney(rows, (t) => t.amount);

    expect(total).toBe(BigInt(perTxn) * BigInt(count));
    expect(money(total, 'latin')).toBe('30,000,000,000 ကျပ်');
  });

  it('stays exact past Number.MAX_SAFE_INTEGER (နှစ်ချုပ် overflow case)', () => {
    // 20 × 900_000_000_000_000 = 18e15 > MAX_SAFE_INTEGER (≈9e15)
    const perTxn = 900_000_000_000_000;
    const rows = Array.from({ length: 20 }, () => ({ amount: perTxn }));
    const total = sumMoney(rows, (t) => t.amount);

    expect(total).toBe(18_000_000_000_000_000n);
    expect(total > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    // Number sum would be wrong / unsafe:
    expect(Number.isSafeInteger(Number(total))).toBe(false);
    expect(money(total, 'latin')).toBe('18,000,000,000,000,000 ကျပ်');
  });

  it('Number loses precision where BigInt does not', () => {
    const a = Number.MAX_SAFE_INTEGER;
    // classic failure: MAX + 1 indistinguishable from MAX + 2
    expect(a + 1 === a + 2).toBe(true);
    expect(toMoneyInt(a) + 1n === toMoneyInt(a) + 2n).toBe(false);

    const exact = sumMoney(
      [{ amount: a - 10 }, { amount: a - 10 }, { amount: a - 10 }],
      (t) => t.amount,
    );
    expect(exact).toBe(BigInt(a - 10) * 3n);
  });

  it('money() formats bigint year totals', () => {
    expect(money(1_168_000_000_000n, 'latin')).toBe('1,168,000,000,000 ကျပ်');
    expect(money(sumMoney([{ amount: 95_300_000 }, { amount: 12_500_000 }], (t) => t.amount), 'latin')).toBe(
      '107,800,000 ကျပ်',
    );
  });
});
