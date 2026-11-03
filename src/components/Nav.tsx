import { NavIcon, IconSettings } from './Icons';
import { NAV, Screen, useStore } from '../store';
import { TOP_BAR_HEIGHT } from '../styles/tokens';

const WHITE = '#FFFFFF';
const BLACK = '#111111';
const MUTED = '#6B6B6B';
const LINE = '#E5E5E5';
const SELECT_BG = '#F4F4F4';

function navItemStyle(on: boolean) {
  return {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: 'calc(100% - 16px)',
    height: 46,
    margin: '0 8px',
    padding: on ? '0 12px 0 14px' : '0 12px 0 16px',
    boxSizing: 'border-box' as const,
    border: 'none',
    borderRadius: 6,
    background: on ? SELECT_BG : 'transparent',
    color: on ? BLACK : MUTED,
    fontWeight: on ? 700 : 450,
    fontSize: 16,
    letterSpacing: 0.15,
    lineHeight: 1.45,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color .15s ease, color .15s ease',
  };
}

export function Nav() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const shopName = useStore((s) => s.settings.shop_name);
  const shopMark = useStore((s) => s.settings.shop_mark);
  const shopTagline = useStore((s) => s.settings.shop_tagline);

  return (
    <aside
      data-noprint="1"
      style={{
        width: 236,
        flexShrink: 0,
        height: '100%',
        background: WHITE,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${LINE}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: TOP_BAR_HEIGHT,
          boxSizing: 'border-box',
          padding: '0 18px',
          borderBottom: `1px solid ${LINE}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: BLACK,
            color: WHITE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 15,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {shopMark.slice(0, 2)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: BLACK,
              lineHeight: 1.45,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {shopName}
          </div>
          <div
            style={{
              fontSize: 12,
              color: MUTED,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {shopTagline}
          </div>
        </div>
      </div>

      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {NAV.map((n) => {
          const on = screen === n.key;
          return (
            <button
              key={n.key}
              type="button"
              title={n.title}
              onClick={() => setScreen(n.key)}
              style={navItemStyle(on)}
            >
              {on && (
                <span
                  aria-hidden
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 11,
                    bottom: 11,
                    width: 2.5,
                    borderRadius: 2,
                    background: BLACK,
                  }}
                />
              )}
              <NavIcon screen={n.key} size={18} stroke={on ? 1.9 : 1.6} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '12px 0 16px', borderTop: `1px solid ${LINE}` }}>
        <button
          type="button"
          title="ဆက်တင်"
          onClick={() => setScreen('settings' as Screen)}
          style={navItemStyle(screen === 'settings')}
        >
          {screen === 'settings' && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                top: 11,
                bottom: 11,
                width: 2.5,
                borderRadius: 2,
                background: BLACK,
              }}
            />
          )}
          <IconSettings size={18} stroke={screen === 'settings' ? 1.9 : 1.6} />
          ဆက်တင်
        </button>
      </div>
    </aside>
  );
}
