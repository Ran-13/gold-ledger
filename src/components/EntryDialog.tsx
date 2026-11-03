import { useEffect, useRef, useState } from 'react';
import { CustomerCombobox } from './Combobox';
import { Dialog } from './Dialog';
import { FormRow, formInput } from './FormRow';
import { IconPrint } from './Icons';
import type { Customer, TxnType } from '../db/types';
import { saveTxn, upsertPrice } from '../db/queries';
import {
  D,
  N,
  W,
  amount,
  dateTimeKey,
  isoDate,
  keepNumInput,
  money,
  stockFromParts,
  toYway,
  voucherNo,
} from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

const EMPTY = {
  type: 'sell' as TxnType,
  customerId: null as number | null,
  query: '',
  newPhone: '',
  newNrc: '',
  newAddress: '',
  k: '',
  p: '',
  y: '',
  note: '',
};

export function EntryDialog() {
  const open = useStore((s) => s.entryDialogOpen);
  const close = useStore((s) => s.closeEntryDialog);
  const customers = useStore((s) => s.customers);
  const prices = useStore((s) => s.prices);
  const txns = useStore((s) => s.txns);
  const adjustments = useStore((s) => s.stockAdjustments);
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const setScreen = useStore((s) => s.setScreen);
  const setVoucherId = useStore((s) => s.setVoucherId);
  const setPrintAfterOpen = useStore((s) => s.setPrintAfterOpen);
  const digits = settings.digits;
  const today = isoDate();
  const kRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState(EMPTY);
  const [priceStr, setPriceStr] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);
  const [saving, setSaving] = useState(false);
  const priceInputRef = useRef<HTMLInputElement | null>(null);

  const sortedPrices = [...prices].sort((a, b) =>
    dateTimeKey(a.date, a.time) < dateTimeKey(b.date, b.time) ? -1 : 1,
  );
  const latest = sortedPrices[sortedPrices.length - 1] ?? {
    id: 0,
    date: today,
    time: '00:00:00',
    buy: 0,
    sell: 0,
  };
  const curBuy = latest.buy;
  const curSell = latest.sell;

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setPriceStr(String(curSell));
    setEditingPrice(false);
    const t = window.setTimeout(() => kRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, curBuy, curSell]);

  // Keep price in sync when switching အရောင်း / အဝယ်
  useEffect(() => {
    if (!open) return;
    setPriceStr(String(form.type === 'sell' ? curSell : curBuy));
    setEditingPrice(false);
  }, [form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingPrice) {
      const t = window.setTimeout(() => priceInputRef.current?.focus(), 40);
      return () => window.clearTimeout(t);
    }
  }, [editingPrice]);

  const yway = toYway(N(form.k), N(form.p), N(form.y));
  const stockY = stockFromParts(settings.opening_stock_yway, txns, adjustments);
  const overdraw = form.type === 'sell' && yway > 0 && yway > stockY;
  const price = N(priceStr) || (form.type === 'sell' ? curSell : curBuy);
  const amt = amount(yway, price, settings.round_to);
  const nextNo = Math.max(0, ...txns.map((t) => t.voucher_no)) + 1;
  const ql = form.query.trim().toLowerCase();
  const isNew = !!ql && !customers.find((c) => c.id === form.customerId);

  const save = async (andPrint = false) => {
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
    if (isNew) {
      if (!form.newPhone.trim()) {
        window.alert('ဖုန်းနံပါတ် ထည့်ပါ');
        return;
      }
      if (!form.newAddress.trim()) {
        window.alert('နေရပ်လိပ်စာ ထည့်ပါ');
        return;
      }
      if (!form.newNrc.trim()) {
        window.alert('မှတ်ပုံတင် ထည့်ပါ');
        return;
      }
    }
    setSaving(true);
    try {
      // If entry price differs from latest market price, log a price change with this moment's time
      const buy = form.type === 'buy' ? price : curBuy;
      const sell = form.type === 'sell' ? price : curSell;
      if (buy > 0 && sell > 0 && (buy !== curBuy || sell !== curSell)) {
        await upsertPrice(today, buy, sell);
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
        roundTo: settings.round_to,
      });
      await refresh();
      close();
      setVoucherId(id);
      setPrintAfterOpen(andPrint);
      setScreen('voucher');
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const title = 'စာရင်းသွင်းခြင်း';
  const priceLabel = form.type === 'sell' ? 'အရောင်းစျေး' : 'အဝယ်စျေး';

  const unitInput = (key: 'k' | 'p' | 'y', unit: string, autofocus?: boolean) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>{unit}</span>
      <input
        ref={autofocus ? kRef : undefined}
        type="text"
        inputMode="decimal"
        className="num"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: keepNumInput(e.target.value) }))}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void save();
          }
        }}
        placeholder="0"
        style={{
          ...formInput,
          height: 52,
          fontSize: 22,
          fontWeight: 700,
          textAlign: 'right',
        }}
      />
    </label>
  );

  return (
    <Dialog
      open={open}
      title={title}
      subtitle={
        <span className="num">
          {voucherNo(nextNo, digits)} · {D(today, digits)} · ၁၆ ပဲရည်
        </span>
      }
      onClose={close}
      width={760}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: colors.muted }}>ကျသင့်ငွေ</div>
            <div className="num" style={{ fontSize: 26, fontWeight: 700, color: colors.ink, marginTop: 2 }}>
              {money(amt, digits)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={close}
              style={{
                height: 48,
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
              onClick={() => void save(false)}
              style={{
                height: 48,
                padding: '0 18px',
                border: `1.5px solid ${colors.ink}`,
                borderRadius: 8,
                background: colors.white,
                color: colors.ink,
                fontSize: 15,
                fontWeight: 600,
                cursor: saving || overdraw ? 'default' : 'pointer',
                opacity: overdraw ? 0.45 : 1,
              }}
            >
              သိမ်းဆည်းမည်
            </button>
            <button
              type="button"
              disabled={saving || overdraw}
              onClick={() => void save(true)}
              style={{
                height: 48,
                padding: '0 20px',
                border: 'none',
                borderRadius: 8,
                background: saving || overdraw ? colors.inputBorder : colors.ink,
                color: colors.white,
                fontSize: 15,
                fontWeight: 700,
                cursor: saving || overdraw ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <IconPrint size={16} />
              {saving ? 'သိမ်းဆည်းနေသည်…' : 'သိမ်းပြီး ပရင့်ထုတ်မည်'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* အရောင်း / အဝယ် — clear choice */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {(
            [
              {
                type: 'sell' as const,
                title: 'အရောင်း',
                desc: 'ဆိုင်က ရွှေရောင်းမည်',
              },
              {
                type: 'buy' as const,
                title: 'အဝယ်',
                desc: 'ဆိုင်က ရွှေဝယ်မည်',
              },
            ] as const
          ).map((opt) => {
            const on = form.type === opt.type;
            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => setForm((f) => ({ ...f, type: opt.type }))}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 4,
                  padding: '16px 18px',
                  borderRadius: 10,
                  border: on ? `2px solid ${colors.ink}` : `1.5px solid ${colors.cardBorder}`,
                  background: colors.white,
                  color: colors.ink,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>
                  {on ? '● ' : '○ '}
                  {opt.title}
                </span>
                <span style={{ fontSize: 13, color: colors.muted, lineHeight: 1.45 }}>
                  {opt.desc}
                </span>
              </button>
            );
          })}
        </section>

        {/* ဝယ်သူ */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 700,
              color: colors.ink,
              paddingBottom: 8,
              borderBottom: `1px solid ${colors.cardBorder}`,
            }}
          >
            ဝယ်သူ
          </h3>
          <CustomerCombobox
            customers={customers}
            query={form.query}
            customerId={form.customerId}
            newPhone={form.newPhone}
            newNrc={form.newNrc}
            newAddress={form.newAddress}
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
            onSelect={(c: Customer) => setForm((f) => ({ ...f, customerId: c.id, query: c.name }))}
            onNewPhone={(p) => setForm((f) => ({ ...f, newPhone: p }))}
            onNewNrc={(n) => setForm((f) => ({ ...f, newNrc: n }))}
            onNewAddress={(a) => setForm((f) => ({ ...f, newAddress: a }))}
          />
        </section>

        {/* ရွှေချိန် + စျေး */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: 28,
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: colors.ink,
                paddingBottom: 8,
                borderBottom: `1px solid ${colors.cardBorder}`,
              }}
            >
              ရွှေချိန်
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {unitInput('k', 'ကျပ်', true)}
              {unitInput('p', 'ပဲ')}
              {unitInput('y', 'ရွေး')}
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 4,
              }}
            >
              <span style={{ fontSize: 14, color: colors.muted }}>ပေါင်းချိန်</span>
              <span
                className="num"
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: overdraw ? colors.buy : colors.ink,
                }}
              >
                {W(yway, digits)}
              </span>
            </div>
            {form.type === 'sell' && (
              <div
                style={{
                  fontSize: 13,
                  color: overdraw ? colors.buy : colors.muted2,
                  lineHeight: 1.5,
                }}
              >
                လက်ရှိလက်ကျန် · <span className="num">{W(Math.max(0, stockY), digits)}</span>
                {overdraw ? ' — လက်ကျန်ထက် ပို၍ မရပါ' : ''}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: colors.ink,
                paddingBottom: 8,
                borderBottom: `1px solid ${colors.cardBorder}`,
              }}
            >
              စျေးနှုန်း
            </h3>
            <FormRow label={priceLabel} labelWidth={96}>
              {editingPrice ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    ref={priceInputRef}
                    type="text"
                    inputMode="decimal"
                    className="num"
                    value={priceStr}
                    onChange={(e) => setPriceStr(keepNumInput(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setEditingPrice(false);
                      }
                      if (e.key === 'Escape') {
                        setPriceStr(String(form.type === 'sell' ? curSell : curBuy));
                        setEditingPrice(false);
                      }
                    }}
                    style={{
                      ...formInput,
                      height: 48,
                      fontSize: 20,
                      fontWeight: 700,
                      flex: 1,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setEditingPrice(false)}
                    style={{
                      height: 48,
                      padding: '0 14px',
                      border: 'none',
                      borderRadius: 8,
                      background: colors.ink,
                      color: colors.white,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    ပြီးပြီ
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div
                    className="num"
                    style={{
                      ...formInput,
                      height: 48,
                      fontSize: 20,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      flex: 1,
                      background: colors.white,
                      color: colors.ink,
                    }}
                  >
                    {money(price, digits)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingPrice(true)}
                    style={{
                      height: 48,
                      padding: '0 14px',
                      border: `1.5px solid ${colors.ink}`,
                      borderRadius: 8,
                      background: colors.white,
                      color: colors.ink,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    ပြင်မည်
                  </button>
                </div>
              )}
            </FormRow>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                paddingTop: 8,
              }}
            >
              <span style={{ fontSize: 14, color: colors.muted }}>ကျသင့်ငွေ</span>
              <span className="num" style={{ fontSize: 28, fontWeight: 700, color: colors.ink }}>
                {money(amt, digits)}
              </span>
            </div>
          </div>
        </section>

        {/* မှတ်ချက် */}
        <FormRow label="မှတ်ချက်" labelWidth={72}>
          <input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="လိုရင် ရေးပါ"
            style={formInput}
          />
        </FormRow>
      </div>
    </Dialog>
  );
}
