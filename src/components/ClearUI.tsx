import { Children, type CSSProperties, type ReactNode } from 'react';
import { cardShadow, colors, radii } from '../styles/tokens';

/** Page title — same weight as စာရင်းအင်း */
export function PageTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 700,
          lineHeight: 1.35,
          letterSpacing: '0.015em',
        }}
      >
        {children}
      </h1>
      {right}
    </div>
  );
}

/** Big money / weight answer — end-user first glance */
export function AnswerBlock({
  eyebrow,
  value,
  unit,
  tone = 'ink',
  foot,
  wide,
  onClick,
}: {
  eyebrow: string;
  value: string;
  unit?: string;
  tone?: 'sell' | 'buy' | 'ink';
  foot?: string;
  wide?: boolean;
  onClick?: () => void;
}) {
  const color = tone === 'sell' ? colors.sell : tone === 'buy' ? colors.buy : colors.ink;
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter') onClick();
            }
          : undefined
      }
      style={{
        gridColumn: wide ? '1 / -1' : undefined,
        padding: wide ? '26px 28px' : '22px 26px',
        borderRadius: radii.card,
        border: `1px solid ${colors.cardBorder}`,
        boxShadow: cardShadow,
        background: colors.white,
        cursor: onClick ? 'pointer' : undefined,
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: colors.muted, lineHeight: 1.4 }}>{eyebrow}</div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          marginTop: 8,
          flexWrap: 'wrap',
        }}
      >
        <div
          className="num"
          style={{
            fontSize: wide ? 38 : 30,
            fontWeight: 700,
            color,
            letterSpacing: '-0.02em',
            lineHeight: 1.55,
          }}
        >
          {value}
        </div>
        {unit ? (
          <div style={{ fontSize: 15, fontWeight: 500, color: colors.muted2 }}>{unit}</div>
        ) : null}
      </div>
      {foot ? (
        <div style={{ fontSize: 14, color: colors.muted2, marginTop: 8, lineHeight: 1.45 }}>{foot}</div>
      ) : null}
    </div>
  );
}

export function MiniFact({
  label,
  value,
  tone = 'ink',
  sub,
}: {
  label: string;
  value: string;
  tone?: 'sell' | 'buy' | 'ink';
  sub?: string;
}) {
  const color = tone === 'sell' ? colors.sell : tone === 'buy' ? colors.buy : colors.ink;
  return (
    <div style={{ padding: '2px 0', minWidth: 0 }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: colors.muted, lineHeight: 1.45 }}>{label}</div>
      <div
        className="num"
        style={{
          fontSize: 26,
          fontWeight: 700,
          color,
          marginTop: 6,
          lineHeight: 1.55,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
      {sub ? (
        <div style={{ fontSize: 14, color: colors.muted2, marginTop: 4, lineHeight: 1.55 }}>{sub}</div>
      ) : null}
    </div>
  );
}

/** One clean strip of stats — hairline dividers, no nested cards */
export function StatStrip({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        gap: 0,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: radii.card,
        boxShadow: cardShadow,
        background: colors.white,
        overflow: 'hidden',
      }}
    >
      {items.map((child, i) => (
        <div
          key={i}
          style={{
            padding: '22px 24px',
            borderLeft: i === 0 ? 'none' : `1px solid ${colors.rowDivider}`,
            minWidth: 0,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 15, fontWeight: 600, color: colors.muted, lineHeight: 1.45 }}>{children}</div>
  );
}

export function TextBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        color: colors.ink,
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
        padding: 0,
        lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  );
}

/** Shared table header cell — HANDOFF ledger table */
export const tableTh: CSSProperties = {
  padding: '14px 16px',
  fontWeight: 600,
  fontSize: 15,
  color: colors.muted,
  textAlign: 'left',
  whiteSpace: 'nowrap',
  lineHeight: 1.45,
  background: colors.white,
};

/** Shared table body cell — HANDOFF: border-top 1px #EEF0F3, pad 16×20 */
export const tableTd: CSSProperties = {
  padding: '16px 16px',
  borderTop: `1px solid ${colors.rowDivider}`,
  borderBottom: 'none',
  fontSize: 16,
  verticalAlign: 'middle',
  lineHeight: 1.5,
};

export const tableHover = '#F3F5F8';

export const clearPrimaryBtn: CSSProperties = {
  height: 46,
  padding: '0 18px',
  border: 'none',
  borderRadius: radii.button,
  background: colors.ink,
  color: colors.white,
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  lineHeight: 1.3,
};

export const clearOutlineBtn: CSSProperties = {
  height: 46,
  padding: '0 16px',
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: radii.button,
  background: colors.white,
  color: colors.ink,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  lineHeight: 1.3,
};
