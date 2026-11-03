import { useEffect, useRef, useState } from 'react';
import { Dialog } from './Dialog';
import { createStockAdjustment } from '../db/queries';
import { N, W, keepNumInput, stockFromParts, toYway } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function StockAdjustDialog() {
  const open = useStore((s) => s.stockAdjustDialogOpen);
  const kind = useStore((s) => s.stockAdjustKind);
  const close = useStore((s) => s.closeStockAdjustDialog);
  const refresh = useStore((s) => s.refresh);
  const digits = useStore((s) => s.settings.digits);
  const opening = useStore((s) => s.settings.opening_stock_yway);
  const txns = useStore((s) => s.txns);
  const adjustments = useStore((s) => s.stockAdjustments);
  const kRef = useRef<HTMLInputElement | null>(null);

  const [k, setK] = useState('');
  const [p, setP] = useState('');
  const [y, setY] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setK('');
    setP('');
    setY('');
    setNote('');
    const t = window.setTimeout(() => kRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, kind]);

  const yway = toYway(N(k), N(p), N(y));
  const stockY = stockFromParts(opening, txns, adjustments);
  const isIn = kind === 'in';
  const overdraw = !isIn && yway > 0 && yway > stockY;
  const title = isIn ? 'လက်ကျန် ထည့်မည်' : 'လက်ကျန် လျှော့မည်';
  const subtitle = isIn
    ? 'ဆိုင်ထဲ ရွှေပေါင်းထည့်ခြင်း (ဝယ်စာရင်း မဟုတ်)'
    : 'ဆိုင်ထဲမှ ရွှေလျှော့ခြင်း (ရောင်းစာရင်း မဟုတ်)';

  const field = {
    height: 48,
    border: `1.5px solid ${colors.inputBorder}`,
    borderRadius: radii.input,
    padding: '0 12px',
    fontSize: 20,
    fontWeight: 700,
    textAlign: 'right' as const,
    width: '100%',
    background: colors.white,
  };

  const save = async () => {
    if (yway <= 0) {
      window.alert('ရွှေချိန် ထည့်ပါ');
      kRef.current?.focus();
      return;
    }
    if (overdraw) {
      window.alert(`လက်ကျန်ထက် ပို၍ မရပါ\nလက်ရှိလက်ကျန် · ${W(Math.max(0, stockY), digits)}`);
      kRef.current?.focus();
      return;
    }
    setSaving(true);
    try {
      await createStockAdjustment(kind, yway, note);
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
      title={title}
      subtitle={subtitle}
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
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ပိတ်မည်
          </button>
          <button
            type="button"
            disabled={saving || overdraw}
            onClick={() => void save()}
            style={{
              height: 46,
              padding: '0 22px',
              border: 'none',
              borderRadius: 8,
              background: colors.ink,
              color: colors.white,
              fontSize: 15,
              fontWeight: 700,
              cursor: saving || overdraw ? 'default' : 'pointer',
              opacity: overdraw ? 0.45 : 1,
            }}
          >
            {saving ? 'သိမ်းနေသည်…' : 'သိမ်းဆည်းမည်'}
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          {(
            [
              ['ကျပ်', k, setK, true],
              ['ပဲ', p, setP, false],
              ['ရွေး', y, setY, false],
            ] as const
          ).map(([label, val, set, focus]) => (
            <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>{label}</span>
              <input
                ref={focus ? kRef : undefined}
                type="text"
                inputMode="decimal"
                className="num"
                value={val}
                onChange={(e) => set(keepNumInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void save();
                  }
                }}
                placeholder="0"
                style={field}
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
            border: `1.5px solid ${overdraw ? colors.buy : colors.cardBorder}`,
            borderRadius: 8,
          }}
        >
          <span style={{ fontSize: 14, color: colors.muted }}>
            {isIn ? 'ပေါင်းထည့်မည့် အလေးချိန်' : 'လျှော့မည့် အလေးချိန်'}
          </span>
          <span
            className="num"
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: overdraw ? colors.buy : isIn ? colors.sell : colors.buy,
            }}
          >
            {isIn ? '+' : '−'} {W(yway, digits)}
          </span>
        </div>

        {!isIn && (
          <div
            style={{
              fontSize: 13,
              color: overdraw ? colors.buy : colors.muted2,
              lineHeight: 1.55,
            }}
          >
            လက်ရှိလက်ကျန် · <span className="num">{W(Math.max(0, stockY), digits)}</span>
            {overdraw ? ' — လက်ကျန်ထက် ပို၍ မရပါ' : ''}
          </div>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>မှတ်ချက်</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ဥပမာ — စာရင်းညှိ / ဆုံးရှုံး / ပန်းထိမ် ပြန်လာ"
            style={{
              height: 44,
              border: `1.5px solid ${colors.inputBorder}`,
              borderRadius: radii.input,
              padding: '0 12px',
              fontSize: 14,
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </label>
      </div>
    </Dialog>
  );
}
