import { describe, expect, it } from 'vitest';
import {
  isZawgyiLikely,
  toUnicodeMy,
  uni2zg,
  zg2uni,
} from '../src/lib/myanmarText';

describe('toUnicodeMy', () => {
  it('converts Zawgyi to Unicode', () => {
    expect(toUnicodeMy('မဂၤလာပါ')).toBe('မင်္ဂလာပါ');
    expect(toUnicodeMy('မွတ္ခ်က္')).toBe('မှတ်ချက်');
    expect(toUnicodeMy('အေခါက္ေ႐ႊ')).toBe('အခေါက်ရွှေ');
  });

  it('leaves Unicode unchanged', () => {
    expect(toUnicodeMy('မင်္ဂလာပါ')).toBe('မင်္ဂလာပါ');
    expect(toUnicodeMy('ဦးသန့်စင်')).toBe('ဦးသန့်စင်');
    expect(toUnicodeMy('သန့်')).toBe('သန့်');
    expect(toUnicodeMy('ကျပ်')).toBe('ကျပ်');
    expect(toUnicodeMy('အခေါက်ရွှေ')).toBe('အခေါက်ရွှေ');
  });

  it('leaves Latin / digits alone', () => {
    expect(toUnicodeMy('hello')).toBe('hello');
    expect(toUnicodeMy('123')).toBe('123');
    expect(toUnicodeMy('')).toBe('');
  });

  it('converts mixed Latin + Zawgyi', () => {
    expect(toUnicodeMy('ABC မဂၤလာ')).toBe('ABC မင်္ဂလာ');
  });
});

describe('sticky zawgyi helpers', () => {
  it('detects Zawgyi vowel-before-consonant', () => {
    expect(isZawgyiLikely('ေမ')).toBe(true);
    expect(zg2uni('ေမ')).toBe('မေ');
  });

  it('round-trips Unicode through Zawgyi mirror', () => {
    const uni = 'မင်္ဂလာပါ';
    expect(zg2uni(uni2zg(uni))).toBe(uni);
  });

  it('accumulates keystrokes like a Zawgyi keyboard session', () => {
    // Simulate: type Zawgyi chars one by one into raw buffer, display Unicode
    let raw = '';
    for (const ch of 'မဂၤလာပါ') {
      raw += ch;
      // intermediate display should be convertible
      expect(hasProgress(zg2uni(raw))).toBe(true);
    }
    expect(zg2uni(raw)).toBe('မင်္ဂလာပါ');
  });
});

function hasProgress(s: string): boolean {
  return s.length > 0;
}
