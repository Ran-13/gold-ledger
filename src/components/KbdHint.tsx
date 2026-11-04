import { colors, radii } from '../styles/tokens';

/** Small keycap shown on buttons so shop staff can learn shortcuts. */
export function KbdHint({
  children,
  onDark,
}: {
  children: string;
  onDark?: boolean;
}) {
  return (
    <kbd
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '1px 6px',
        borderRadius: radii.xs,
        border: `1px solid ${onDark ? 'rgba(255,255,255,0.45)' : colors.cardBorder}`,
        background: onDark ? 'rgba(255,255,255,0.08)' : colors.white,
        color: onDark ? colors.white : colors.muted2,
        opacity: 0.9,
        fontSize: 11,
        fontWeight: 700,
        fontFamily: 'inherit',
        letterSpacing: '0.02em',
        lineHeight: 1.35,
      }}
    >
      {children}
    </kbd>
  );
}
