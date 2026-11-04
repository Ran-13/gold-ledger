import { CARD_DENOMS, type CardDenom } from '../lib/cards';
import { D, DigitsMode, N, W, keepNumInput } from '../lib/units';
import { colors, radii } from '../styles/tokens';

export function CardQtyPicker({
  qty,
  stock,
  digits,
  sellMode,
  compact,
  onChange,
}: {
  qty: Record<CardDenom, string>;
  stock: Record<CardDenom, number>;
  digits: DigitsMode;
  sellMode?: boolean;
  /** Dense 3-column grid — fits entry dialog without scroll */
  compact?: boolean;
  onChange: (denom: CardDenom, value: string) => void;
}) {
  const bump = (denom: CardDenom, delta: number) => {
    const next = Math.max(0, (Math.floor(N(qty[denom])) || 0) + delta);
    onChange(denom, next ? String(next) : '');
  };

  if (compact) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 10,
        }}
      >
        {CARD_DENOMS.map((d) => {
          const have = stock[d.id] ?? 0;
          const want = Math.floor(N(qty[d.id])) || 0;
          const bad = !!sellMode && want > have;
          const active = want > 0;
          return (
            <div
              key={d.id}
              style={{
                padding: '10px 10px 12px',
                borderRadius: radii.card,
                border: `1.5px solid ${bad ? colors.buy : active ? colors.ink : colors.cardBorder}`,
                background: bad ? 'rgba(178,58,42,.04)' : active ? '#F7F8FA' : colors.white,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.35 }}>{d.label}</div>
                <div
                  className="num"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: bad ? colors.buy : colors.muted2,
                    lineHeight: 1.35,
                  }}
                >
                  လက်ကျန် {D(have, digits)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <StepBtn label="−" onClick={() => bump(d.id, -1)} disabled={want <= 0} compact />
                <input
                  type="text"
                  inputMode="numeric"
                  className="num"
                  value={qty[d.id]}
                  onChange={(e) =>
                    onChange(d.id, keepNumInput(e.target.value).replace(/\./g, ''))
                  }
                  placeholder="0"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: 38,
                    border: `1.5px solid ${bad ? colors.buy : colors.inputBorder}`,
                    borderRadius: radii.input,
                    textAlign: 'center',
                    fontSize: 18,
                    fontWeight: 700,
                    background: colors.white,
                    color: bad ? colors.buy : colors.ink,
                  }}
                />
                <StepBtn
                  label="+"
                  onClick={() => bump(d.id, 1)}
                  disabled={!!sellMode && want >= have}
                  compact
                />
              </div>
              {want > 0 && (
                <div
                  className="num"
                  style={{
                    marginTop: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: colors.muted,
                    textAlign: 'center',
                    lineHeight: 1.4,
                  }}
                >
                  {W(want * d.yway, digits)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: radii.card,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.1fr) auto minmax(88px, auto)',
          gap: 8,
          padding: '8px 12px',
          background: '#F7F8FA',
          borderBottom: `1px solid ${colors.rowDivider}`,
          fontSize: 13,
          fontWeight: 700,
          color: colors.muted,
          lineHeight: 1.45,
        }}
      >
        <div>အကယ်ဒမီအခေါက်ရွှေ</div>
        <div style={{ textAlign: 'center' }}>အရေအတွက်</div>
        <div style={{ textAlign: 'right' }}>အလေးချိန်</div>
      </div>
      {CARD_DENOMS.map((d, i) => {
        const have = stock[d.id] ?? 0;
        const want = Math.floor(N(qty[d.id])) || 0;
        const bad = !!sellMode && want > have;
        const active = want > 0;
        return (
          <div
            key={d.id}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) auto minmax(88px, auto)',
              gap: 8,
              alignItems: 'center',
              padding: '9px 12px',
              borderTop: i ? `1px solid ${colors.rowDivider}` : 'none',
              background: bad ? 'rgba(178,58,42,.05)' : active ? 'rgba(27,42,65,.04)' : colors.white,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.ink, lineHeight: 1.45 }}>
                {d.label}
              </div>
              <div
                className="num"
                style={{
                  fontSize: 13,
                  color: bad ? colors.buy : colors.muted2,
                  marginTop: 3,
                  lineHeight: 1.4,
                }}
              >
                လက်ကျန် {D(have, digits)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <StepBtn label="−" onClick={() => bump(d.id, -1)} disabled={want <= 0} />
              <input
                type="text"
                inputMode="numeric"
                className="num"
                value={qty[d.id]}
                onChange={(e) =>
                  onChange(d.id, keepNumInput(e.target.value).replace(/\./g, ''))
                }
                placeholder="0"
                style={{
                  width: 48,
                  height: 34,
                  border: `1px solid ${bad ? colors.buy : colors.inputBorder}`,
                  borderRadius: radii.input,
                  textAlign: 'center',
                  fontSize: 17,
                  fontWeight: 700,
                  background: colors.white,
                  color: bad ? colors.buy : colors.ink,
                }}
              />
              <StepBtn
                label="+"
                onClick={() => bump(d.id, 1)}
                disabled={!!sellMode && want >= have}
              />
            </div>

            <div
              className="num"
              style={{
                textAlign: 'right',
                fontSize: 14,
                fontWeight: 700,
                color: want ? colors.ink : colors.muted2,
                whiteSpace: 'nowrap',
              }}
            >
              {want ? W(want * d.yway, digits) : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepBtn({
  label,
  onClick,
  disabled,
  compact,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        width: compact ? 32 : 28,
        height: compact ? 38 : 32,
        border: `1px solid ${colors.inputBorder}`,
        borderRadius: radii.button,
        background: colors.white,
        color: disabled ? colors.muted2 : colors.ink,
        fontSize: 17,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}
