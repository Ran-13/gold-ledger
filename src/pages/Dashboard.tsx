import { useMemo } from 'react';
import { Card } from '../components/Card';
import {
  CellChannel,
  CellMeta,
  CellPrimary,
  CellTone,
  MiniFact,
  StatStrip,
  TextBtn,
  btnTableAction,
  tableHover,
  tableTd,
  tableTh,
  ty,
} from '../components/ClearUI';
import { DateChip } from '../components/DateChip';
import { IconChevronRight, IconLedger, IconPrint, IconStock } from '../components/Icons';
import { PaginationBar, usePagination } from '../components/Pagination';
import { customerName, typeLabel } from '../lib/format';
import {
  cardStockTotalYway,
  computeCardStock,
  formatCardLines,
  isCardDenom,
  type CardDenom,
} from '../lib/cards';
import {
  D,
  W,
  formatDateTime,
  money,
  isoDate,
  stock as stockCalc,
  sumMoney,
  voucherNo,
} from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function Dashboard() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const cardOpenings = useStore((s) => s.cardOpenings);
  const cardAdjustments = useStore((s) => s.cardAdjustments);
  const txnCards = useStore((s) => s.txnCards);
  const adjustments = useStore((s) => s.stockAdjustments);
  const setScreen = useStore((s) => s.setScreen);
  const openVoucher = useStore((s) => s.openVoucher);
  const digits = settings.digits;
  const today = isoDate();

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const loose = txns.filter((t) => t.channel !== 'card');
  const buyY = loose.filter((t) => t.type === 'buy').reduce((a, t) => a + t.yway, 0);
  const sellY = loose.filter((t) => t.type === 'sell').reduce((a, t) => a + t.yway, 0);
  const adjInY = adjustments.filter((a) => a.kind === 'in').reduce((a, x) => a + x.yway, 0);
  const adjOutY = adjustments.filter((a) => a.kind === 'out').reduce((a, x) => a + x.yway, 0);
  const looseY = stockCalc(settings.opening_stock_yway, buyY, sellY, adjInY, adjOutY);
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
  const cardY = cardStockTotalYway(cardStock);

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

  const todayRows = useMemo(
    () => txns.filter((t) => t.date === today).sort((a, b) => b.voucher_no - a.voucher_no),
    [txns, today],
  );
  const tS = todayRows.filter((t) => t.type === 'sell');
  const tB = todayRows.filter((t) => t.type === 'buy');
  const sum = (arr: typeof todayRows, f: (t: (typeof todayRows)[0]) => number) =>
    arr.reduce((a, t) => a + f(t), 0);

  const sellAmt = sumMoney(tS, (t) => t.amount);
  const buyAmt = sumMoney(tB, (t) => t.amount);
  const sellGold = sum(tS, (t) => t.yway);
  const buyGold = sum(tB, (t) => t.yway);
  const page = usePagination(todayRows, { resetKey: today });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <DateChip value={today} digits={digits} />
        <TextBtn onClick={() => setScreen('stock')}>
          <IconStock size={16} />
          လက်ကျန် ကြည့်ရန်
          <IconChevronRight size={16} />
        </TextBtn>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <StatStrip>
          <MiniFact
            label="ငွေ(အရောင်း)"
            value={money(sellAmt, digits)}
            tone="sell"
            sub={`${D(tS.length, digits)} စောင်`}
          />
          <MiniFact
            label="ငွေ(အဝယ်)"
            value={money(buyAmt, digits)}
            tone="buy"
            sub={`${D(tB.length, digits)} စောင်`}
          />
          <MiniFact label="ရွှေ(အရောင်း)" value={W(sellGold, digits)} tone="sell" />
          <MiniFact label="ရွှေ(အဝယ်)" value={W(buyGold, digits)} tone="buy" />
        </StatStrip>
        <StatStrip>
          <MiniFact label="လက်ကျန်(အကယ်ဒမီအခေါက်ရွှေ)" value={W(cardY, digits)} />
          <MiniFact label="လက်ကျန်(မီးလင်းဖြတ်စ)" value={W(looseY, digits)} />
        </StatStrip>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1.5px solid ${colors.rowDivider}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <div style={ty.page}>ယနေ့ စာရင်း</div>
            <div style={{ fontSize: 16, color: colors.muted, fontWeight: 600 }}>
              {D(todayRows.length, digits)} စောင်
            </div>
          </div>
          <TextBtn onClick={() => setScreen('ledger')}>
            <IconLedger size={16} />
            အားလုံး
            <IconChevronRight size={16} />
          </TextBtn>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 860,
            }}
          >
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
              {todayRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      ...tableTd,
                      padding: '36px 16px',
                      textAlign: 'center',
                      color: colors.muted2,
                      borderBottom: 'none',
                    }}
                  >
                    ယနေ့ စာရင်း မရှိသေးပါ
                  </td>
                </tr>
              )}
              {page.slice.map((t) => {
                const sell = t.type === 'sell';
                const nrc = custMap.get(t.customer_id ?? -1)?.nrc?.trim() || '';
                return (
                  <tr
                    key={t.id}
                    onClick={() => openVoucher(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openVoucher(t.id);
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
                      <CellPrimary className="num">{voucherNo(t.voucher_no, digits)}</CellPrimary>
                      <CellMeta className="num">{formatDateTime(t.date, t.time, digits)}</CellMeta>
                    </td>
                    <td style={tableTd}>
                      <CellTone sell={sell}>{typeLabel(t.type)}</CellTone>
                      <CellChannel>
                        {t.channel === 'card' ? 'အကယ်ဒမီအခေါက်ရွှေ' : 'မီးလင်းဖြတ်စ'}
                      </CellChannel>
                    </td>
                    <td style={{ ...tableTd, maxWidth: 240 }}>
                      <CellPrimary
                        style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      >
                        {customerName(t.customer_id, custMap)}
                      </CellPrimary>
                      {nrc ? (
                        <CellMeta
                          className="num"
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {D(nrc, digits)}
                        </CellMeta>
                      ) : null}
                      {t.note ? (
                        <CellMeta
                          style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {t.note}
                        </CellMeta>
                      ) : null}
                    </td>
                    <td
                      className="num"
                      style={{ ...tableTd, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}
                    >
                      <div>{W(t.yway, digits)}</div>
                      {t.channel === 'card' && cardsByTxn.get(t.id)?.length ? (
                        <div style={ty.weightMeta}>{formatCardLines(cardsByTxn.get(t.id)!, digits)}</div>
                      ) : null}
                    </td>
                    <td
                      className="num"
                      style={{ ...tableTd, textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      {money(t.price, digits)}
                    </td>
                    <td
                      className="num"
                      style={{
                        ...tableTd,
                        textAlign: 'right',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: sell ? colors.sell : colors.buy,
                      }}
                    >
                      {money(t.amount, digits)}
                    </td>
                    <td
                      style={{ ...tableTd, paddingRight: 16, textAlign: 'right', whiteSpace: 'nowrap' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openVoucher(t.id)}
                        style={btnTableAction}
                      >
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
          onPage={page.setPage}
        />
      </Card>
    </div>
  );
}
