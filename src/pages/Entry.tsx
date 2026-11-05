import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { appAlert } from '../lib/appAlert';
import { CustomerCombobox } from '../components/Combobox';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import type { Customer, TxnType } from '../db/types';
import { saveTxn, upsertPrice } from '../db/queries';
import { DEFAULT_NRC, isNrcComplete } from '../lib/nrc';
import {
  N,
  W,
  amount,
  formatDate,
  isoDate,
  keepNumInput,
  money,
  stockFromParts,
  nextVoucherInt,
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
  newNrc: string;
  newAddress: string;
  k: string;
  p: string;
  y: string;
  note: string;
} = {
  type: 'sell',
  customerId: null as number | null,
  query: '',
  newPhone: '',
  newNrc: DEFAULT_NRC,
  newAddress: '',
  k: '',
  p: '',
  y: '',
  note: '',
};

export function Entry() {
  const customers = useStore((s) => s.customers);
  const prices = useStore((s) => s.prices);
  const txns = useStore((s) => s.txns);
  const adjustments = useStore((s) => s.stockAdjustments);
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const setScreen = useStore((s) => s.setScreen);
  const openVoucher = useStore((s) => s.openVoucher);
  const digits = settings.digits;
  const today = isoDate();

  const [form, setForm] = useState(EMPTY);
  const [buyStr, setBuyStr] = useState('');
  const [sellStr, setSellStr] = useState('');
  const [saving, setSaving] = useState(false);

  const sortedPrices = [...prices].sort((a, b) => {
    const ka = `${a.date}T${a.time?.length === 5 ? a.time + ':00' : a.time || '00:00:00'}`;
    const kb = `${b.date}T${b.time?.length === 5 ? b.time + ':00' : b.time || '00:00:00'}`;
    return ka < kb ? -1 : 1;
  });
  const latest = sortedPrices[sortedPrices.length - 1] ?? {
    id: 0,
    buy: 0,
    sell: 0,
    date: today,
    time: '00:00:00',
  };
  const hasToday = prices.some((p) => p.date === today);
  const curBuy = latest.buy;
  const curSell = latest.sell;

  useEffect(() => {
    setBuyStr(String(curBuy));
    setSellStr(String(curSell));
  }, [curBuy, curSell]);

  const yway = toYway(N(form.k), N(form.p), N(form.y));
  const stockY = stockFromParts(
    settings.opening_stock_yway,
    txns.filter((t) => t.channel !== 'card'),
    adjustments,
  );
  const overdraw = form.type === 'sell' && yway > 0 && yway > stockY;
  const price = form.type === 'sell' ? N(sellStr) || curSell : N(buyStr) || curBuy;
  const amt = amount(yway, price);
  const nextNo = nextVoucherInt(txns.map((t) => t.voucher_no));

  const ql = form.query.trim().toLowerCase();
  const sel = customers.find((c) => c.id === form.customerId) ?? null;
  const isNew = !!ql && !sel;

  const priceBox = (active: boolean): CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '12px 16px',
    borderRadius: radii.card,
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
    setBuyStr(keepNumInput(v));
  };

  const onSellChange = (v: string) => {
    setSellStr(keepNumInput(v));
  };

  const onSelect = (c: Customer) => {
    setForm((f) => ({ ...f, customerId: c.id, query: c.name }));
  };

  const resetForm = () => setForm({ ...EMPTY, type: form.type });

  const save = async (andPrint = true) => {
    if (!form.customerId && !ql) {
      void appAlert('ဝယ်သူ ရွေးပါ သို့မဟုတ် အမည် ထည့်ပါ');
      return;
    }
    if (yway <= 0) {
      void appAlert('အလေးချိန် ထည့်ပါ');
      return;
    }
    if (overdraw) {
      void appAlert(`လက်ကျန်ထက် ပို၍ မရပါ\nလက်ရှိလက်ကျန် · ${W(Math.max(0, stockY), digits)}`);
      return;
    }
    if (isNew) {
      if (!form.newPhone.trim()) {
        void appAlert('ဖုန်းနံပါတ် ထည့်ပါ');
        return;
      }
      if (!form.newAddress.trim()) {
        void appAlert('နေရပ်လိပ်စာ ထည့်ပါ');
        return;
      }
      if (!isNrcComplete(form.newNrc)) {
        void appAlert('မှတ်ပုံတင် ပြည့်စုံရွေးပါ (နံပါတ် ၆ လုံး)');
        return;
      }
    }
    setSaving(true);
    try {
      const buy = form.type === 'buy' ? price : curBuy;
      const sell = form.type === 'sell' ? price : curSell;
      if (buy > 0 && sell > 0 && (buy !== curBuy || sell !== curSell)) {
        await persistPrice(buy, sell);
      }
      const id = await saveTxn({
        type: form.type,
        customerId: isNew ? null : form.customerId,
        newCustomer:
          isNew && ql
            ? {
                name: form.query.trim(),
                phone: form.newPhone.trim(),
                nrc: form.newNrc.trim(),
                address: form.newAddress.trim(),
              }
            : undefined,
        k: N(form.k),
        p: N(form.p),
        y: N(form.y),
        price,
        note: form.note,
      });
      await refresh();
      setForm({ ...EMPTY, type: form.type });
      setScreen('ledger');
      openVoucher(id, { print: andPrint });
    } catch (e) {
      void appAlert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const noteText = hasToday
    ? 'ပြင်ရင် ယနေ့ဈေးအဖြစ် သိမ်းပါမယ်'
    : `ယနေ့ဈေး မသတ်မှတ်ရသေး · ${formatDate(latest.date, digits)} ဈေးကို ပြထားသည်`;

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
              newNrc={form.newNrc}
              newAddress={form.newAddress}
              digits={digits}
              onQuery={(q) => {
                setForm((f) => ({
                  ...f,
                  query: q,
                  customerId: null,
                }));
              }}
              onSelect={onSelect}
              onNewPhone={(p) => setForm((f) => ({ ...f, newPhone: p }))}
              onNewNrc={(n) => setForm((f) => ({ ...f, newNrc: n }))}
              onNewAddress={(a) => setForm((f) => ({ ...f, newAddress: a }))}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{ fontSize: 18, fontWeight: 600 }}>အလေးချိန်</span>
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
                    type="text"
                    inputMode="decimal"
                    className="num"
                    value={form.k}
                    onChange={(e) => setForm((f) => ({ ...f, k: keepNumInput(e.target.value) }))}
                    placeholder="0"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      outline: 'none',
                      fontSize: 26,
                      fontWeight: 600,
                      background: 'none',
                    }}
                  />
                  <span style={{ fontSize: 18, color: colors.muted }}>ကျပ်</span>
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
                    type="text"
                    inputMode="decimal"
                    className="num"
                    value={form.p}
                    onChange={(e) => setForm((f) => ({ ...f, p: keepNumInput(e.target.value) }))}
                    placeholder="0"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      outline: 'none',
                      fontSize: 26,
                      fontWeight: 600,
                      background: 'none',
                    }}
                  />
                  <span style={{ fontSize: 18, color: colors.muted }}>ပဲ</span>
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
                    type="text"
                    inputMode="decimal"
                    className="num"
                    value={form.y}
                    onChange={(e) => setForm((f) => ({ ...f, y: keepNumInput(e.target.value) }))}
                    placeholder="0"
                    style={{
                      flex: 1,
                      minWidth: 0,
                      border: 'none',
                      outline: 'none',
                      fontSize: 26,
                      fontWeight: 600,
                      background: 'none',
                    }}
                  />
                  <span style={{ fontSize: 18, color: colors.muted }}>ရွေး</span>
                </label>
              </div>
              <div
                style={{
                  fontSize: 17,
                  color: overdraw ? colors.buy : colors.muted,
                }}
              >
                = {W(yway, digits)}
              </div>
              {form.type === 'sell' && (
                <div
                  style={{
                    fontSize: 16,
                    color: overdraw ? colors.buy : colors.muted2,
                    lineHeight: 1.5,
                  }}
                >
                  လက်ရှိလက်ကျန် · <span className="num">{W(Math.max(0, stockY), digits)}</span>
                  {overdraw ? ' — လက်ကျန်ထက် ပို၍ မရပါ' : ''}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>ယနေ့ဈေး · ၁ ကျပ်သား</span>
                <span
                  style={{
                    fontSize: 16,
                    color: hasToday ? colors.muted2 : colors.buy,
                    fontWeight: hasToday ? 400 : 600,
                  }}
                >
                  {noteText}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={priceBox(form.type === 'sell')}>
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 17,
                      color: colors.muted,
                    }}
                  >
                    <span>ရောင်းဈေး</span>
                    <span style={{ color: colors.goldDark, fontWeight: 600 }}>
                      {form.type === 'sell' ? 'ဒီစာရင်းအတွက်' : ''}
                    </span>
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="num"
                    value={sellStr}
                    onChange={(e) => onSellChange(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'none',
                      fontSize: 26,
                      fontWeight: 700,
                      width: '100%',
                      padding: 0,
                      color: colors.ink,
                    }}
                  />
                </label>
                <label style={priceBox(form.type === 'buy')}>
                  <span
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 17,
                      color: colors.muted,
                    }}
                  >
                    <span>ဝယ်ဈေး</span>
                    <span style={{ color: colors.goldDark, fontWeight: 600 }}>
                      {form.type === 'buy' ? 'ဒီစာရင်းအတွက်' : ''}
                    </span>
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="num"
                    value={buyStr}
                    onChange={(e) => onBuyChange(e.target.value)}
                    style={{
                      border: 'none',
                      outline: 'none',
                      background: 'none',
                      fontSize: 26,
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
              <span style={{ fontSize: 18, fontWeight: 600 }}>မှတ်ချက်</span>
              <input
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                style={{
                  height: 56,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: radii.input,
                  padding: '0 16px',
                  fontSize: 18,
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
            <span style={{ fontFamily: "'Pyidaungsu', sans-serif", fontSize: 21, fontWeight: 700 }}>
              တွက်ချက်မှု
            </span>
            <span style={{ fontSize: 17, color: colors.mutedOnNavy }}>{voucherNo(nextNo, digits)}</span>
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
            <span style={{ fontSize: 18, color: colors.mutedOnNavy }}>အလေးချိန်</span>
            <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.35, color: colors.goldOnNavy }}>
              {W(yway, digits)}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, gap: 12 }}>
            <span style={{ color: colors.mutedOnNavy }}>ဈေး</span>
            <span>{money(price, digits)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, gap: 12 }}>
            <span style={{ color: colors.mutedOnNavy }}>ကျသင့်ငွေ</span>
            <span style={{ fontWeight: 600 }}>{money(amt, digits)}</span>
          </div>
          <button
            type="button"
            disabled={saving || overdraw}
            onClick={() => void save()}
            style={{
              height: 58,
              border: 'none',
              borderRadius: radii.button,
              background: saving || overdraw ? colors.inputBorder : colors.ink,
              color: colors.white,
              fontSize: 19,
              fontWeight: 700,
              marginTop: 10,
              cursor: saving || overdraw ? 'default' : 'pointer',
            }}
          >
            သိမ်းပြီး ပရင့်ထုတ်မည်
          </button>
          <button
            type="button"
            onClick={resetForm}
            style={{
              height: 46,
              border: `1px solid ${colors.navyBorder}`,
              borderRadius: radii.button,
              background: 'none',
              color: colors.mutedOnNavy,
              fontSize: 18,
            }}
          >
            ရှင်းမည်
          </button>
        </div>
      </Card>
    </div>
  );
}
