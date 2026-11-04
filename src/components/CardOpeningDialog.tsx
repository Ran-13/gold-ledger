import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
import { IconSave } from './Icons';
import { setCardOpenings } from '../db/queries';
import { CARD_DENOMS, type CardDenom } from '../lib/cards';
import { D, N, W, keepNumInput } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function CardOpeningDialog() {
  const open = useStore((s) => s.cardOpeningDialogOpen);
  const close = useStore((s) => s.closeCardOpeningDialog);
  const openings = useStore((s) => s.cardOpenings);
  const refresh = useStore((s) => s.refresh);
  const digits = useStore((s) => s.settings.digits);
  const [qty, setQty] = useState<Record<CardDenom, string>>(() =>
    Object.fromEntries(CARD_DENOMS.map((d) => [d.id, ''])) as Record<CardDenom, string>,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const map = Object.fromEntries(openings.map((o) => [o.denom, o.qty]));
    setQty(
      Object.fromEntries(
        CARD_DENOMS.map((d) => [d.id, map[d.id] ? String(map[d.id]) : '']),
      ) as Record<CardDenom, string>,
    );
  }, [open, openings]);

  const save = async () => {
    setSaving(true);
    try {
      const next: Record<string, number> = {};
      for (const d of CARD_DENOMS) {
        next[d.id] = Math.max(0, Math.floor(N(qty[d.id])) || 0);
      }
      await setCardOpenings(next);
      await refresh();
      close();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      title="အကယ်ဒမီအခေါက်ရွှေ အစလက်ကျန်"
      onClose={close}
      width={520}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={close} style={ghostBtn}>
            ပိတ်မည်
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            style={primaryBtn}
          >
            <IconSave size={16} />
            သိမ်းမည်
          </button>
        </div>
      }
    >
      <div
        style={{
          border: `1.5px solid ${colors.cardBorder}`,
          borderRadius: radii.card,
          overflow: 'hidden',
        }}
      >
        {CARD_DENOMS.map((d, i) => (
          <div
            key={d.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              gap: 16,
              alignItems: 'center',
              padding: '12px 16px',
              borderTop: i ? `1px solid ${colors.rowDivider}` : 'none',
            }}
          >
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{d.label}</div>
              <div className="num" style={{ fontSize: 15, color: colors.muted2, marginTop: 2 }}>
                ယခု · {D(openings.find((o) => o.denom === d.id)?.qty ?? 0, digits)} ·{' '}
                {W((openings.find((o) => o.denom === d.id)?.qty ?? 0) * d.yway, digits)}
              </div>
            </div>
            <input
              type="text"
              inputMode="numeric"
              className="num"
              value={qty[d.id]}
              onChange={(e) =>
                setQty((q) => ({
                  ...q,
                  [d.id]: keepNumInput(e.target.value).replace(/\./g, ''),
                }))
              }
              placeholder="0"
              style={{
                width: 88,
                height: 42,
                border: `1.5px solid ${colors.inputBorder}`,
                borderRadius: radii.input,
                textAlign: 'right',
                fontSize: 20,
                fontWeight: 700,
                padding: '0 12px',
              }}
            />
          </div>
        ))}
      </div>
    </Dialog>
  );
}

const ghostBtn = {
  height: 46,
  padding: '0 18px',
  border: `1.5px solid ${colors.inputBorder}`,
  borderRadius: radii.button,
  background: colors.white,
  color: colors.muted,
  fontSize: 17,
  fontWeight: 600,
  cursor: 'pointer',
} as const;

const primaryBtn = {
  height: 46,
  padding: '0 22px',
  border: 'none',
  borderRadius: radii.button,
  background: colors.ink,
  color: colors.white,
  fontSize: 17,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
} as const;
