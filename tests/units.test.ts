import { describe, expect, it } from 'vitest';
import {
  W,
  amount,
  profit,
  stock,
  toYway,
  D,
  N,
  fromYway,
  keepNumInput,
  keepNumInputAt,
  nextVoucherInt,
  toLatinDigits,
  voucherNo,
  voucherPrefix,
} from '../src/lib/units';
import { bucketDates, enumerateDates, marginOf } from '../src/lib/reports';

describe('toYway', () => {
  it('converts kyat/pe/yway', () => {
    expect(toYway(1, 0, 0)).toBe(128);
    expect(toYway(0, 1, 0)).toBe(8);
    expect(toYway(0, 0, 1)).toBe(1);
    expect(toYway(1, 4, 0.5)).toBe(128 + 32 + 0.5);
    expect(toYway(0, 0, 0)).toBe(0);
  });
});

describe('W', () => {
  it('shows only non-zero parts', () => {
    expect(W(15 * 128)).toBe('15 ကျပ်');
    expect(W(2 * 8 + 3)).toBe('2 ပဲ 3 ရွေး');
    expect(W(128 + 4 * 8 + 0.5)).toBe('1 ကျပ် 4 ပဲ 0.5 ရွေး');
    expect(W(0)).toBe('0');
  });

  it('prefixes negatives', () => {
    expect(W(-128)).toBe('− 1 ကျပ်');
  });

  it('supports Myanmar digits', () => {
    expect(W(128, 'myanmar')).toBe('၁ ကျပ်');
    expect(D('123', 'myanmar')).toBe('၁၂၃');
  });
});

describe('N / toLatinDigits', () => {
  it('parses Myanmar and Latin digits', () => {
    expect(toLatinDigits('၁၂၃')).toBe('123');
    expect(N('၁၂၃')).toBe(123);
    expect(N('1.5')).toBe(1.5);
    expect(N('၁.၅')).toBe(1.5);
    expect(N('7,000,000')).toBe(7000000);
    expect(N('၇၀၀၀၀၀၀')).toBe(7000000);
    expect(N('')).toBe(0);
  });

  it('keeps mixed digit input', () => {
    expect(keepNumInput('၁2၃')).toBe('၁2၃');
    expect(keepNumInput('12a၃')).toBe('12၃');
    expect(N(keepNumInput('၁2၃'))).toBe(123);
  });

  it('maps caret through stripped chars', () => {
    expect(keepNumInputAt('12a34', 3)).toEqual({ value: '1234', caret: 2 });
    expect(keepNumInputAt('9500000', 3)).toEqual({ value: '9500000', caret: 3 });
    expect(keepNumInputAt('', 0)).toEqual({ value: '', caret: 0 });
  });
});

describe('fromYway', () => {
  it('round-trips via fromYway', () => {
    const y = toYway(2, 3, 4);
    const parts = fromYway(y);
    expect(toYway(parts.k, parts.p, parts.y)).toBe(y);
  });
});

describe('amount', () => {
  it('rounds to nearest ကျပ်', () => {
    // 128 yway × 7_000_000 / 128 = 7_000_000
    expect(amount(128, 7000000)).toBe(7000000);
    // 64 yway = half kyat → 3_500_000
    expect(amount(64, 7000000)).toBe(3500000);
    expect(amount(1, 7000000)).toBe(Math.round(7000000 / 128));
  });
});

describe('profit', () => {
  it('uses sale − buy for the day', () => {
    expect(profit(128, 7100000, 7000000)).toBe(100000);
    expect(profit(64, 7100000, 7000000)).toBe(50000);
  });
});

describe('stock', () => {
  it('opening + buy − sell', () => {
    expect(stock(100, 50, 30)).toBe(120);
    expect(stock(0, 10, 10)).toBe(0);
  });
});

