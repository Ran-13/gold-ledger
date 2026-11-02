import { colors } from '../styles/tokens';
import { NAV, Screen, useStore } from '../store';

export function Nav() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);

  return (
    <nav
      data-noprint="1"
      style={{
        background: colors.ink,
        display: 'flex',
        alignItems: 'stretch',
        gap: 28,
        padding: '0 36px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: colors.goldNav,
            color: colors.ink,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 17,
          }}
        >
          သ
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: colors.white, whiteSpace: 'nowrap' }}>
          ဦးသန့်စင်
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'stretch', flex: 1, minWidth: 0 }}>
        {NAV.map((n) => {
          const on = screen === n.key;
          return (
            <button
              key={n.key}
              type="button"
              title={n.title}
              onClick={() => setScreen(n.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                border: 'none',
                borderBottom: on ? `3px solid ${colors.goldNav}` : '3px solid transparent',
                borderTop: '3px solid transparent',
                background: 'transparent',
                color: on ? colors.white : colors.mutedOnNavy,
                fontWeight: on ? 600 : 400,
                fontSize: 16,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {n.label}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          title="ဆက်တင်"
          onClick={() => setScreen('settings' as Screen)}
          style={{
            width: 44,
            height: 44,
            border: `1px solid ${colors.navyBorder}`,
            borderRadius: 8,
            background: 'transparent',
            color: colors.mutedOnNavy,
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ⚙
        </button>
        <button
          type="button"
          onClick={() => setScreen('entry')}
          style={{
            height: 44,
            padding: '0 22px',
            border: 'none',
            borderRadius: 6,
            background: colors.gold,
            color: colors.ink,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = colors.goldHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = colors.gold;
          }}
        >
          + စာရင်းအသစ်
        </button>
      </div>
    </nav>
  );
}
