import type { CSSProperties } from 'react';
import type { DigitsMode } from './units';
import { colors } from '../styles/tokens';

export function pillStyle(type: 'sell' | 'buy'): CSSProperties {
  return {
    display: 'inline-block',
    padding: '3px 14px',
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    background: type === 'sell' ? colors.sellPillBg : colors.buyPillBg,
    color: type === 'sell' ? colors.sell : colors.buy,
  };
}

export function typeLabel(type: 'sell' | 'buy'): string {
  return type === 'sell' ? 'ရောင်း' : 'ဝယ်';
}

export function customerName(
  id: number | null,
  map: Map<number, { name: string }>,
): string {
  if (id == null) return 'ဖောက်သည်အထွေထွေ';
  return map.get(id)?.name ?? 'ဖောက်သည်အထွေထွေ';
}

export type { DigitsMode };