describe('report bucketing', () => {
  it('uses daily for ≤45 days', () => {
    const dates = enumerateDates('2025-01-01', '2025-01-30');
    expect(dates.length).toBe(30);
    const b = bucketDates(dates);
    expect(b).toHaveLength(30);
    expect(b[0]!.from).toBe(b[0]!.to);
  });

  it('uses weekly for ≤120 days', () => {
    const dates = enumerateDates('2025-01-01', '2025-03-31'); // 90 days
    expect(dates.length).toBeGreaterThan(45);
    expect(dates.length).toBeLessThanOrEqual(120);
    const b = bucketDates(dates);
    expect(b.length).toBe(Math.ceil(dates.length / 7));
    expect(b[0]!.from).not.toBe(b[0]!.to);
  });

  it('uses monthly for >120 days', () => {
    const dates = enumerateDates('2025-01-01', '2025-08-31'); // ~243 days
    expect(dates.length).toBeGreaterThan(120);
    const b = bucketDates(dates);
    expect(b.every((x) => x.from.endsWith('-01'))).toBe(true);
    expect(b[0]!.sl).toBeDefined();
  });

  it('marginOf sums sale profits', () => {
    const buyByDate = { '2025-01-01': 7000000 };
    const m = marginOf(
      [{ date: '2025-01-01', type: 'sell', yway: 128, price: 7100000, amount: 7100000 }],
      buyByDate,
    );
    expect(m).toBe(100000);
  });
});

describe('voucherNo letter series', () => {
  const SIZE = 10_000;

  it('formats A-0000 … A-9999 → B-0000 → Z-9999 → AA-0000', () => {
    expect(voucherNo(0)).toBe('A-0000');
    expect(voucherNo(1)).toBe('A-0001');
    expect(voucherNo(9999)).toBe('A-9999');
    expect(voucherNo(10_000)).toBe('B-0000');
    expect(voucherNo(25 * 10_000 + 9999)).toBe('Z-9999');
    expect(voucherNo(26 * 10_000)).toBe('AA-0000');
    expect(voucherNo(26 * 10_000 + 1)).toBe('AA-0001');
  });

  it('builds Excel-style prefixes', () => {
    expect(voucherPrefix(0)).toBe('A');
    expect(voucherPrefix(25)).toBe('Z');
    expect(voucherPrefix(26)).toBe('AA');
    expect(voucherPrefix(27)).toBe('AB');
    expect(voucherPrefix(51)).toBe('AZ');
    expect(voucherPrefix(52)).toBe('BA');
  });

  it('increments the letter after every 10,000 from A through Z then AA', () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < 26; i++) {
      const start = i * SIZE;
      expect(voucherNo(start)).toBe(`${letters[i]}-0000`);
      expect(voucherNo(start + 9999)).toBe(`${letters[i]}-9999`);
      if (i < 25) {
        expect(voucherNo(start + SIZE)).toBe(`${letters[i + 1]}-0000`);
      }
    }
    expect(voucherNo(25 * SIZE + 9999)).toBe('Z-9999');
    expect(voucherNo(26 * SIZE)).toBe('AA-0000');
    expect(voucherNo(27 * SIZE)).toBe('AB-0000');
  });

  it('nextVoucherInt walks A-9999 → B-0000 and Z-9999 → AA-0000', () => {
    expect(nextVoucherInt([])).toBe(0);
    expect(voucherNo(nextVoucherInt([0, 3, 2]))).toBe('A-0004');
    expect(voucherNo(nextVoucherInt([9999]))).toBe('B-0000');
    expect(voucherNo(nextVoucherInt([25 * SIZE + 9999]))).toBe('AA-0000');
    expect(voucherNo(nextVoucherInt([26 * SIZE]))).toBe('AA-0001');
  });

  it('each next integer maps to a unique label', () => {
    const labels = [
      voucherNo(0),
      voucherNo(1),
      voucherNo(9999),
      voucherNo(10_000),
      voucherNo(10_001),
      voucherNo(25 * SIZE + 9999),
      voucherNo(26 * SIZE),
      voucherNo(26 * SIZE + 1),
    ];
    expect(labels).toEqual([
      'A-0000',
      'A-0001',
      'A-9999',
      'B-0000',
      'B-0001',
      'Z-9999',
      'AA-0000',
      'AA-0001',
    ]);
    expect(new Set(labels).size).toBe(labels.length);
    for (const n of [0, 9999, 10_000, 25 * SIZE + 9999, 26 * SIZE]) {
      expect(nextVoucherInt([n])).toBe(n + 1);
      expect(voucherNo(n + 1)).not.toBe(voucherNo(n));
    }
  });
});
