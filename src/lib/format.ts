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
    background: colors.white,
    border: `1.5px solid ${type === 'sell' ? colors.sell : colors.buy}`,
    color: type === 'sell' ? colors.sell : colors.buy,
  };
}

export function typeLabel(type: 'sell' | 'buy'): string {
  return type === 'sell' ? 'အရောင်း' : 'အဝယ်';
}

export function customerName(
  id: number | null,
  map: Map<number, { name: string }>,
): string {
  if (id == null) return 'ဝယ်သူအထွေထွေ';
  return map.get(id)?.name ?? 'ဝယ်သူအထွေထွေ';
}

export type { DigitsMode };
