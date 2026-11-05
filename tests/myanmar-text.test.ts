import { describe, expect, it } from 'vitest';
import { toUnicodeMy } from '../src/lib/myanmarText';

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
