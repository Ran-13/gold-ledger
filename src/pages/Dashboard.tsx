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
  tableHover,
  tableTd,
  tableTh,
  ty,
} from '../components/ClearUI';
import { IconCalendar } from '../components/Icons';
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
  formatDate,
  formatDateTime,
  money,
  isoDate,
  stock as stockCalc,
  sumMoney,
  voucherNo,
} from '../lib/units';
import { colors, radii } from '../styles/tokens';
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

  const tt = txns.filter((t) => t.date === today);
  const tS = tt.filter((t) => t.type === 'sell');
  const tB = tt.filter((t) => t.type === 'buy');
  const sum = (arr: typeof tt, f: (t: (typeof tt)[0]) => number) =>
    arr.reduce((a, t) => a + f(t), 0);

  const sellAmt = sumMoney(tS, (t) => t.amount);
  const buyAmt = sumMoney(tB, (t) => t.amount);
  const sellGold = sum(tS, (t) => t.yway);
  const buyGold = sum(tB, (t) => t.yway);

  const recent = [...txns].sort((a, b) => b.voucher_no - a.voucher_no).slice(0, 8);

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
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 14px',
            borderRadius: radii.button,
            background: colors.white,
            border: `1.5px solid ${colors.cardBorder}`,
            color: colors.ink,
          }}
        >
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: radii.md,
              background: '#EEF2F7',
              color: colors.ink,
              flexShrink: 0,
            }}
          >
            <IconCalendar size={17} />
          </span>
          <span className="num" style={{ fontSize: 20, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1.2 }}>
            {formatDate(today, digits)}
          </span>
        </div>
        <TextBtn onClick={() => setScreen('stock')}>လက်ကျန် ကြည့်ရန် →</TextBtn>
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
          <div style={ty.section}>နောက်ဆုံး စာရင်း</div>
          <TextBtn onClick={() => setScreen('ledger')}>အားလုံး →</TextBtn>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead>
              <tr>
                <th style={{ ...tableTh, paddingLeft: 16 }}>ဘောင်ချာ</th>
                <th style={tableTh}>အမျိုးအစား</th>
                <th style={tableTh}>ဖောက်သည်</th>
                <th style={{ ...tableTh, textAlign: 'right' }}>အလေးချိန်</th>
                <th style={{ ...tableTh, textAlign: 'right' }}>စျေး</th>
                <th style={{ ...tableTh, paddingRight: 16, textAlign: 'right' }}>ငွေ</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    style={{
                      ...tableTd,
                      padding: '36px 16px',
                      textAlign: 'center',
                      color: colors.muted2,
                      borderBottom: 'none',
                    }}
                  >
                    ယနေ့ / မကြာသေးမီ စာရင်း မရှိသေးပါ
                  </td>
                </tr>
              )}
              {recent.map((t) => {
                const sell = t.type === 'sell';
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
                        paddingRight: 16,
                        textAlign: 'right',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        color: sell ? colors.sell : colors.buy,
                      }}
                    >
                      {money(t.amount, digits)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
