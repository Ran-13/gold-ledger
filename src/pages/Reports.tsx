import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Card } from '../components/Card';
import {
  CellChannel,
  CellMeta,
  CellPrimary,
  CellTone,
  MiniFact,
  StatStrip,
  btnTableAction,
  tableHover,
  tableTd,
  tableTh,
  ty,
} from '../components/ClearUI';
import { DateChip } from '../components/DateChip';
import { Dialog, dialogBtnGhost } from '../components/Dialog';
import { IconEye, IconPrint } from '../components/Icons';
import { KbdHint } from '../components/KbdHint';
import { PaginationBar, usePagination } from '../components/Pagination';
import { Segmented } from '../components/Segmented';
import { customerName, typeLabel } from '../lib/format';
import { formatCardLines, isCardDenom, type CardDenom } from '../lib/cards';
import {
  D,
  W,
  addDays,
  formatDate,
  formatTimeAmPm,
  isoDate,
  money,
  sumMoney,
  voucherNo,
} from '../lib/units';
import type { DigitsMode } from '../lib/units';
import { MONTHS_MY, colors, radii } from '../styles/tokens';
import { useStore } from '../store';

type View = 'today' | '7' | '30' | 'month' | 'year' | 'range';

function monthBounds(ym: string, today: string): { from: string; to: string } {
  const [Y, M] = ym.split('-').map(Number) as [number, number];
  const from = `${ym}-01`;
  const last = new Date(Y, M, 0).getDate();
  let to = `${ym}-${String(last).padStart(2, '0')}`;
  if (to > today) to = today;
  return { from, to };
}

function yearBounds(year: number, today: string): { from: string; to: string } {
  const from = `${year}-01-01`;
  let to = `${year}-12-31`;
  if (to > today) to = today;
  return { from, to };
}

type TxnLine = {
  id: number;
  no: string;
  date: string;
  time: string;
  name: string;
  nrc: string;
  typeLabel: string;
  channel: string;
  weight: string;
  price: string;
  amount: string;
  note: string;
  cards: string;
  sell: boolean;
};

/**
 * စာရင်းအင်း — end-user ကြည့်ရှင်းသော ပုံစံ
 * ၁) ကာလရွေး  ၂) ဝင်ငွေ / ထွက်ငွေ  ၃) ရွှေဝင်·ထွက်  ၄) အသေးစိတ်
 */
