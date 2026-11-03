import { useEffect, type ReactNode } from 'react';
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
}: {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  width?: number | string;
  footer?: ReactNode;
  headerRight?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        padding: 24,
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(27, 42, 65, 0.4)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: width,
          maxHeight: 'min(92vh, 960px)',
          display: 'flex',
          flexDirection: 'column',
          background: colors.white,
          color: colors.ink,
          borderRadius: 12,
          boxShadow: '0 20px 56px rgba(27,42,65,.18)',
          border: `1.5px solid ${colors.cardBorder}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 16,
            padding: '16px 22px',
            borderBottom: `1px solid ${colors.cardBorder}`,
            flexShrink: 0,
            background: colors.white,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, lineHeight: 1.45 }}>{title}</h2>
            {subtitle && (
              <div style={{ marginTop: 4, fontSize: 14, color: colors.muted, lineHeight: 1.5 }}>
                {subtitle}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              aria-label="ပိတ်မည်"
              style={{
                width: 36,
                height: 36,
                border: `1.5px solid ${colors.inputBorder}`,
                borderRadius: radii.button,
                background: colors.white,
                color: colors.muted,
                fontSize: 20,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        </div>
        <div style={{ overflow: 'auto', padding: '20px 22px', flex: 1, minHeight: 0 }}>
          {children}
        </div>
        {footer && (
          <div
            style={{
              padding: '14px 22px 16px',
              borderTop: `1px solid ${colors.cardBorder}`,
              background: colors.white,
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
