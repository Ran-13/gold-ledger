import { colors } from '../styles/tokens';

export function Pill({ type }: { type: 'sell' | 'buy' }) {
  const sell = type === 'sell';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '5px 12px',
        borderRadius: 6,
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 1.45,
        whiteSpace: 'nowrap',
        background: sell ? colors.sellPillBg : colors.buyPillBg,
        border: `1px solid ${sell ? colors.sell : colors.buy}`,
        color: sell ? colors.sell : colors.buy,
      }}
    >
      {sell ? 'အရောင်း' : 'အဝယ်'}
    </span>
  );
}
