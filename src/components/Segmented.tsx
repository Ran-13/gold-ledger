import type { CSSProperties } from 'react';
import { colors, radii } from '../styles/tokens';

type Opt<T extends string> = { value: T; label: string };

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
}: {
  options: Opt<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'sm' | 'chip' | 'big';
}) {
  if (size === 'big') {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`,
          gap: 14,
        }}
      >
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              style={{
                height: 72,
                borderRadius: radii.input,
                fontSize: 17,
                fontWeight: 700,
                lineHeight: 1.5,
                cursor: 'pointer',
                border: on ? `2px solid ${colors.ink}` : `1.5px solid ${colors.cardBorder}`,
                background: on ? colors.ink : colors.white,
                color: on ? colors.white : colors.muted,
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        gap: 3,
        background: colors.white,
        border: `1.5px solid ${colors.cardBorder}`,
        padding: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
      }}
    >
      {options.map((o) => {
        const on = o.value === value;
        const style: CSSProperties =
          size === 'chip'
            ? {
                height: 42,
                padding: '0 18px',
                borderRadius: radii.input,
                fontSize: 15,
                fontWeight: 600,
                lineHeight: 1.5,
                cursor: 'pointer',
                border: on ? `1.5px solid ${colors.ink}` : `1.5px solid transparent`,
                background: on ? colors.ink : 'transparent',
                color: on ? colors.white : colors.ink,
              }
            : {
                height: 36,
                padding: '0 16px',
                border: 'none',
                borderRadius: radii.segment,
                fontSize: 15,
                cursor: 'pointer',
                fontWeight: 600,
                lineHeight: 1.5,
                background: on ? colors.ink : 'transparent',
                color: on ? colors.white : colors.muted,
              };
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            style={style}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
