import { D, money } from '../lib/units';
import { colors } from '../styles/tokens';
import { NAV, useStore } from '../store';
import { isoDate } from '../lib/units';

export function PageHeader() {
  const screen = useStore((s) => s.screen);
  const prices = useStore((s) => s.prices);
  const digits = useStore((s) => s.settings.digits);
  const nav = NAV.find((n) => n.key === screen);
  const title =
    screen === 'settings' ? 'ဆက်တင်' : nav?.title ?? 'ခြုံငုံကြည့်';
  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : 1));
  const cur = sorted[sorted.length - 1] ?? { buy: 0, sell: 0 };
  const today = isoDate();

  return (
    <header
      data-noprint="1"
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        padding: '28px 0 18px',
        margin: '0 48px',
        borderBottom: `2px solid ${colors.ink}`,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.6 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 28, fontSize: 16, color: colors.muted }}>
        <span>
          ဝယ် <b style={{ fontSize: 20, color: colors.ink }}>{money(cur.buy, digits)}</b>
        </span>
        <span>
          ရောင်း{' '}
          <b style={{ fontSize: 20, color: colors.goldDark }}>{money(cur.sell, digits)}</b>
        </span>
        <span>{D(today, digits)}</span>
      </div>
    </header>
  );
}
