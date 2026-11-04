import type { CSSProperties, ReactNode } from 'react';
import { cardShadow, colors, radii } from '../styles/tokens';

export function Card({
  children,
  style,
  navy,
  padding = '24px 26px',
}: {
  children: ReactNode;
  style?: CSSProperties;
  navy?: boolean;
  padding?: string | number;
}) {
  return (
    <div
      style={{
        background: navy ? colors.ink : colors.white,
        color: navy ? colors.white : colors.ink,
        border: navy ? `1px solid ${colors.navyBorder}` : `1px solid ${colors.cardBorder}`,
        borderRadius: radii.card,
        boxShadow: navy ? 'none' : cardShadow,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Small section label inside a card */
export function CardLabel({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <div
      style={{
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 1.55,
        letterSpacing: '0.015em',
        color: muted === false ? undefined : colors.muted,
      }}
    >
      {children}
    </div>
  );
}

/** Primary weight figure */
export function WeightFigure({
  children,
  size = 28,
  color,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
}) {
  return (
    <div
      className="num"
      style={{
        fontSize: size,
        fontWeight: 700,
        lineHeight: 1.3,
        color: color ?? colors.ink,
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </div>
  );
}

/** Secondary money line */
export function MoneyLine({ children }: { children: ReactNode }) {
  return (
    <div className="num" style={{ fontSize: 16, fontWeight: 600, color: colors.muted, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}
