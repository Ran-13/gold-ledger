import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { IconX } from './Icons';
import { colors, radii } from '../styles/tokens';

export function Dialog({
  open,
  title,
  subtitle,
  onClose,
  children,
  width = 720,
  footer,
  headerRight,
  toolbar,
  compact,
  full,
  closeOnEsc = true,
}: {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number | string;
  footer?: ReactNode;
  headerRight?: ReactNode;
  toolbar?: ReactNode;
  /** Tighter chrome — prefer fitting without scroll */
  compact?: boolean;
  /** Nearly full-page sheet */
  full?: boolean;
  closeOnEsc?: boolean;
}) {
  useEffect(() => {
    if (!open || !closeOnEsc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, closeOnEsc]);

  if (!open) return null;

  return (
    <div
      data-noprint="1"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : 'dialog'}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: full ? 8 : 24,
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 36, 0.48)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: width,
          height: full ? '96vh' : undefined,
          maxHeight: full ? '96vh' : compact ? 'min(92vh, 820px)' : 'min(90vh, 920px)',
          display: 'flex',
          flexDirection: 'column',
          background: colors.white,
          color: colors.ink,
          borderRadius: radii.dialog,
          boxShadow: '0 24px 64px rgba(15,23,36,.22), 0 2px 8px rgba(15,23,36,.08)',
          border: `1.5px solid ${colors.cardBorder}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            padding: compact || full ? '14px 20px' : '22px 24px 18px',
            flexShrink: 0,
            background: colors.white,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2
              style={{
                margin: 0,
                fontSize: compact || full ? 24 : 28,
                fontWeight: 700,
                lineHeight: 1.4,
                letterSpacing: '0.015em',
                color: colors.ink,
              }}
            >
              {title}
              {compact && subtitle ? (
                <span
                  style={{
                    marginLeft: 12,
                    fontSize: 17,
                    fontWeight: 700,
                    color: colors.muted,
                  }}
                >
                  {subtitle}
                </span>
              ) : null}
            </h2>
            {!compact && subtitle ? (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 18,
                  color: colors.muted,
                  lineHeight: 1.5,
                  fontWeight: 600,
                }}
              >
                {subtitle}
              </div>
            ) : null}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              aria-label="ပိတ်မည်"
              style={{
                width: 36,
                height: 36,
                border: 'none',
                borderRadius: '50%',
                background: colors.ink,
                color: colors.white,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <IconX size={18} stroke={2.2} />
            </button>
          </div>
        </div>

        <div
          style={{
            height: 1,
            background: colors.rowDivider,
            margin: compact ? '0 20px' : '0 24px',
            flexShrink: 0,
          }}
        />

        {toolbar ? (
          <div
            style={{
              padding: compact ? '10px 20px 12px' : '12px 24px 14px',
              flexShrink: 0,
              background: colors.white,
            }}
          >
            {toolbar}
          </div>
        ) : null}

        <div
          style={{
            overflow: 'auto',
            padding: full ? 0 : compact ? '14px 20px 10px' : '20px 24px 8px',
            flex: 1,
            minHeight: 0,
          }}
        >
          {children}
        </div>

        {footer && (
          <div
            style={{
              padding: compact ? '12px 20px 14px' : '16px 24px 20px',
              borderTop: `1.5px solid ${colors.rowDivider}`,
              background: '#FAFBFC',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** Shared dialog footer buttons */
export const dialogBtnGhost: CSSProperties = {
  height: 48,
  padding: '0 18px',
  border: `1.5px solid ${colors.inputBorder}`,
  borderRadius: radii.button,
  background: colors.white,
  color: colors.muted,
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
  lineHeight: 1.4,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

export const dialogBtnPrimary: CSSProperties = {
  height: 48,
  padding: '0 20px',
  border: 'none',
  borderRadius: radii.button,
  background: colors.ink,
  color: colors.white,
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
  lineHeight: 1.4,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

export const dialogField: CSSProperties = {
  height: 52,
  width: '100%',
  boxSizing: 'border-box',
  border: `1.5px solid ${colors.inputBorder}`,
  borderRadius: radii.input,
  padding: '0 14px',
  fontSize: 20,
  fontWeight: 700,
  background: colors.white,
  color: colors.ink,
};

export const dialogLabel: CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: colors.muted,
  letterSpacing: '0.015em',
  lineHeight: 1.5,
};
