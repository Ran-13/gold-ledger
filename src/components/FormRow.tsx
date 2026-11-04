import type { CSSProperties, ReactNode } from 'react';
import { colors, radii } from '../styles/tokens';

/** Label-left / control-right row — familiar desktop form pattern */
export function FormRow({
  label,
  children,
  labelWidth = 100,
}: {
  label: string;
  children: ReactNode;
  labelWidth?: number;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${labelWidth}px minmax(0, 1fr)`,
        gap: 10,
        alignItems: 'center',
      }}
    >
      <span style={{ fontSize: 16, fontWeight: 700, color: colors.muted, lineHeight: 1.55 }}>
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

export const formInput: CSSProperties = {
  height: 46,
  width: '100%',
  boxSizing: 'border-box',
  border: `1.5px solid ${colors.inputBorder}`,
  borderRadius: radii.input,
  padding: '0 14px',
  fontSize: 17,
  fontWeight: 500,
  lineHeight: 1.5,
  background: colors.white,
  color: colors.ink,
};

export const formSection: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  padding: 16,
  background: colors.white,
  border: `1.5px solid ${colors.cardBorder}`,
  borderRadius: radii.card,
};

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 17,
        fontWeight: 700,
        color: colors.ink,
        paddingBottom: 8,
        marginBottom: 4,
        borderBottom: `1.5px solid ${colors.rowDivider}`,
        lineHeight: 1.5,
        letterSpacing: '0.015em',
      }}
    >
      {children}
    </div>
  );
}
