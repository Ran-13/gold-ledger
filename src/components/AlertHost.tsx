import { useEffect } from 'react';
import { dialogBtnGhost, dialogBtnPrimary } from './Dialog';
import { useAlertStore } from '../lib/appAlert';
import { colors, radii } from '../styles/tokens';

/** App-wide custom alert / confirm — replaces `window.alert` / `confirm`. */
export function AlertHost() {
  const open = useAlertStore((s) => s.open);
  const mode = useAlertStore((s) => s.mode);
  const title = useAlertStore((s) => s.title);
  const message = useAlertStore((s) => s.message);
  const close = useAlertStore((s) => s.close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        close(mode === 'confirm' ? false : true);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        close(true);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, mode, close]);

  if (!open) return null;

  return (
    <div
      data-noprint="1"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="app-alert-title"
      aria-describedby="app-alert-msg"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <div
        onClick={() => close(mode === 'confirm' ? false : true)}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 36, 0.52)',
          backdropFilter: 'blur(2px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          background: colors.white,
          borderRadius: radii.dialog,
          border: `1.5px solid ${colors.cardBorder}`,
          boxShadow: '0 24px 64px rgba(15,23,36,.28)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '22px 24px 8px' }}>
          <div
            id="app-alert-title"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: colors.ink,
              lineHeight: 1.35,
            }}
          >
            {title}
          </div>
          <div
            id="app-alert-msg"
            style={{
              marginTop: 12,
              fontSize: 18,
              fontWeight: 600,
              color: colors.ink,
              lineHeight: 1.55,
              whiteSpace: 'pre-line',
            }}
          >
            {message}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '16px 24px 20px',
          }}
        >
          {mode === 'confirm' && (
            <button
              type="button"
              onClick={() => close(false)}
              style={{ ...dialogBtnGhost, height: 44, fontSize: 16 }}
            >
              ပယ်ဖျက်မည်
            </button>
          )}
          <button
            type="button"
            autoFocus
            onClick={() => close(true)}
            style={{ ...dialogBtnPrimary, height: 44, fontSize: 16, minWidth: 96 }}
          >
            {mode === 'confirm' ? 'အတည်ပြုမည်' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
