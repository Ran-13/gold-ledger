import { useEffect, useState } from 'react';
import {
  Dialog,
  dialogBtnGhost,
  dialogBtnPrimary,
  dialogField,
  dialogLabel,
} from './Dialog';
import { IconSave } from './Icons';
import { KbdHint } from './KbdHint';
import { upsertPrice } from '../db/queries';
import { N, dateTimeKey, isoDate, keepNumInput, money } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function PriceDialog() {
  const open = useStore((s) => s.priceDialogOpen);
  const close = useStore((s) => s.closePriceDialog);
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const digits = settings.digits;
  const today = isoDate();

  const sorted = [...prices].sort((a, b) =>
    dateTimeKey(a.date, a.time) < dateTimeKey(b.date, b.time) ? -1 : 1,
  );
  const cur = sorted[sorted.length - 1] ?? { buy: 0, sell: 0, date: today, time: '00:00:00', id: 0 };

  const [buyStr, setBuyStr] = useState('');
  const [sellStr, setSellStr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBuyStr(String(cur.buy || ''));
    setSellStr(String(cur.sell || ''));
  }, [open, cur.buy, cur.sell]);

  const pfB = buyStr !== '' ? N(buyStr) : cur.buy;
  const pfS = sellStr !== '' ? N(sellStr) : cur.sell;
  const spread = pfS - pfB;

  const save = async () => {
    if (saving) return;
    if (!pfB || !pfS) {
      window.alert('ရောင်းစျေး / ဝယ်စျေး ထည့်ပါ');
      return;
    }
    setSaving(true);
    try {
      await upsertPrice(today, pfB, pfS);
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
      title="ရွှေစျေးပြင်ရန်"
      onClose={close}
      width={440}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={close} style={dialogBtnGhost}>
            ပိတ်မည်
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            style={{
              ...dialogBtnPrimary,
              opacity: saving ? 0.7 : 1,
              cursor: saving ? 'default' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <IconSave size={16} />
            သိမ်းမည်
            <KbdHint onDark>↵</KbdHint>
          </button>
        </div>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 12 }}
      >
        <button type="submit" tabIndex={-1} style={{ display: 'none' }} aria-hidden />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={dialogLabel}>ရောင်းစျေး</span>
          <input
            type="text"
            inputMode="decimal"
            className="num"
            value={sellStr}
            placeholder={String(cur.sell || '')}
            onChange={(e) => setSellStr(keepNumInput(e.target.value))}
            style={{ ...dialogField, textAlign: 'right' }}
            autoFocus
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={dialogLabel}>ဝယ်စျေး</span>
          <input
            type="text"
            inputMode="decimal"
            className="num"
            value={buyStr}
            placeholder={String(cur.buy || '')}
            onChange={(e) => setBuyStr(keepNumInput(e.target.value))}
            style={{ ...dialogField, textAlign: 'right' }}
          />
        </label>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            borderRadius: radii.sm,
            background: spread >= 0 ? 'rgba(31,122,77,.06)' : 'rgba(178,58,42,.06)',
            border: `1px solid ${spread >= 0 ? 'rgba(31,122,77,.18)' : 'rgba(178,58,42,.18)'}`,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: colors.muted }}>ကွာဟချက်</span>
          <span
            className="num"
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: spread >= 0 ? colors.sell : colors.buy,
              letterSpacing: '-0.02em',
            }}
          >
            {spread >= 0 ? '+' : ''}
            {money(spread, digits)}
          </span>
        </div>
      </form>
    </Dialog>
  );
}
