import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Card } from '../components/Card';
import { MiniFact, StatStrip, tableHover, tableTd, tableTh } from '../components/ClearUI';
import { PaginationBar, usePagination } from '../components/Pagination';
import { customerName, typeLabel } from '../lib/format';
import { formatCardLines, isCardDenom, type CardDenom } from '../lib/cards';
import { D, W, addDays, isoDate, money, sumMoney, voucherNo } from '../lib/units';
import type { DigitsMode } from '../lib/units';
import { MONTHS_MY, colors, radii } from '../styles/tokens';
import { useStore } from '../store';

type View = 'today' | '7' | '30' | 'month' | 'year';

type TxnLine = {
  id: number;
  no: string;
  date: string;
  time: string;
  name: string;
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
 * ၁) ကာလရွေး  ၂) ရောင်းရငွေ / ဝယ်သုံးငွေ  ၃) ရွှေဝင်·ထွက်  ၄) အသေးစိတ်
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
  const today = isoDate();

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

  const period = useMemo(() => {
    let from = '';
    let to = today;
    let title = '';
    let canPrev = false;
    let canNext = false;
    let onPrev = () => {};
    let onNext = () => {};

    if (view === 'today') {
      from = today;
      to = today;
      title = `ယနေ့ · ${D(today, digits)}`;
    } else if (view === '7') {
      from = isoDate(addDays(new Date(), -6));
      title = `နောက်ဆုံး ၇ ရက်`;
    } else if (view === '30') {
      from = isoDate(addDays(new Date(), -29));
      title = `နောက်ဆုံး ၃၀ ရက်`;
    } else if (view === 'month') {
      const [Y, M] = repMonth.split('-').map(Number) as [number, number];
      from = `${repMonth}-01`;
      const last = new Date(Y, M, 0).getDate();
      to = `${repMonth}-${String(last).padStart(2, '0')}`;
      if (to > today) to = today;
      title = `${MONTHS_MY[M - 1]} ${D(Y, digits)}`;
      canPrev = true;
      canNext = true;
      onPrev = () => {
        const x = new Date(Y, M - 2, 1);
        setRepMonth(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
      };
      onNext = () => {
        const x = new Date(Y, M, 1);
        setRepMonth(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
      };
    } else {
      from = `${repYear}-01-01`;
      to = `${repYear}-12-31`;
      if (to > today) to = today;
      title = `${D(repYear, digits)} ခုနှစ်`;
      canPrev = true;
      canNext = true;
      onPrev = () => setRepYear(repYear - 1);
      onNext = () => setRepYear(repYear + 1);
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
      return {
        id: t.id,
        no: voucherNo(t.voucher_no, digits),
        date: D(t.date, digits),
        time: t.time ? D(t.time.slice(0, 5), digits) : '',
        name: customerName(t.customer_id, custMap),
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
          label: D(d, digits),
          sellAmt: sumMoney(s, (t) => t.amount),
          buyAmt: sumMoney(b, (t) => t.amount),
          sellY: sum(s, (t) => t.yway),
          buyY: sum(b, (t) => t.yway),
          n: day.length,
        };
      });

    const months =
      view === 'year'
        ? Array.from({ length: 12 }, (_, i) => {
            const k = `${repYear}-${String(i + 1).padStart(2, '0')}`;
            const mList = list.filter((t) => t.date.startsWith(k));
            const s = mList.filter((t) => t.type === 'sell');
            const b = mList.filter((t) => t.type === 'buy');
            return {
              key: k,
              name: MONTHS_MY[i]!,
              sellAmt: sumMoney(s, (t) => t.amount),
              buyAmt: sumMoney(b, (t) => t.amount),
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
      byDay,
      months,
    };
  }, [view, today, digits, repMonth, repYear, txns, custMap, cardsByTxn, setRepMonth, setRepYear]);

  const openMonth = (ym: string) => {
    setRepMonth(ym);
    setView('month');
    setShowDetail(false);
  };

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
        <div style={{ minWidth: 0, paddingTop: 4 }}>
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
          {view !== 'month' && view !== 'year' && (
            <div style={{ fontSize: 17, fontWeight: 600, color: colors.ink, lineHeight: 1.45 }}>
              {period.title}
              {view !== 'today' && (
                <span style={{ color: colors.muted, fontWeight: 500 }}>
                  {' '}
                  · {D(period.from, digits)} – {D(period.to, digits)}
                </span>
              )}
            </div>
          )}
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
              ] as const
            ).map(([id, label]) => {
              const on = view === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setView(id);
                    setShowDetail(false);
                  }}
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

      {period.empty ? (
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
                label="စုစုပေါင်း(အရောင်း)"
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
                label="စုစုပေါင်း(အဝယ်)"
                value={money(period.buyAmt, digits)}
                tone="buy"
              />
              <MiniFact label="ရွှေ(အဝယ်)" value={W(period.buyY, digits)} tone="buy" />
            </StatStrip>
          </div>

          {/* 4. Year → month tiles */}
          {view === 'year' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>လအလိုက်</div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                {period.months.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    disabled={m.empty}
                    onClick={() => openMonth(m.key)}
                    style={{
                      textAlign: 'left',
                      padding: '14px 16px',
                      borderRadius: radii.card,
                      border: `1px solid ${colors.cardBorder}`,
                      background: m.empty ? '#FAFBFC' : colors.white,
                      cursor: m.empty ? 'default' : 'pointer',
                      opacity: m.empty ? 0.55 : 1,
                    }}
                  >
                    <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{m.name}</div>
                    {m.empty ? (
                      <div style={{ fontSize: 15, color: colors.muted2, marginTop: 6 }}>မရှိ</div>
                    ) : (
                      <>
                        <div
                          className="num"
                          style={{ fontSize: 18, fontWeight: 700, color: colors.sell, marginTop: 8 }}
                        >
                          {money(m.sellAmt, digits)}
                        </div>
                        <div style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>
                          ရောင်း · {D(m.n, digits)} စောင်
                        </div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 5. Detail toggle */}
          {view !== 'year' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                onClick={() => setShowDetail((v) => !v)}
                style={{
                  alignSelf: 'flex-start',
                  height: 44,
                  padding: '0 18px',
                  borderRadius: radii.button,
                  border: `1px solid ${colors.ink}`,
                  background: showDetail ? colors.ink : colors.white,
                  color: showDetail ? colors.white : colors.ink,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {showDetail ? 'အသေးစိတ် ပိတ်မည်' : 'အသေးစိတ် ကြည့်မည်'}
              </button>

              {showDetail && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Day breakdown for multi-day views */}
                  {view !== 'today' && period.byDay.length > 0 && (
                    <Card padding={0} style={{ overflow: 'hidden' }}>
                      <BlockTitle>နေ့အလိုက်</BlockTitle>
                      <div>
                        {period.byDay.map((d) => (
                          <div
                            key={d.date}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '140px 1fr 1fr',
                              gap: 12,
                              padding: '14px 18px',
                              borderTop: `1px solid ${colors.rowDivider}`,
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 16 }}>{d.label}</div>
                              <div style={{ fontSize: 14, color: colors.muted2, marginTop: 2 }}>
                                {D(d.n, digits)} စောင်
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 14, color: colors.sell, fontWeight: 600 }}>ရောင်း</div>
                              <div className="num" style={{ fontSize: 17, fontWeight: 700, color: colors.sell }}>
                                {d.sellAmt ? money(d.sellAmt, digits) : '—'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 14, color: colors.buy, fontWeight: 600 }}>ဝယ်</div>
                              <div className="num" style={{ fontSize: 17, fontWeight: 700, color: colors.buy }}>
                                {d.buyAmt ? money(d.buyAmt, digits) : '—'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  <TxnTable
                    title="ရောင်းစာရင်း"
                    tone="sell"
                    rows={period.sellLines}
                    empty="ရောင်းစာရင်း မရှိပါ"
                    digits={digits}
                    resetKey={`${period.from}|${period.to}|sell`}
                    onOpen={openVoucher}
                  />
                  <TxnTable
                    title="ဝယ်စာရင်း"
                    tone="buy"
                    rows={period.buyLines}
                    empty="ဝယ်စာရင်း မရှိပါ"
                    digits={digits}
                    resetKey={`${period.from}|${period.to}|buy`}
                    onOpen={openVoucher}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ───────── pieces ───────── */

function BlockTitle({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '13px 16px',
        fontSize: 16,
        fontWeight: 700,
        borderBottom: `1px solid ${colors.rowDivider}`,
      }}
    >
      {children}
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
}: {
  title: string;
  tone: 'sell' | 'buy';
  rows: TxnLine[];
  empty: string;
  digits: DigitsMode;
  resetKey: string;
  onOpen: (id: number) => void;
}) {
  const page = usePagination(rows, { resetKey });
  const color = tone === 'sell' ? colors.sell : colors.buy;

  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '13px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid ${colors.rowDivider}`,
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, color }}>{title}</div>
        <div style={{ fontSize: 14, color: colors.muted, fontWeight: 600 }}>
          {D(rows.length, digits)} စောင်
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
          <thead>
            <tr>
              <th style={{ ...tableTh, paddingLeft: 16 }}>ဘောင်ချာ</th>
              <th style={tableTh}>အမျိုး</th>
              <th style={tableTh}>ဖောက်သည်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>အလေးချိန်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>စျေး</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ငွေ</th>
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
            {page.slice.map((r) => (
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
                  <div className="num" style={{ fontWeight: 700, color: colors.ink, fontSize: 16 }}>
                    {r.no}
                  </div>
                  <div className="num" style={{ fontSize: 14, color: colors.muted2, marginTop: 2 }}>
                    {r.date}
                    {r.time ? ` · ${r.time}` : ''}
                  </div>
                </td>
                <td style={tableTd}>
                  <div style={{ fontSize: 15, fontWeight: 700, color, lineHeight: 1.35 }}>{r.typeLabel}</div>
                  <div style={{ fontSize: 14, color: colors.muted2, marginTop: 3 }}>{r.channel}</div>
                </td>
                <td style={{ ...tableTd, maxWidth: 240 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {r.name}
                  </div>
                  {r.cards ? (
                    <div
                      style={{
                        fontSize: 14,
                        color: colors.muted2,
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.cards}
                    </div>
                  ) : r.note ? (
                    <div
                      style={{
                        fontSize: 14,
                        color: colors.muted2,
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.note}
                    </div>
                  ) : null}
                </td>
                <td className="num" style={{ ...tableTd, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {r.weight}
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
                  <button type="button" onClick={() => onOpen(r.id)} style={btnRow}>
                    ဘောင်ချာ
                  </button>
                </td>
              </tr>
            ))}
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
        onPage={page.setPage}
      />
    </Card>
  );
}

const btnRow: CSSProperties = {
  height: 32,
  padding: '0 12px',
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: 7,
  background: colors.white,
  color: colors.ink,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};
