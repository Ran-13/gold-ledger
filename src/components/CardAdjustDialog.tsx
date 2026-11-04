import { useEffect, useMemo, useState } from 'react';
import { Dialog, dialogBtnGhost, dialogBtnPrimary } from './Dialog';
import { IconSave } from './Icons';
import { createCardAdjustment } from '../db/queries';
import { CARD_DENOMS, computeCardStock } from '../lib/cards';
import { D, N, W, keepNumInput } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function CardAdjustDialog() {
  const open = useStore((s) => s.cardAdjustDialogOpen);
  const kind = useStore((s) => s.cardAdjustKind);
  const denom = useStore((s) => s.cardAdjustDenom);
  const close = useStore((s) => s.closeCardAdjustDialog);
  const refresh = useStore((s) => s.refresh);
  const digits = useStore((s) => s.settings.digits);
  const txns = useStore((s) => s.txns);
  const cardOpenings = useStore((s) => s.cardOpenings);
  const cardAdjustments = useStore((s) => s.cardAdjustments);
  const txnCards = useStore((s) => s.txnCards);

  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const stock = useMemo(() => {
    const typeById = new Map(txns.map((t) => [t.id, t.type]));
    return computeCardStock({
      openings: cardOpenings,
      adjustments: cardAdjustments,
      txnCards: txnCards.map((c) => ({
        type: typeById.get(c.txn_id) ?? 'sell',
        denom: c.denom,
        qty: c.qty,
      })),
    });
  }, [cardOpenings, cardAdjustments, txnCards, txns]);

  useEffect(() => {
    if (!open) return;
    setQty('');
    setNote('');
  }, [open, kind, denom]);

  if (!denom) return null;

  const n = Math.floor(N(qty)) || 0;
  const have = stock[denom] ?? 0;
  const isIn = kind === 'in';
  const overdraw = !isIn && n > have;
  const def = CARD_DENOMS.find((d) => d.id === denom)!;

  const save = async () => {
    if (n <= 0) {
      window.alert('ကဒ် အရေအတွက် ထည့်ပါ');
      return;
    }
    if (overdraw) {
      window.alert(`အကယ်ဒမီအခေါက်ရွှေ မလုံလောက်ပါ · လက်ကျန် ${have}`);
      return;
    }
    setSaving(true);
    try {
      await createCardAdjustment(kind, denom, n, note);
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
      title={isIn ? `${def.label} အကယ်ဒမီအခေါက်ရွှေ ထည့်မည်` : `${def.label} အကယ်ဒမီအခေါက်ရွှေ လျှော့မည်`}
      onClose={close}
      width={400}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={close} style={dialogBtnGhost}>
            ပိတ်မည်
          </button>
          <button
            type="button"
            disabled={saving || overdraw}
            onClick={() => void save()}
            style={{
              ...dialogBtnPrimary,
              cursor: saving || overdraw ? 'default' : 'pointer',
              opacity: overdraw ? 0.45 : 1,
            }}
          >
            <IconSave size={16} />
            သိမ်းမည်
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            padding: '12px 14px',
            borderRadius: radii.card,
            border: `1.5px solid ${colors.cardBorder}`,
            background: '#F7F8FA',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: colors.muted }}>အကယ်ဒမီအခေါက်ရွှေ အမျိုးအစား</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{def.label}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: colors.muted }}>လက်ကျန်</div>
            <div className="num" style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>
              {D(have, digits)}
            </div>
            <div className="num" style={{ fontSize: 14, color: colors.muted2 }}>
              {W(have * def.yway, digits)}
            </div>
          </div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: colors.muted }}>
            {isIn ? 'ထည့်မည့် အရေအတွက်' : 'လျှော့မည့် အရေအတွက်'}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setQty(String(Math.max(0, n - 1) || ''))}
              style={stepBtn}
            >
              −
            </button>
            <input
              type="text"
              inputMode="numeric"
              className="num"
              value={qty}
              onChange={(e) => setQty(keepNumInput(e.target.value).replace(/\./g, ''))}
              placeholder="0"
              autoFocus
              style={{
                flex: 1,
                height: 40,
                border: `1px solid ${overdraw ? colors.buy : colors.inputBorder}`,
                borderRadius: radii.input,
                padding: '0 10px',
                fontSize: 22,
                fontWeight: 700,
                textAlign: 'center',
              }}
            />
            <button type="button" onClick={() => setQty(String(n + 1))} style={stepBtn}>
              +
            </button>
          </div>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: colors.muted }}>မှတ်ချက်</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="မှတ်ချက်"
            style={{
              height: 34,
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: radii.input,
              padding: '0 10px',
              fontSize: 16,
            }}
          />
        </label>
      </div>
    </Dialog>
  );
}

const stepBtn = {
  width: 40,
  height: 40,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radii.button,
  background: colors.white,
  color: colors.ink,
  fontSize: 18,
  fontWeight: 700,
  cursor: 'pointer',
} as const;
