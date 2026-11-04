import { useRef } from 'react';
import { IconCalendar } from './Icons';
import { formatDate, type DigitsMode } from '../lib/units';
import { colors, radii } from '../styles/tokens';

export function DateChip({
  value,
  digits,
  onChange,
  caption,
  min,
  max,
}: {
  value: string;
  digits: DigitsMode;
  onChange?: (iso: string) => void;
  caption?: string;
  min?: string;
  max?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el || !onChange) return;
    try {
      if (typeof el.showPicker === 'function') {
        el.showPicker();
        return;
      }
    } catch {
      /* overlay click / unsupported */
    }
    el.focus();
  };

  const chip = (
    <div
      role={onChange ? 'button' : undefined}
      tabIndex={onChange ? 0 : undefined}
      onClick={onChange ? openPicker : undefined}
      onKeyDown={
        onChange
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }
          : undefined
      }
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: radii.button,
        background: colors.white,
        border: `1.5px solid ${colors.cardBorder}`,
        color: colors.ink,
        cursor: onChange ? 'pointer' : 'default',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: radii.md,
          background: '#EEF2F7',
          color: colors.ink,
          flexShrink: 0,
          pointerEvents: 'none',
        }}
      >
        <IconCalendar size={17} />
      </span>
      <span
        className="num"
        style={{
          fontSize: 20,
          fontWeight: 700,
          letterSpacing: 0.3,
          lineHeight: 1.2,
          pointerEvents: 'none',
        }}
      >
        {formatDate(value, digits)}
      </span>
      {onChange ? (
        <input
          ref={inputRef}
          className="date-chip-input"
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const next = e.target.value;
            if (next) onChange(next);
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={caption ?? 'ရက်စွဲ'}
        />
      ) : null}
    </div>
  );

  if (!caption) return chip;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: colors.muted,
          letterSpacing: '0.015em',
          lineHeight: 1.5,
        }}
      >
        {caption}
      </span>
      {chip}
    </div>
  );
}
