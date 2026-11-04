import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { CardQtyPicker } from './CardQtyPicker';
import { CustomerCombobox } from './Combobox';
import { Dialog, dialogBtnGhost, dialogBtnPrimary } from './Dialog';
import { formInput } from './FormRow';
import { IconPrint } from './Icons';
import { Segmented } from './Segmented';
import type { Customer, TxnChannel, TxnType } from '../db/types';
import { saveTxn, upsertPrice } from '../db/queries';
import {
  CARD_DENOMS,
  cardTxnAmount,
  cardsFeeableQty,
  cardsTotalQty,
  cardsTotalYway,
  computeCardStock,
  normalizeCardLines,
  type CardDenom,
} from '../lib/cards';
import { DEFAULT_NRC, isNrcComplete } from '../lib/nrc';
import {
  D,
  N,
  W,
  amount,
  dateTimeKey,
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

const EMPTY = {
  type: 'sell' as TxnType,
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

function emptyCardQty(): Record<CardDenom, string> {
  return Object.fromEntries(CARD_DENOMS.map((d) => [d.id, ''])) as Record<CardDenom, string>;
}

export function EntryDialog() {
  const open = useStore((s) => s.entryDialogOpen);
  const close = useStore((s) => s.closeEntryDialog);
  const customers = useStore((s) => s.customers);
  const prices = useStore((s) => s.prices);
  const txns = useStore((s) => s.txns);
  const adjustments = useStore((s) => s.stockAdjustments);
  const cardOpenings = useStore((s) => s.cardOpenings);
  const cardAdjustments = useStore((s) => s.cardAdjustments);
  const txnCards = useStore((s) => s.txnCards);
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const setScreen = useStore((s) => s.setScreen);
  const openVoucher = useStore((s) => s.openVoucher);
  const digits = settings.digits;
  const today = isoDate();
  const kRef = useRef<HTMLInputElement | null>(null);

  const [channel, setChannel] = useState<TxnChannel>('card');
  const [form, setForm] = useState(EMPTY);
  const [cardQty, setCardQty] = useState(emptyCardQty);
  const [priceStr, setPriceStr] = useState('');
  const [editingPrice, setEditingPrice] = useState(false);
  const [cardFeeStr, setCardFeeStr] = useState('');
  const [editingCardFee, setEditingCardFee] = useState(false);
  const [saving, setSaving] = useState(false);
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const cardFeeInputRef = useRef<HTMLInputElement | null>(null);

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
    setCardQty(emptyCardQty());
    setChannel('card');
    setPriceStr(String(curSell));
    setEditingPrice(false);
    setCardFeeStr(String(settings.card_fee));
    setEditingCardFee(false);
    const t = window.setTimeout(() => kRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, curBuy, curSell, settings.card_fee]);

  useEffect(() => {
    if (!open) return;
    setPriceStr(String(form.type === 'sell' ? curSell : curBuy));
    setEditingPrice(false);
    setCardQty(emptyCardQty());
  }, [form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (editingPrice) {
      const t = window.setTimeout(() => priceInputRef.current?.focus(), 40);
      return () => window.clearTimeout(t);
    }
  }, [editingPrice]);

  useEffect(() => {
    if (editingCardFee) {
      const t = window.setTimeout(() => cardFeeInputRef.current?.focus(), 40);
      return () => window.clearTimeout(t);
    }
  }, [editingCardFee]);

  const cardStock = useMemo(() => {
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

  const looseTxns = useMemo(() => txns.filter((t) => t.channel !== 'card'), [txns]);
  const looseStockY = stockFromParts(settings.opening_stock_yway, looseTxns, adjustments);

  const cardLines = useMemo(
    () =>
      normalizeCardLines(
        CARD_DENOMS.map((d) => ({ denom: d.id, qty: N(cardQty[d.id]) })),
      ),
    [cardQty],
  );
  const cardYway = cardsTotalYway(cardLines);
  const cardCount = cardsTotalQty(cardLines);
  const looseYway = toYway(N(form.k), N(form.p), N(form.y));
  const yway = channel === 'card' ? cardYway : looseYway;

  const price = N(priceStr) || (form.type === 'sell' ? curSell : curBuy);
  const feePerCard =
    cardFeeStr.trim() === ''
      ? settings.card_fee
      : Math.max(0, Math.round(N(cardFeeStr)));
  const cardParts =
    channel === 'card'
      ? cardTxnAmount(form.type, yway, price, cardLines, feePerCard)
      : null;
  const amt =
    channel === 'card' && cardParts
      ? cardParts.total
      : amount(yway, price);

  const cardOverdraw =
    channel === 'card' &&
    form.type === 'sell' &&
    cardLines.some((l) => l.qty > (cardStock[l.denom] ?? 0));
  const looseOverdraw =
    channel === 'loose' && form.type === 'sell' && looseYway > 0 && looseYway > looseStockY;
  const blocked = cardOverdraw || looseOverdraw;

  const nextNo = nextVoucherInt(txns.map((t) => t.voucher_no));
  const ql = form.query.trim().toLowerCase();
  const isNew = !!ql && !customers.find((c) => c.id === form.customerId);

  const save = async (andPrint = false) => {
    if (!form.customerId && !ql) {
      window.alert('ဝယ်သူ ရွေးပါ သို့မဟုတ် အမည် ထည့်ပါ');
      return;
    }
    if (channel === 'card') {
      if (!cardLines.length) {
        window.alert('ကဒ် အရေအတွက် ထည့်ပါ');
        return;
      }
    } else if (looseYway <= 0) {
      window.alert('ရွှေချိန် ထည့်ပါ');
      kRef.current?.focus();
      return;
    }
    if (blocked) {
      if (cardOverdraw) window.alert('အကယ်ဒမီအခေါက်ရွှေ လက်ကျန် မလုံလောက်ပါ');
      else if (looseOverdraw) {
        window.alert(
          `လက်ကျန်ထက် ပို၍ မရပါ\nလက်ရှိမီးလင်းဖြတ်စလက်ကျန် · ${W(Math.max(0, looseStockY), digits)}`,
        );
      }
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
      if (!isNrcComplete(form.newNrc)) {
        window.alert('မှတ်ပုံတင် ပြည့်စုံရွေးပါ (နံပါတ် ၆ လုံး)');
        return;
      }
    }
    setSaving(true);
    try {
      const buy = form.type === 'buy' ? price : curBuy;
      const sell = form.type === 'sell' ? price : curSell;
      if (buy > 0 && sell > 0 && (buy !== curBuy || sell !== curSell)) {
        await upsertPrice(today, buy, sell);
      }
      const id = await saveTxn({
        type: form.type,
        channel,
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
        cards: channel === 'card' ? cardLines : undefined,
        cardFee: channel === 'card' ? feePerCard : undefined,
      });
      await refresh();
      close();
      setScreen('ledger');
      openVoucher(id, { print: andPrint });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const priceLabel = form.type === 'sell' ? 'အရောင်းစျေး' : 'အဝယ်စျေး';

  const unitInput = (key: 'k' | 'p' | 'y', unit: string, autofocus?: boolean) => (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: colors.muted,
          letterSpacing: '0.01em',
          lineHeight: 1.45,
        }}
      >
        {unit}
      </span>
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
          fontSize: 24,
          fontWeight: 700,
          textAlign: 'right',
          lineHeight: 1.3,
        }}
      />
    </label>
  );

  const errMsg = cardOverdraw
    ? 'အကယ်ဒမီအခေါက်ရွှေ လက်ကျန် မလုံလောက်ပါ'
    : looseOverdraw
      ? 'မီးလင်းဖြတ်စ လက်ကျန် မလုံလောက်ပါ'
      : '';

  return (
    <Dialog
      open={open}
      title="အရောင်း/အဝယ်"
      subtitle={
        <span className="num">
          {voucherNo(nextNo)} · {formatDate(today, digits)}
        </span>
      }
      onClose={close}
      width={960}
      compact
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, color: colors.muted, fontWeight: 700, letterSpacing: '0.01em' }}>
              ပေးရမည့်ငွေ
            </div>
            <div
              className="num"
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: form.type === 'sell' ? colors.sell : colors.buy,
                lineHeight: 1.3,
                marginTop: 2,
              }}
            >
              {money(amt, digits)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button type="button" onClick={close} style={{ ...dialogBtnGhost, height: 46, fontSize: 16 }}>
              ပိတ်မည်
            </button>
            <button
              type="button"
              disabled={saving || blocked}
              onClick={() => void save(false)}
              style={{
                ...dialogBtnGhost,
                height: 46,
                fontSize: 16,
                border: `1px solid ${colors.ink}`,
                color: colors.ink,
                cursor: saving || blocked ? 'default' : 'pointer',
                opacity: blocked ? 0.45 : 1,
              }}
            >
              သိမ်းမည်
            </button>
            <button
              type="button"
              disabled={saving || blocked}
              onClick={() => void save(true)}
              style={{
                ...dialogBtnPrimary,
                height: 46,
                fontSize: 16,
                background: saving || blocked ? colors.inputBorder : colors.ink,
                cursor: saving || blocked ? 'default' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <IconPrint size={16} />
              {saving ? 'သိမ်းနေ…' : 'သိမ်းပြီး ပရင့်'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* 1. What kind of entry? */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <Segmented
            size="chip"
            options={[
              { value: 'sell', label: 'အရောင်း' },
              { value: 'buy', label: 'အဝယ်' },
            ]}
            value={form.type}
            onChange={(type) => {
              setForm((f) => ({ ...f, type }));
              setCardQty(emptyCardQty());
            }}
          />
          <Segmented
            size="chip"
            options={[
              { value: 'card', label: 'အကယ်ဒမီအခေါက်ရွှေ' },
              { value: 'loose', label: 'မီးလင်းဖြတ်စ' },
            ]}
            value={channel}
            onChange={setChannel}
          />
          <input
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="မှတ်ချက် (မဖြည့်လည်းရ)"
            style={{
              ...formInput,
              height: 42,
              flex: 1,
              minWidth: 160,
              fontSize: 16,
              fontWeight: 500,
            }}
          />
        </div>

        {/* 2. Who? */}
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
          onSelect={(c: Customer) => setForm((f) => ({ ...f, customerId: c.id, query: c.name }))}
          onNewPhone={(p) => setForm((f) => ({ ...f, newPhone: p }))}
          onNewNrc={(n) => setForm((f) => ({ ...f, newNrc: n }))}
          onNewAddress={(a) => setForm((f) => ({ ...f, newAddress: a }))}
        />

        {/* 3. Qty + money side by side */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.55fr) minmax(260px, 0.9fr)',
            gap: 14,
            alignItems: 'start',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: colors.muted,
                marginBottom: 10,
                letterSpacing: '0.01em',
                lineHeight: 1.45,
              }}
            >
              {channel === 'card' ? 'ကဒ် အရေအတွက် ရွေးပါ' : 'ရွှေချိန် ထည့်ပါ'}
            </div>
            {channel === 'card' ? (
              <CardQtyPicker
                qty={cardQty}
                stock={cardStock}
                digits={digits}
                sellMode={form.type === 'sell'}
                compact
                onChange={(denom, value) => setCardQty((q) => ({ ...q, [denom]: value }))}
              />
            ) : (
              <div
                style={{
                  padding: 14,
                  border: `1.5px solid ${colors.cardBorder}`,
                  borderRadius: radii.card,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {unitInput('k', 'ကျပ်', true)}
                  {unitInput('p', 'ပဲ')}
                  {unitInput('y', 'ရွေး')}
                </div>
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 15,
                    color: looseOverdraw ? colors.buy : colors.muted,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  စု · <span className="num">{W(looseYway, digits)}</span>
                  {form.type === 'sell' && (
                    <span>
                      {' '}
                      · လက်ကျန် {W(Math.max(0, looseStockY), digits)}
                    </span>
                  )}
                </div>
              </div>
            )}
            {errMsg ? (
              <div
                style={{
                  marginTop: 10,
                  fontSize: 15,
                  fontWeight: 700,
                  color: colors.buy,
                  lineHeight: 1.45,
                }}
              >
                {errMsg}
              </div>
            ) : null}
          </div>

          <aside
            style={{
              border: `1.5px solid ${colors.cardBorder}`,
              borderRadius: radii.card,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              background: '#FAFBFC',
            }}
          >
            <SummaryRow label="အလေးချိန်" value={W(yway, digits)} strong />
            {channel === 'card' && (
              <SummaryRow label="ကဒ်အရေအတွက်" value={`${D(cardCount, digits)} ကဒ်`} />
            )}

            <div style={{ height: 1, background: colors.rowDivider }} />

            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: colors.muted,
                    letterSpacing: '0.01em',
                  }}
                >
                  {priceLabel}
                </span>
                {!editingPrice && (
                  <button type="button" onClick={() => setEditingPrice(true)} style={linkBtn}>
                    ပြင်ရန်
                  </button>
                )}
              </div>
              {editingPrice ? (
                <div style={{ display: 'flex', gap: 8 }}>
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
                    }}
                    style={{ ...formInput, height: 42, fontSize: 18, fontWeight: 700, flex: 1 }}
                  />
                  <button type="button" onClick={() => setEditingPrice(false)} style={miniBtn(true)}>
                    OK
                  </button>
                </div>
              ) : (
                <div className="num" style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.35 }}>
                  {money(price, digits)}
                </div>
              )}
            </div>

            <div style={{ height: 1, background: colors.rowDivider }} />

            {channel === 'card' && cardParts ? (
              <>
                <SummaryRow label="ကျသင့်ငွေ" value={money(cardParts.gold, digits)} />
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: colors.muted,
                        letterSpacing: '0.01em',
                      }}
                    >
                      ကဒ်ဖိုး (+)
                    </span>
                    {!editingCardFee && (
                      <button type="button" onClick={() => setEditingCardFee(true)} style={linkBtn}>
                        ပြင်ရန်
                      </button>
                    )}
                  </div>
                  {editingCardFee ? (
                    <div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          ref={cardFeeInputRef}
                          type="text"
                          inputMode="numeric"
                          className="num"
                          value={cardFeeStr}
                          onChange={(e) => setCardFeeStr(keepNumInput(e.target.value))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              setEditingCardFee(false);
                            }
                          }}
                          style={{ ...formInput, height: 42, fontSize: 18, fontWeight: 700, flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => setEditingCardFee(false)}
                          style={miniBtn(true)}
                        >
                          OK
                        </button>
                      </div>
                      <div style={{ fontSize: 13, color: colors.muted2, marginTop: 6, lineHeight: 1.4 }}>
                        ဤစာရင်းအတွက်သာ · Settings က ကဒ်တန်ဖိုး မပြောင်းပါ
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'baseline',
                      }}
                    >
                      <div style={{ fontSize: 14, color: colors.muted2, lineHeight: 1.45 }}>
                        {money(feePerCard, digits)} × {D(cardsFeeableQty(cardLines), digits)} ကဒ်
                      </div>
                      <div
                        className="num"
                        style={{ fontSize: 17, fontWeight: 700, color: colors.ink, whiteSpace: 'nowrap' }}
                      >
                        {money(cardParts.fee, digits)}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <SummaryRow label="ကျသင့်ငွေ" value={money(amt, digits)} />
            )}

            <div
              style={{
                marginTop: 2,
                padding: '12px 14px',
                borderRadius: 10,
                background: colors.white,
                border: `1.5px solid ${colors.cardBorder}`,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: colors.muted,
                  letterSpacing: '0.01em',
                }}
              >
                စုစုပေါင်း
              </div>
              <div
                className="num"
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  marginTop: 4,
                  color: colors.ink,
                  lineHeight: 1.25,
                }}
              >
                {money(amt, digits)}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Dialog>
  );
}

function SummaryRow({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
      <div>
        <div
          style={{
            fontSize: 15,
            color: colors.muted,
            fontWeight: 700,
            lineHeight: 1.5,
            letterSpacing: '0.01em',
          }}
        >
          {label}
        </div>
        {hint && (
          <div style={{ fontSize: 14, color: colors.muted2, marginTop: 2, lineHeight: 1.45 }}>{hint}</div>
        )}
      </div>
      <div
        className="num"
        style={{
          fontSize: strong ? 20 : 17,
          fontWeight: 700,
          color: colors.ink,
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function miniBtn(filled: boolean): CSSProperties {
  return {
    height: 40,
    padding: '0 12px',
    border: filled ? 'none' : `1px solid ${colors.ink}`,
    borderRadius: 6,
    background: filled ? colors.ink : colors.white,
    color: filled ? colors.white : colors.ink,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  };
}

const linkBtn: CSSProperties = {
  border: 'none',
  background: 'none',
  padding: 0,
  color: colors.ink,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  lineHeight: 1.5,
};
