import type { CSSProperties, ReactNode } from 'react';
import { cardShadow, colors, radii } from '../styles/tokens';

export function Card({
  children,
  style,
  navy,
  padding = '24px 28px',
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
        boxShadow: navy ? undefined : cardShadow,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
