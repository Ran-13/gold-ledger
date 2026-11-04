import type { CSSProperties, ReactNode } from 'react';
import { IconFilter } from './Icons';
import { colors, radii } from '../styles/tokens';

export const filterInputStyle: CSSProperties = {
  height: 46,
  width: '100%',
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: radii.input,
  padding: '0 14px',
  fontSize: 17,
  fontWeight: 500,
  lineHeight: 1.5,
  background: colors.white,
  color: colors.ink,
  boxSizing: 'border-box',
};

export function FilterField({
  label,
  children,
  grow,
  minWidth,
}: {
  label: string;
  children: ReactNode;
  grow?: number;
  minWidth?: number;
}) {
  return (
    <label
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        flex: grow ?? '0 0 auto',
        minWidth: minWidth ?? undefined,
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 700, color: colors.muted, letterSpacing: '0.015em', lineHeight: 1.5 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

export function FilterPanel({
  title,
  countLabel,
  active,
  onClear,
  children,
}: {
  title?: string;
  countLabel?: string;
  active: boolean;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: `1px solid ${colors.cardBorder}`,
        background: colors.softBg,
      }}
    >
      {(title || countLabel || active) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {title && (
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  color: colors.ink,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <IconFilter size={16} style={{ color: colors.muted }} />
                {title}
              </div>
            )}
            {countLabel && (
              <div style={{ fontSize: 16, color: colors.muted }}>{countLabel}</div>
            )}
          </div>
          {active && (
            <button
              type="button"
              onClick={onClear}
              style={{
                height: 34,
                padding: '0 12px',
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: radii.button,
                background: colors.white,
                color: colors.ink,
                fontSize: 16,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              စစ်ထုတ်မှု ရှင်းမည်
            </button>
          )}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'flex-end',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...filterInputStyle, cursor: 'pointer', ...style }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
