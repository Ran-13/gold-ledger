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
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))`, gap: 16 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              style={{
                height: 76,
                borderRadius: radii.input,
                fontSize: 17,
                fontWeight: 700,
                cursor: 'pointer',
                border: on ? `2px solid ${colors.gold}` : `1px solid ${colors.borderSoft}`,
                background: on ? colors.ink : colors.white,
                color: on ? colors.goldOnNavy : colors.muted,
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
      style={{
        display: 'flex',
        gap: 4,
        background: colors.segmentTrack,
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
                height: 44,
                padding: '0 20px',
                borderRadius: radii.input,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                border: on ? `1px solid ${colors.gold}` : `1px solid ${colors.inputBorder}`,
                background: on ? colors.gold : colors.white,
                color: colors.ink,
              }
            : {
                height: 38,
                padding: '0 18px',
                border: 'none',
                borderRadius: radii.input,
                fontSize: 15,
                cursor: 'pointer',
                fontWeight: 600,
                background: on ? colors.ink : 'transparent',
                color: on ? colors.goldOnNavy : colors.muted,
              };
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} style={style}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
