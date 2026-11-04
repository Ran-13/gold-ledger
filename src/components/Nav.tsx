import { NavIcon, IconLogout, IconSettings } from './Icons';
import { NAV, Screen, useStore } from '../store';
import { TOP_BAR_HEIGHT, colors, radii } from '../styles/tokens';

const WHITE = '#FFFFFF';
const BLACK = colors.ink;
const MUTED = colors.muted2;
const LINE = colors.cardBorder;
const SELECT_BG = '#F1F3F6';

function navItemStyle(on: boolean) {
  return {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: 'calc(100% - 16px)',
    height: 52,
    margin: '0 8px',
    padding: on ? '0 14px 0 16px' : '0 14px 0 18px',
    boxSizing: 'border-box' as const,
    border: 'none',
    borderRadius: radii.sm,
    background: on ? SELECT_BG : 'transparent',
    color: on ? BLACK : MUTED,
    fontWeight: on ? 700 : 700,
    fontSize: 19,
    letterSpacing: 0.02,
    lineHeight: 1.5,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background-color .15s ease, color .15s ease',
  };
}

export function Nav() {
  const screen = useStore((s) => s.screen);
  const setScreen = useStore((s) => s.setScreen);
  const logout = useStore((s) => s.logout);
  const shopName = useStore((s) => s.settings.shop_name);
  const shopMark = useStore((s) => s.settings.shop_mark);
  const shopTagline = useStore((s) => s.settings.shop_tagline);

  return (
    <aside
      data-noprint="1"
      style={{
        width: 268,
        flexShrink: 0,
        height: '100%',
        background: WHITE,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1.5px solid ${LINE}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: TOP_BAR_HEIGHT,
          boxSizing: 'border-box',
          padding: '0 16px',
          borderBottom: `1.5px solid ${LINE}`,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: BLACK,
            color: WHITE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 20,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {shopMark.slice(0, 2)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: BLACK,
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {shopName}
          </div>
          <div
            style={{
              fontSize: 17,
              color: MUTED,
              lineHeight: 1.5,
              marginTop: 4,
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
          gap: 10,
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
                    top: 12,
                    bottom: 12,
                    width: 4,
                    borderRadius: 2,
                    background: BLACK,
                  }}
                />
              )}
              <NavIcon screen={n.key} size={22} stroke={on ? 2.2 : 2} />
              {n.label}
            </button>
          );
        })}
      </nav>

      <div style={{ padding: '14px 0 18px', borderTop: `1.5px solid ${LINE}` }}>
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
                top: 12,
                bottom: 12,
                width: 4,
                borderRadius: 2,
                background: BLACK,
              }}
            />
          )}
          <IconSettings size={22} stroke={screen === 'settings' ? 2.2 : 2} />
          ဆက်တင်
        </button>
        <button
          type="button"
          title="ထွက်မည်"
          onClick={() => logout()}
          style={{ ...navItemStyle(false), marginTop: 4 }}
        >
          <IconLogout size={22} stroke={2} />
          ထွက်မည်
        </button>
      </div>
    </aside>
  );
}