export function Reports() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const txnCards = useStore((s) => s.txnCards);
  const digits = useStore((s) => s.settings.digits);
  const repMonth = useStore((s) => s.repMonth);
  const setRepMonth = useStore((s) => s.setRepMonth);
  const repYear = useStore((s) => s.repYear);
  const setRepYear = useStore((s) => s.setRepYear);
  const openVoucherDlg = useStore((s) => s.openVoucher);

  const [view, setView] = useState<View>('today');
  const [showDetail, setShowDetail] = useState(false);
  const [detailTab, setDetailTab] = useState<'days' | 'sell' | 'buy'>('days');
  const today = isoDate();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const applyView = (id: View) => {
    setView(id);
    setShowDetail(false);
    if (id === 'today') {
      setFrom(today);
      setTo(today);
    } else if (id === '7') {
      setFrom(isoDate(addDays(new Date(), -6)));
      setTo(today);
    } else if (id === '30') {
      setFrom(isoDate(addDays(new Date(), -29)));
      setTo(today);
    } else if (id === 'month') {
      const b = monthBounds(repMonth, today);
      setFrom(b.from);
      setTo(b.to);
    } else if (id === 'year') {
      const b = yearBounds(repYear, today);
      setFrom(b.from);
      setTo(b.to);
    }
  };

  const pickFrom = (d: string) => {
    setView('range');
    setShowDetail(false);
    setFrom(d);
    if (d > to) setTo(d);
  };

  const pickTo = (d: string) => {
    setView('range');
    setShowDetail(false);
    setTo(d);
    if (d < from) setFrom(d);
  };

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const cardsByTxn = useMemo(() => {
    const map = new Map<number, Array<{ denom: CardDenom; qty: number }>>();
    for (const c of txnCards) {
      if (!isCardDenom(c.denom)) continue;
      const list = map.get(c.txn_id) ?? [];
      list.push({ denom: c.denom, qty: c.qty });
      map.set(c.txn_id, list);
    }
    return map;
  }, [txnCards]);
  const sum = <T,>(arr: T[], f: (t: T) => number) => arr.reduce((a, t) => a + f(t), 0);

  const openVoucher = (id: number) => {
    openVoucherDlg(id);
  };

  const closeDetail = () => {
    if (useStore.getState().voucherDialogOpen) return;
    setShowDetail(false);
  };

  useEffect(() => {
    if (!showDetail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (useStore.getState().voucherDialogOpen) return;
      setShowDetail(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showDetail]);

  const period = useMemo(() => {
    let title = '';
    let canPrev = false;
    let canNext = false;
    let onPrev = () => {};
    let onNext = () => {};

    if (view === 'month') {
      const [Y, M] = repMonth.split('-').map(Number) as [number, number];
      title = `${MONTHS_MY[M - 1]} ${D(Y, digits)}`;
      canPrev = true;
      canNext = true;
      onPrev = () => {
        const x = new Date(Y, M - 2, 1);
        const ym = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
        setRepMonth(ym);
        const b = monthBounds(ym, today);
        setFrom(b.from);
        setTo(b.to);
      };
      onNext = () => {
        const x = new Date(Y, M, 1);
        const ym = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`;
        setRepMonth(ym);
        const b = monthBounds(ym, today);
        setFrom(b.from);
        setTo(b.to);
      };
    } else if (view === 'year') {
      title = `${D(repYear, digits)} ခုနှစ်`;
      canPrev = true;
      canNext = true;
      onPrev = () => {
        const y = repYear - 1;
        setRepYear(y);
        const b = yearBounds(y, today);
        setFrom(b.from);
        setTo(b.to);
      };
      onNext = () => {
        const y = repYear + 1;
        setRepYear(y);
        const b = yearBounds(y, today);
        setFrom(b.from);
        setTo(b.to);
      };
    }

    const list = txns.filter((t) => t.date >= from && t.date <= to);
    const sells = list.filter((t) => t.type === 'sell');
    const buys = list.filter((t) => t.type === 'buy');
    const sellY = sum(sells, (t) => t.yway);
    const buyY = sum(buys, (t) => t.yway);

    const feeOf = (t: (typeof list)[0]): bigint => {
      if (t.channel !== 'card') return 0n;
      const cards = cardsByTxn.get(t.id) ?? [];
      const qty = cards.reduce((a, c) => a + (c.denom === '10k' ? 0 : c.qty), 0);
      return BigInt(qty) * BigInt(Math.max(0, Math.round(Number(t.card_fee) || 0)));
    };
    const sellFee = sumMoney(sells, feeOf);
    const buyFee = sumMoney(buys, feeOf);
    /** ရွှေဖိုး only (ကဒ်ဖိုး ခွဲပြီး) — amount is always gold + fee for card txns */
    const sellGoldAmt = sumMoney(sells, (t) => BigInt(Math.round(t.amount)) - feeOf(t));
    const buyGoldAmt = sumMoney(buys, (t) => BigInt(Math.round(t.amount)) - feeOf(t));
    const sellAmt = sumMoney(sells, (t) => t.amount);
    const buyAmt = sumMoney(buys, (t) => t.amount);

    const toLine = (t: (typeof list)[0]): TxnLine => {
      const cards = cardsByTxn.get(t.id);
      const nrcRaw = custMap.get(t.customer_id ?? -1)?.nrc?.trim() || '';
      return {
        id: t.id,
        no: voucherNo(t.voucher_no, digits),
        date: formatDate(t.date, digits),
        time: t.time ? formatTimeAmPm(t.time) : '',
        name: customerName(t.customer_id, custMap),
        nrc: nrcRaw ? D(nrcRaw, digits) : '',
        typeLabel: typeLabel(t.type),
        channel: t.channel === 'card' ? 'အကယ်ဒမီအခေါက်ရွှေ' : 'မီးလင်းဖြတ်စ',
        weight: W(t.yway, digits),
        price: money(t.price, digits),
        amount: money(t.amount, digits),
        note: t.note?.trim() || '',
        cards: cards?.length ? formatCardLines(cards, digits) : '',
        sell: t.type === 'sell',
      };
    };

    const byDay = [...new Set(list.map((t) => t.date))]
      .sort()
      .reverse()
      .map((d) => {
        const day = list.filter((t) => t.date === d);
        const s = day.filter((t) => t.type === 'sell');
        const b = day.filter((t) => t.type === 'buy');
        return {
          date: d,
          label: formatDate(d, digits),
          sellAmt: sumMoney(s, (t) => t.amount),
          buyAmt: sumMoney(b, (t) => t.amount),
          sellGoldAmt: sumMoney(s, (t) => BigInt(Math.round(t.amount)) - feeOf(t)),
          buyGoldAmt: sumMoney(b, (t) => BigInt(Math.round(t.amount)) - feeOf(t)),
          sellFee: sumMoney(s, feeOf),
          buyFee: sumMoney(b, feeOf),
          sellY: sum(s, (t) => t.yway),
          buyY: sum(b, (t) => t.yway),
          sellN: s.length,
          buyN: b.length,
          n: day.length,
        };
      });

    /** `YYYY-M-D` / `YYYY-MM-DD` → `YYYY-MM` */
    const yearMonth = (date: string): string => {
      const m = String(date || '')
        .trim()
        .match(/^(\d{4})-(\d{1,2})/);
      if (!m) return '';
      return `${m[1]}-${String(Number(m[2])).padStart(2, '0')}`;
    };

    const months =
      view === 'year'
        ? Array.from({ length: 12 }, (_, i) => {
            const k = `${repYear}-${String(i + 1).padStart(2, '0')}`;
            const mList = list.filter((t) => yearMonth(t.date) === k);
            const s = mList.filter((t) => t.type === 'sell');
            const b = mList.filter((t) => t.type === 'buy');
            return {
              key: k,
              name: MONTHS_MY[i]!,
              sellAmt: sumMoney(s, (t) => t.amount),
              buyAmt: sumMoney(b, (t) => t.amount),
              sellY: sum(s, (t) => t.yway),
              buyY: sum(b, (t) => t.yway),
              sellN: s.length,
              buyN: b.length,
              n: mList.length,
              empty: mList.length === 0,
            };
          })
        : [];

    return {
      from,
      to,
      title,
      canPrev,
      canNext,
      onPrev,
      onNext,
      empty: list.length === 0,
      sellAmt,
      buyAmt,
      sellGoldAmt,
      buyGoldAmt,
      sellFee,
      buyFee,
      sellY,
      buyY,
      sellN: sells.length,
      buyN: buys.length,
      netY: buyY - sellY,
      cardN: list.filter((t) => t.channel === 'card').length,
      looseN: list.filter((t) => t.channel !== 'card').length,
      sellLines: [...sells].sort((a, b) => b.voucher_no - a.voucher_no).map(toLine),
      buyLines: [...buys].sort((a, b) => b.voucher_no - a.voucher_no).map(toLine),
      allLines: [...list].sort((a, b) => b.voucher_no - a.voucher_no).map(toLine),
      byDay,
      months,
    };
  }, [view, from, to, today, digits, repMonth, repYear, txns, custMap, cardsByTxn, setRepMonth, setRepYear]);

  const openMonth = (ym: string) => {
    setRepMonth(ym);
    setView('month');
    setShowDetail(false);
    const b = monthBounds(ym, today);
    setFrom(b.from);
    setTo(b.to);
  };

  const dayPage = usePagination(period.byDay, {
    resetKey: `${period.from}|${period.to}|byDay`,
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1360 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(view === 'month' || view === 'year') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <NavBtn onClick={period.onPrev} disabled={!period.canPrev}>
                ‹
              </NavBtn>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  minWidth: 180,
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                {period.title}
              </div>
              <NavBtn onClick={period.onNext} disabled={!period.canNext}>
                ›
              </NavBtn>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <DateChip
              caption="မှ"
              value={from}
              digits={digits}
              max={today}
              onChange={pickFrom}
            />
            <span
              style={{
                color: colors.muted2,
                fontSize: 18,
                fontWeight: 700,
                paddingBottom: 14,
                flexShrink: 0,
              }}
            >
              —
            </span>
            <DateChip
              caption="ထိ"
              value={to}
              digits={digits}
              min={from}
              max={today}
              onChange={pickTo}
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 8,
            marginLeft: 'auto',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.muted }}>ကာလ ရွေးပါ</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            {(
              [
                ['today', 'ယနေ့'],
                ['7', '၇ ရက်'],
                ['30', '၃၀ ရက်'],
                ['month', 'လအလိုက်'],
                ['year', 'နှစ်အလိုက်'],
                ['range', 'မှ–ထိ'],
              ] as const
            ).map(([id, label]) => {
              const on = view === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => applyView(id)}
                  style={{
                    height: 44,
                    padding: '0 18px',
                    borderRadius: radii.button,
                    border: on ? `1px solid ${colors.ink}` : `1px solid ${colors.cardBorder}`,
                    background: on ? colors.ink : colors.white,
                    color: on ? colors.white : colors.ink,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: 'pointer',
                    lineHeight: 1.3,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {period.empty && view !== 'today' ? (
        <Card padding="48px 24px">
          <div style={{ textAlign: 'center', color: colors.muted2, fontSize: 18, lineHeight: 1.6 }}>
            ဤကာလတွင် စာရင်း မရှိသေးပါ
          </div>
        </Card>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <StatStrip>
              <MiniFact
                label="ရွှေဖိုး(အရောင်း)"
                value={money(period.sellGoldAmt, digits)}
                tone="sell"
                sub={`${D(period.sellN, digits)} စောင်`}
              />
              <MiniFact
                label="ကဒ်ဖိုး(အရောင်း)"
                value={money(period.sellFee, digits)}
                tone="sell"
              />
              <MiniFact
                label="ဝင်ငွေ"
                value={money(period.sellAmt, digits)}
                tone="sell"
              />
              <MiniFact label="ရွှေ(အရောင်း)" value={W(period.sellY, digits)} tone="sell" />
            </StatStrip>
            <StatStrip>
              <MiniFact
                label="ရွှေဖိုး(အဝယ်)"
                value={money(period.buyGoldAmt, digits)}
                tone="buy"
                sub={`${D(period.buyN, digits)} စောင်`}
              />
              <MiniFact
                label="ကဒ်ဖိုး(အဝယ်)"
                value={money(period.buyFee, digits)}
                tone="buy"
              />
              <MiniFact
                label="ထွက်ငွေ"
                value={money(period.buyAmt, digits)}
                tone="buy"
              />
              <MiniFact label="ရွှေ(အဝယ်)" value={W(period.buyY, digits)} tone="buy" />
            </StatStrip>
          </div>

          {/* 4. Year → month tiles */}
          {view === 'year' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={ty.section}>လအလိုက်</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.muted, lineHeight: 1.45 }}>
                စာရင်းရှိသောလကို နှိပ်ပြီး အသေးစိတ်ကြည့်နိုင်သည်
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                {[...period.months].sort((a, b) => Number(a.empty) - Number(b.empty)).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    disabled={m.empty}
                    onClick={() => openMonth(m.key)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      borderRadius: radii.card,
                      border: `1px solid ${m.empty ? colors.cardBorder : colors.ink}`,
                      background: m.empty ? '#FAFBFC' : colors.white,
                      cursor: m.empty ? 'default' : 'pointer',
                      opacity: m.empty ? 0.55 : 1,
                    }}
                  >
                    <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.4 }}>{m.name}</div>
                    {m.empty ? (
                      <div style={{ fontSize: 16, fontWeight: 600, color: colors.muted2, marginTop: 6 }}>
                        မရှိ
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: colors.sell }}>
                            ဝင်ငွေ · {D(m.sellN, digits)} စောင်
                          </div>
                          <div
                            className="num"
                            style={{ fontSize: 20, fontWeight: 700, color: colors.sell, marginTop: 2 }}
                          >
                            {money(m.sellAmt, digits)}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: colors.muted, marginTop: 2 }}>
                            {W(m.sellY, digits)}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: colors.buy }}>
                            ထွက်ငွေ · {D(m.buyN, digits)} စောင်
                          </div>
                          <div
                            className="num"
                            style={{ fontSize: 20, fontWeight: 700, color: colors.buy, marginTop: 2 }}
                          >
                            {money(m.buyAmt, digits)}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: colors.muted, marginTop: 2 }}>
                            {W(m.buyY, digits)}
                          </div>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {view === 'today' && (
            <TxnTable
              title="ယနေ့ စာရင်း"
              rows={period.allLines}
              empty="ယနေ့ စာရင်း မရှိသေးပါ"
              digits={digits}
              resetKey={`${period.from}|${period.to}|all`}
              onOpen={openVoucher}
            />
          )}

        </>
      )}

      {view !== 'year' && view !== 'today' && (
        <button
          type="button"
          onClick={() => {
            setDetailTab('days');
            setShowDetail(true);
          }}
          style={{
            alignSelf: 'flex-start',
            height: 44,
            padding: '0 18px',
            borderRadius: radii.button,
            border: `1px solid ${colors.ink}`,
            background: colors.white,
            color: colors.ink,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <IconEye size={16} />
          အသေးစိတ် ကြည့်မည်
        </button>
      )}

      <Dialog
        open={showDetail}
        onClose={closeDetail}
        closeOnEsc={false}
        full
        width="min(1320px, 96vw)"
        title="အသေးစိတ်"
        subtitle={
          period.title
            ? `${period.title} · ${formatDate(period.from, digits)} – ${formatDate(period.to, digits)}`
            : `${formatDate(period.from, digits)} – ${formatDate(period.to, digits)}`
        }
        toolbar={
          <Segmented
            size="big"
            value={detailTab}
            onChange={setDetailTab}
            options={[
              { value: 'days', label: `နေ့အလိုက် · ${D(period.byDay.length, digits)}` },
              { value: 'sell', label: `ရောင်းစာရင်း · ${D(period.sellN, digits)}` },
              { value: 'buy', label: `ဝယ်စာရင်း · ${D(period.buyN, digits)}` },
            ]}
          />
        }
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={closeDetail} style={dialogBtnGhost}>
              ပိတ်မည်
              <KbdHint>Esc</KbdHint>
            </button>
          </div>
        }
      >
        {detailTab === 'days' ? (
          <ByDayTable dayPage={dayPage} digits={digits} />
        ) : detailTab === 'sell' ? (
          <TxnTable
            bare
            title="ရောင်းစာရင်း"
            tone="sell"
            rows={period.sellLines}
            empty="ရောင်းစာရင်း မရှိပါ"
            digits={digits}
            resetKey={`${period.from}|${period.to}|sell`}
            onOpen={openVoucher}
          />
        ) : (
          <TxnTable
            bare
            title="ဝယ်စာရင်း"
            tone="buy"
            rows={period.buyLines}
            empty="ဝယ်စာရင်း မရှိပါ"
            digits={digits}
            resetKey={`${period.from}|${period.to}|buy`}
            onOpen={openVoucher}
          />
        )}
      </Dialog>
    </div>
  );
}

/* ───────── pieces ───────── */

function ByDayTable({
  dayPage,
  digits,
}: {
  dayPage: ReturnType<typeof usePagination<{
    date: string;
    label: string;
    n: number;
    sellN: number;
    buyN: number;
    sellAmt: bigint;
    buyAmt: bigint;
    sellGoldAmt: bigint;
    buyGoldAmt: bigint;
    sellFee: bigint;
    buyFee: bigint;
    sellY: number;
    buyY: number;
  }>>;
  digits: DigitsMode;
}) {
  const moneyCell = (
    value: bigint,
    tone: 'sell' | 'buy' | 'ink',
    opts?: { padRight?: boolean; strong?: boolean },
  ) => (
    <td
      className="num"
      style={{
        ...tableTd,
        textAlign: 'right',
        fontWeight: opts?.strong === false ? 600 : 700,
        color: tone === 'sell' ? colors.sell : tone === 'buy' ? colors.buy : colors.ink,
        whiteSpace: 'nowrap',
        paddingRight: opts?.padRight ? 16 : undefined,
      }}
    >
      {value ? money(value, digits) : '—'}
    </td>
  );

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            minWidth: 1080,
          }}
        >
          <thead>
            <tr>
              <th style={{ ...tableTh, paddingLeft: 16 }}>ရက်စွဲ</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>စောင်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ဝင်ငွေ</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ထွက်ငွေ</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ရွှေဖိုး(အရောင်း)</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ကဒ်ဖိုး(အရောင်း)</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ရွှေ(အရောင်း)</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ရွှေဖိုး(အဝယ်)</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ကဒ်ဖိုး(အဝယ်)</th>
              <th style={{ ...tableTh, paddingRight: 16, textAlign: 'right' }}>ရွှေ(အဝယ်)</th>
            </tr>
          </thead>
          <tbody>
            {dayPage.total === 0 && (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    ...tableTd,
                    textAlign: 'center',
                    color: colors.muted2,
                    padding: 36,
                    borderBottom: 'none',
                  }}
                >
                  နေ့အလိုက် စာရင်း မရှိပါ
                </td>
              </tr>
            )}
            {dayPage.slice.map((d) => (
              <tr key={d.date}>
                <td style={{ ...tableTd, paddingLeft: 16, whiteSpace: 'nowrap' }}>
                  <CellPrimary className="num">{d.label}</CellPrimary>
                  <CellMeta>
                    ရောင်း {D(d.sellN, digits)} · ဝယ် {D(d.buyN, digits)}
                  </CellMeta>
                </td>
                <td className="num" style={{ ...tableTd, textAlign: 'right', fontWeight: 700 }}>
                  {D(d.n, digits)}
                </td>
                {moneyCell(d.sellAmt, 'sell')}
                {moneyCell(d.buyAmt, 'buy')}
                {moneyCell(d.sellGoldAmt, 'sell')}
                {moneyCell(d.sellFee, 'sell', { strong: false })}
                <td
                  className="num"
                  style={{
                    ...tableTd,
                    textAlign: 'right',
                    fontWeight: 700,
                    color: colors.sell,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.sellY ? W(d.sellY, digits) : '—'}
                </td>
                {moneyCell(d.buyGoldAmt, 'buy')}
                {moneyCell(d.buyFee, 'buy', { strong: false })}
                <td
                  className="num"
                  style={{
                    ...tableTd,
                    paddingRight: 16,
                    textAlign: 'right',
                    fontWeight: 700,
                    color: colors.buy,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.buyY ? W(d.buyY, digits) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={dayPage.page}
        totalPages={dayPage.totalPages}
        total={dayPage.total}
        from={dayPage.from}
        to={dayPage.to}
        digits={digits}
        pageSize={dayPage.pageSize}
        onPage={dayPage.setPage}
      />
    </div>
  );
}

function NavBtn({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 44,
        height: 44,
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: radii.button,
        background: colors.white,
        fontSize: 22,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1,
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

function TxnTable({
  title,
  tone,
  rows,
  empty,
  digits,
  resetKey,
  onOpen,
  bare,
}: {
  title: string;
  tone?: 'sell' | 'buy';
  rows: TxnLine[];
  empty: string;
  digits: DigitsMode;
  resetKey: string;
  onOpen: (id: number) => void;
  bare?: boolean;
}) {
  const page = usePagination(rows, { resetKey });
  const titleColor = tone === 'sell' ? colors.sell : tone === 'buy' ? colors.buy : colors.ink;

  const inner = (
    <>
      {!bare && (
      <div
        style={{
          padding: '13px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${colors.rowDivider}`,
        }}
      >
        <div style={{ ...ty.section, color: titleColor }}>{title}</div>
        <div style={{ fontSize: 17, color: colors.muted, fontWeight: 700 }}>
          {D(rows.length, digits)} စောင်
        </div>
      </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{ ...tableTh, paddingLeft: 16 }}>ဘောင်ချာ</th>
              <th style={tableTh}>အမျိုးအစား</th>
              <th style={tableTh}>ဝယ်သူ</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>အလေးချိန်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ရွှေစျေး</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ကျသင့်ငွေ</th>
              <th style={{ ...tableTh, paddingRight: 16, textAlign: 'right' }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ ...tableTd, textAlign: 'center', color: colors.muted2, padding: 36, borderBottom: 'none' }}
                >
                  {empty}
                </td>
              </tr>
            )}
            {page.slice.map((r) => {
              const color = r.sell ? colors.sell : colors.buy;
              return (
              <tr
                key={r.id}
                onClick={() => onOpen(r.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onOpen(r.id);
                }}
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = tableHover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = colors.white;
                }}
              >
                <td style={{ ...tableTd, paddingLeft: 16, whiteSpace: 'nowrap' }}>
                  <CellPrimary className="num">{r.no}</CellPrimary>
                  <CellMeta className="num">
                    {r.date}
                    {r.time ? ` · ${r.time}` : ''}
                  </CellMeta>
                </td>
                <td style={tableTd}>
                  <CellTone sell={r.sell}>{r.typeLabel}</CellTone>
                  <CellChannel>{r.channel}</CellChannel>
                </td>
                <td style={{ ...tableTd, maxWidth: 240 }}>
                  <CellPrimary
                    style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {r.name}
                  </CellPrimary>
                  {r.nrc ? (
                    <CellMeta
                      className="num"
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {r.nrc}
                    </CellMeta>
                  ) : null}
                  {r.note ? (
                    <CellMeta
                      style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {r.note}
                    </CellMeta>
                  ) : null}
                </td>
                <td className="num" style={{ ...tableTd, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  <div>{r.weight}</div>
                  {r.cards ? <div style={ty.weightMeta}>{r.cards}</div> : null}
                </td>
                <td className="num" style={{ ...tableTd, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {r.price}
                </td>
                <td
                  className="num"
                  style={{ ...tableTd, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap', color }}
                >
                  {r.amount}
                </td>
                <td
                  style={{ ...tableTd, paddingRight: 16, textAlign: 'right', whiteSpace: 'nowrap' }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button type="button" onClick={() => onOpen(r.id)} style={btnTableAction}>
                    <IconPrint size={14} />
                    ဘောင်ချာ
                  </button>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      <PaginationBar
        page={page.page}
        totalPages={page.totalPages}
        total={page.total}
        from={page.from}
        to={page.to}
        digits={digits}
        pageSize={page.pageSize}
        onPage={page.setPage}
      />
    </>
  );

  if (bare) return <div>{inner}</div>;

  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      {inner}
    </Card>
  );
}
