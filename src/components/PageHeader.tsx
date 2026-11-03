import { D, money } from '../lib/units';
import { colors } from '../styles/tokens';
import { NAV, useStore } from '../store';

export function PageHeader() {
  const screen = useStore((s) => s.screen);
  const nav = NAV.find((n) => n.key === screen);
  const title = screen === 'settings' ? 'ဆက်တင်' : (nav?.title ?? 'ခြုံငုံကြည့်');

  return (
    <header
      data-noprint="1"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 24px',
        background: colors.white,
        borderBottom: `1px solid ${colors.cardBorder}`,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          lineHeight: 1.55,
        }}
      >
        {title}
      </h1>
    </header>
  );
}
