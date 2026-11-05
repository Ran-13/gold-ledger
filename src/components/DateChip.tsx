import { useRef, useState } from 'react';
import { IconCalendar, IconChevronDown } from './Icons';
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
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const interactive = !!onChange;
  const active = interactive && (hover || focus);

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
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? openPicker : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openPicker();
              }
            }
          : undefined
      }
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => interactive && setFocus(true)}
      onBlur={() => setFocus(false)}
      title={interactive ? 'ရက်စွဲ ရွေးရန် နှိပ်ပါ' : undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: interactive ? '8px 12px 8px 10px' : '8px 14px',
        borderRadius: radii.button,
        background: active ? '#F3F6FA' : colors.white,
        border: `1.5px solid ${active ? colors.ink : interactive ? colors.inputBorder : colors.cardBorder}`,
        boxShadow: active
          ? '0 0 0 3px rgba(15, 26, 43, 0.08)'
          : interactive
            ? '0 1px 2px rgba(15, 23, 36, 0.06)'
            : 'none',
        color: colors.ink,
        cursor: interactive ? 'pointer' : 'default',
        overflow: 'hidden',
        transition: 'border-color 120ms ease, background 120ms ease, box-shadow 120ms ease',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 34,
          height: 34,
          borderRadius: radii.md,
          background: interactive ? colors.ink : '#EEF2F7',
          color: interactive ? colors.white : colors.ink,
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
      {interactive ? (
        <>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginLeft: 2,
              paddingLeft: 8,
              borderLeft: `1px solid ${colors.rowDivider}`,
              color: active ? colors.ink : colors.muted2,
              fontSize: 14,
              fontWeight: 700,
              lineHeight: 1.2,
              pointerEvents: 'none',
              flexShrink: 0,
            }}
          >
            ရွေးရန်
            <IconChevronDown size={15} />
          </span>
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
            aria-label={caption ?? 'ရက်စွဲ ရွေးရန်'}
          />
        </>
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
