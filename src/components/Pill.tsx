import { colors } from '../styles/tokens';

export function Pill({ type }: { type: 'sell' | 'buy' }) {
  const sell = type === 'sell';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 14px',
        borderRadius: 6,
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 1.5,
        whiteSpace: 'nowrap',
        background: colors.white,
        border: `1.5px solid ${sell ? colors.sell : colors.buy}`,
        color: sell ? colors.sell : colors.buy,
      }}
    >
      {sell ? 'အရောင်း' : 'အဝယ်'}
    </span>
  );
}
