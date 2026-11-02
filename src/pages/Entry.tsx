import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { CustomerCombobox } from '../components/Combobox';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import type { Customer, TxnType } from '../db/types';
import { saveTxn, upsertPrice } from '../db/queries';
import {
  D,
  W,
  amount,
  isoDate,
  money,
  toYway,
  voucherNo,
} from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

const EMPTY: {
  type: TxnType;
  customerId: number | null;
  query: string;
  newPhone: string;
  k: string;
  p: string;
  y: string;
  note: string;
} = {
  type: 'sell',
  customerId: null as number | null,
  query: '',
  newPhone: '',
  k: '',
  p: '',
  y: '',
  note: '',
};

export function Entry() {
  const customers = useStore((s) => s.customers);
  const prices = useStore((s) => s.prices);
  const txns = useStore((s) => s.txns);
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const setScreen = useStore((s) => s.setScreen);
  const setVoucherId = useStore((s) => s.setVoucherId);
  const digits = settings.digits;
  const today = isoDate();

  const [form, setForm] = useState(EMPTY);
  const [buyStr, setBuyStr] = useState('');
  const [sellStr, setSellStr] = useState('');
  const [saving, setSaving] = useState(false);

  const sortedPrices = [...prices].sort((a, b) => (a.date < b.date ? -1 : 1));
  const latest = sortedPrices[sortedPrices.length - 1] ?? { buy: 0, sell: 0, date: today };
  const todayRow = prices.find((p) => p.date === today);
  const hasToday = !!todayRow;
  const curBuy = todayRow?.buy ?? latest.buy;
  const curSell = todayRow?.sell ?? latest.sell;

  useEffect(() => {
    setBuyStr(String(curBuy));
    setSellStr(String(curSell));
  }, [curBuy, curSell]);

  const yway = toYway(+form.k || 0, +form.p || 0, +form.y || 0);
  const price = form.type === 'sell' ? +sellStr || curSell : +buyStr || curBuy;
  const amt = amount(yway, price, settings.round_to);
  const nextNo = Math.max(0, ...txns.map((t) => t.voucher_no)) + 1;

  const ql = form.query.trim().toLowerCase();
  const sel = customers.find((c) => c.id === form.customerId) ?? null;
  const isNew = !!ql && !sel;

  const priceBox = (active: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '12px 16px',
    borderRadius: 8,
    cursor: 'text',
    border: active ? `2px solid ${colors.gold}` : `1px solid ${colors.inputBorder}`,
    background: active ? colors.goldWash : colors.white,
  });

  const persistPrice = useCallback(
    async (buy: number, sell: number) => {
      if (buy <= 0 || sell <= 0) return;
      await upsertPrice(today, buy, sell);
      await refresh();
    },
    [today, refresh],
  );

  const onBuyChange = (v: string) => {
    setBuyStr(v);
    const n = +v;
    const s = +sellStr || curSell;
    if (n > 0 && s > 0) void persistPrice(n, s);
  };

  const onSellChange = (v: string) => {
    setSellStr(v);
    const n = +v;
    const b = +buyStr || curBuy;
    if (b > 0 && n > 0) void persistPrice(b, n);
  };

  const onSelect = (c: Customer) => {
    setForm((f) => ({ ...f, customerId: c.id, query: c.name }));
  };

  const resetForm = () => setForm({ ...EMPTY, type: form.type });

  const save = async () => {
    if (yway <= 0) {
      window.alert('အလေးချိန် ထည့်ပါ');
      return;
    }
    setSaving(true);
    try {
      const id = await saveTxn({
        type: form.type,
        customerId: isNew ? null : form.customerId,
        newCustomer:
          isNew && ql
            ? { name: form.query.trim(), phone: form.newPhone.trim() }
            : undefined,
        k: +form.k || 0,
        p: +form.p || 0,
        y: +form.y || 0,
        price,
        note: form.note,
        roundTo: settings.round_to,
      });
      await refresh();
      setForm({ ...EMPTY, type: form.type });
      setVoucherId(id);
      setScreen('voucher');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const noteText = hasToday
    ? 'ပြင်ရင် ယနေ့ဈေးအဖြစ် သိမ်းပါမယ်'
    : `ယနေ့ဈေး မသတ်မှတ်ရသေး · ${D(latest.date, digits)} ဈေးကို ပြထားသည်`;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.5fr) minmax(360px, 1fr)',
        gap: 28,
        alignItems: 'start',
        maxWidth: 1280,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Segmented
          size="big"
          options={[
            { value: 'sell', label: 'ရောင်း' },
            { value: 'buy', label: 'ဝယ်' },
          ]}
          value={form.type}
          onChange={(v) => setForm((f) => ({ ...f, type: v }))}
        />
        <Card padding="30px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            <CustomerCombobox
              customers={customers}
              query={form.query}
              customerId={form.customerId}
              newPhone={form.newPhone}
              digits={digits}
              onQuery={(q) => {
                const m = customers.find(
                  (c) => c.name.trim().toLowerCase() === q.trim().toLowerCase(),
                );
                setForm((f) => ({
                  ...f,
                  query: q,
                  customerId: m ? m.id : null,
                }));
              }}
              onSelect={onSelect}
              onNewPhone={(p) => setForm((f) => ({ ...f, newPhone: p }))}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>အလေးချိန်</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: radii.input,
                    padding: '0 18px',
                    height: 64,
                    gap: 10,
                    background: '#fff',
                  }}
                >
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.k}
                    onChange={(e) => setForm((f) => ({ ...f, k: e.target.value }))}
                    placeholder="0"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      outline: 'none',
                      fontSize: 24,
                      fontWeight: 600,
                      background: 'none',
                    }}
                  />
                  <span style={{ fontSize: 16, color: colors.muted }}>ကျပ်</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: radii.input,
                    padding: '0 18px',
                    height: 64,
                    gap: 10,
                    background: '#fff',
                  }}
                >
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.p}
                    onChange={(e) => setForm((f) => ({ ...f, p: e.target.value }))}
                    placeholder="0"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      outline: 'none',
                      fontSize: 24,
                      fontWeight: 600,
                      background: 'none',
                    }}
                  />
                  <span style={{ fontSize: 16, color: colors.muted }}>ပဲ</span>
                </label>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    border: `1px solid ${colors.inputBorder}`,
                    borderRadius: radii.input,
                    padding: '0 18px',
                    height: 64,
                    gap: 10,
                    background: '#fff',
                  }}
                >
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={form.y}
                    onChange={(e) => setForm((f) => ({ ...f, y: e.target.value }))}
                    placeholder="0"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      outline: 'none',
                      fontSize: 24,
                      fontWeight: 600,
                      background: 'none',
                    }}
                  />
                  <span style={{ fontSize: 16, color: colors.muted }}>ရွေး</span>
                </label>
              </div>
              <div style={{ fontSize: 15, color: colors.muted }}>= {W(yway, digits)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>ယနေ့ဈေး · ၁ ကျပ်သား</span>
                <span
                  style={{
                    fontSize: 14,
                    color: hasToday ? colors.muted2 : colors.buy,
                    fontWeight: hasToday ? 400 : 600,
                  }}
                >
                  {noteText}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={priceBox(form.type === 'buy')}>
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 15,
                      color: colors.muted,
                    }}
                  >
                    <span>ဝယ်ဈေး</span>
                    <span style={{ color: colors.goldDark, fontWeight: 600 }}>
                      {form.type === 'buy' ? 'ဒီစာရင်းအတွက်' : ''}
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={buyStr}
                    onChange={(e) => onBuyChange(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'none',
                      fontSize: 24,
                      fontWeight: 700,
                      width: '100%',
                      padding: 0,
                      color: colors.ink,
                    }}
                  />
                </label>
                <label style={priceBox(form.type === 'sell')}>
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 15,
                      color: colors.muted,
                    }}
                  >
                    <span>ရောင်းဈေး</span>
                    <span style={{ color: colors.goldDark, fontWeight: 600 }}>
                      {form.type === 'sell' ? 'ဒီစာရင်းအတွက်' : ''}
                    </span>
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={sellStr}
                    onChange={(e) => onSellChange(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'none',
                      fontSize: 24,
                      fontWeight: 700,
                      width: '100%',
                      padding: 0,
                      color: colors.ink,
                    }}
                  />
                </label>
              </div>
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 600 }}>မှတ်ချက်</span>
              <input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                style={{
                  height: 56,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: radii.input,
                  padding: '0 16px',
                  fontSize: 16,
                  background: '#fff',
                }}
              />
            </label>
          </div>
        </Card>
      </div>
      <Card navy padding="32px" style={{ position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
              တွက်ချက်မှု
            </span>
            <span style={{ fontSize: 15, color: colors.mutedOnNavy }}>{voucherNo(nextNo, digits)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              paddingBottom: 16,
              borderBottom: `1px solid ${colors.navyBorder}`,
            }}
          >
            <span style={{ fontSize: 16, color: colors.mutedOnNavy }}>အလေးချိန်</span>
            <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1.35, color: colors.goldOnNavy }}>
              {W(yway, digits)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, gap: 12 }}>
            <span style={{ color: colors.mutedOnNavy }}>ဈေး</span>
            <span>{money(price, digits)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, gap: 12 }}>
            <span style={{ color: colors.mutedOnNavy }}>ကျသင့်ငွေ</span>
            <span style={{ fontWeight: 600 }}>{money(amt, digits)}</span>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            style={{
              height: 58,
              border: 'none',
              borderRadius: 8,
              background: colors.gold,
              color: colors.ink,
              fontSize: 17,
              fontWeight: 700,
              marginTop: 10,
            }}
          >
            သိမ်းပြီး ဘောင်ချာထုတ်မည်
          </button>
          <button
            type="button"
            onClick={resetForm}
            style={{
              height: 46,
              border: `1px solid ${colors.navyBorder}`,
              borderRadius: 8,
              background: 'none',
              color: colors.mutedOnNavy,
              fontSize: 16,
            }}
          >
            ရှင်းမည်
          </button>
        </div>
      </Card>
    </div>
  );
}
