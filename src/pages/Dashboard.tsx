import { useMemo } from 'react';
import { Card } from '../components/Card';
import { MiniFact, StatStrip, TextBtn } from '../components/ClearUI';
import { Pill } from '../components/Pill';
import { customerName } from '../lib/format';
import {
  cardStockTotalYway,
  computeCardStock,
  formatCardLines,
  isCardDenom,
  type CardDenom,
} from '../lib/cards';
import { D, W, money, isoDate, stock as stockCalc, sumMoney, voucherNo } from '../lib/units';
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
        <div style={{ fontSize: 16, fontWeight: 600, color: colors.muted }}>{D(today, digits)}</div>
        <TextBtn onClick={() => setScreen('stock')}>လက်ကျန် ကြည့်ရန် →</TextBtn>
      </div>

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
        <MiniFact label="လက်ကျန်(အကယ်ဒမီအခေါက်ရွှေ)" value={W(cardY, digits)} />
        <MiniFact label="လက်ကျန်(မီးလင်းဖြတ်စ)" value={W(looseY, digits)} />
      </StatStrip>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: `1px solid ${colors.rowDivider}`,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>နောက်ဆုံး စာရင်း</div>
          <TextBtn onClick={() => setScreen('ledger')}>အားလုံး →</TextBtn>
        </div>

        {recent.length === 0 ? (
          <div style={{ padding: '36px 20px', textAlign: 'center', color: colors.muted2, fontSize: 16 }}>
            ယနေ့ / မကြာသေးမီ စာရင်း မရှိသေးပါ
          </div>
        ) : (
          recent.map((t, i) => {
            const sell = t.type === 'sell';
            return (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                onClick={() => openVoucher(t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') openVoucher(t.id);
                }}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                  gap: 14,
                  alignItems: 'center',
                  padding: '13px 16px',
                  borderTop: i === 0 ? 'none' : `1px solid ${colors.rowDivider}`,
                  cursor: 'pointer',
                }}
              >
                <Pill type={t.type} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {customerName(t.customer_id, custMap)}
                  </div>
                  <div style={{ fontSize: 14, color: colors.muted2, marginTop: 3, lineHeight: 1.4 }}>
                    {voucherNo(t.voucher_no, digits)} · {D(t.date, digits)} ·{' '}
                    {t.channel === 'card' ? 'အကယ်ဒမီအခေါက်ရွှေ' : 'မီးလင်းဖြတ်စ'}
                    {t.channel === 'card' && cardsByTxn.get(t.id)?.length
                      ? ` · ${formatCardLines(cardsByTxn.get(t.id)!, digits)}`
                      : ''}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    className="num"
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: sell ? colors.sell : colors.buy,
                      lineHeight: 1.25,
                    }}
                  >
                    {money(t.amount, digits)}
                  </div>
                  <div className="num" style={{ fontSize: 14, color: colors.muted2, marginTop: 2 }}>
                    {W(t.yway, digits)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
