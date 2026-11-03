import type { CSSProperties, ReactNode } from 'react';
import { cardShadow, colors, radii } from '../styles/tokens';

export function Card({
  children,
  style,
  navy,
  padding = '26px 28px',
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
        border: navy ? `1px solid ${colors.navyBorder}` : `1.5px solid ${colors.cardBorder}`,
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
        fontSize: 15,
        fontWeight: 600,
        lineHeight: 1.6,
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
  size = 26,
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
        lineHeight: 1.35,
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
    <div className="num" style={{ fontSize: 15, color: colors.muted, lineHeight: 1.6 }}>
      {children}
    </div>
  );
}
