import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
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

  const field = {
    height: 56,
    border: `1.5px solid ${colors.inputBorder}`,
    borderRadius: radii.input,
    padding: '0 16px',
    fontSize: 24,
    fontWeight: 700,
    background: colors.white,
    color: colors.ink,
    width: '100%',
  } as const;

  const save = async () => {
    if (!pfB || !pfS) {
      window.alert('ဝယ်စျေး / ရောင်းစျေး ထည့်ပါ');
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
      title="စျေးနှုန်းပြင်ဆင်ရန်"
      subtitle="အခေါက်ရွှေ · ၁၆ ပဲရည် · ၁ ကျပ်သား"
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
            }}
          >
            ပိတ်မည်
          </button>
          <button
            type="button"
            disabled={saving}
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
            }}
          >
            သိမ်းဆည်းမည်
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.muted }}>ဝယ်စျေး</span>
          <input
            type="text"
            inputMode="decimal"
            className="num"
            value={buyStr}
            placeholder={String(cur.buy || '')}
            onChange={(e) => setBuyStr(keepNumInput(e.target.value))}
            style={field}
            autoFocus
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.muted }}>ရောင်းစျေး</span>
          <input
            type="text"
            inputMode="decimal"
            className="num"
            value={sellStr}
            placeholder={String(cur.sell || '')}
            onChange={(e) => setSellStr(keepNumInput(e.target.value))}
            style={field}
          />
        </label>
        <div
          className="num"
          style={{
            fontSize: 15,
            color: spread >= 0 ? colors.sell : colors.buy,
            fontWeight: 600,
          }}
        >
          ကွာဟချက် {spread >= 0 ? '+' : ''}
          {money(spread, digits)}
        </div>
      </div>
    </Dialog>
  );
}
