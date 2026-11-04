import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
import { setSetting } from '../db/queries';
import { N, W, YWAY_PER_KYAT, fromYway, keepNumInput, stockFromParts, toYway } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function OpeningDialog() {
  const open = useStore((s) => s.openingStockDialogOpen);
  const close = useStore((s) => s.closeOpeningStockDialog);
  const settings = useStore((s) => s.settings);
  const txns = useStore((s) => s.txns);
  const adjustments = useStore((s) => s.stockAdjustments);
  const refreshSettings = useStore((s) => s.refreshSettings);
  const digits = settings.digits;
  const looseTxns = txns.filter((t) => t.channel !== 'card');

  const [k, setK] = useState('');
  const [p, setP] = useState('');
  const [y, setY] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const parts = fromYway(settings.opening_stock_yway);
    setK(parts.k ? String(Math.abs(parts.k)) : '');
    setP(parts.p ? String(parts.p) : '');
    setY(parts.y ? String(parts.y) : '');
  }, [open, settings.opening_stock_yway]);

  const yway = toYway(N(k), N(p), N(y));
  const projected = stockFromParts(yway, looseTxns, adjustments);
  const wouldGoNegative = projected < 0;

  const field = {
    height: 48,
    border: `1.5px solid ${colors.inputBorder}`,
    borderRadius: radii.input,
    padding: '0 12px',
    fontSize: 22,
    fontWeight: 700,
    textAlign: 'right' as const,
    width: '100%',
    background: colors.white,
  };

  const save = async () => {
    if (wouldGoNegative) {
      window.alert(
        `အစလက်ကျန် လျှော့လို့ မရပါ · လက်ကျန် အနှုတ် ဖြစ်မည်\nရလဒ်လက်ကျန် · ${W(projected, digits)}`,
      );
      return;
    }
    setSaving(true);
    try {
      await setSetting('opening_stock_yway', String(yway));
      await refreshSettings();
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
      title="အစလက်ကျန် သတ်မှတ်မည်"
      onClose={close}
      width={480}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={close}
            style={{
              height: 46,
              padding: '0 18px',
              border: `1.5px solid ${colors.inputBorder}`,
              borderRadius: 8,
              background: colors.white,
              color: colors.muted,
              fontSize: 17,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ပိတ်မည်
          </button>
          <button
            type="button"
            disabled={saving || wouldGoNegative}
            onClick={() => void save()}
            style={{
              height: 46,
              padding: '0 22px',
              border: 'none',
              borderRadius: 8,
              background: colors.ink,
              color: colors.white,
              fontSize: 17,
              fontWeight: 700,
              cursor: saving || wouldGoNegative ? 'default' : 'pointer',
              opacity: wouldGoNegative ? 0.45 : 1,
            }}
          >
            သိမ်းဆည်းမည်
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {(
            [
              ['ကျပ်', k, setK],
              ['ပဲ', p, setP],
              ['ရွေး', y, setY],
            ] as const
          ).map(([label, val, set]) => (
            <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: colors.muted }}>{label}</span>
              <input
                type="text"
                inputMode="decimal"
                className="num"
                value={val}
                onChange={(e) => set(keepNumInput(e.target.value))}
                placeholder="0"
                style={field}
                autoFocus={label === 'ကျပ်'}
              />
            </label>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            border: `1.5px solid ${colors.cardBorder}`,
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 16, color: colors.muted }}>အစလက်ကျန်</span>
          <span className="num" style={{ fontSize: 22, fontWeight: 700, color: colors.ink }}>
            {W(yway, digits)}
          </span>
        </div>
        <div
          style={{
            fontSize: 16,
            color: wouldGoNegative ? colors.buy : colors.muted2,
            lineHeight: 1.55,
          }}
        >
          {wouldGoNegative
            ? `လက်ကျန် အနှုတ် ဖြစ်မည် · ${W(projected, digits)} — အစလက်ကျန် တိုးရန် လိုအပ်သည်`
            : `၁ ကျပ်သား = ${YWAY_PER_KYAT} ရွေး · ဒီတန်ဖိုးကို အဝင်အထွက် မစခင် အခြေခံအဖြစ် သုံးပါမယ်`}
        </div>
      </div>
    </Dialog>
  );
}
