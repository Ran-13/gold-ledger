import { useMemo } from 'react';
import { Card, CardLabel, MoneyLine, WeightFigure } from '../components/Card';
import { Pill } from '../components/Pill';
import { customerName } from '../lib/format';
import { D, W, money, isoDate, dateTimeKey, stock as stockCalc, voucherNo } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function Dashboard() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const setScreen = useStore((s) => s.setScreen);
  const setVoucherId = useStore((s) => s.setVoucherId);
  const openPriceDialog = useStore((s) => s.openPriceDialog);
  const digits = settings.digits;
  const today = isoDate();

  const sortedPrices = [...prices].sort((a, b) =>
    dateTimeKey(a.date, a.time) < dateTimeKey(b.date, b.time) ? -1 : 1,
  );
  const cur = sortedPrices[sortedPrices.length - 1] ?? {
    buy: 0,
    sell: 0,
    date: today,
    time: '00:00:00',
    id: 0,
  };
  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const adjustments = useStore((s) => s.stockAdjustments);
  const buyY = txns.filter((t) => t.type === 'buy').reduce((a, t) => a + t.yway, 0);
  const sellY = txns.filter((t) => t.type === 'sell').reduce((a, t) => a + t.yway, 0);
  const adjInY = adjustments.filter((a) => a.kind === 'in').reduce((a, x) => a + x.yway, 0);
  const adjOutY = adjustments.filter((a) => a.kind === 'out').reduce((a, x) => a + x.yway, 0);
  const stockY = stockCalc(settings.opening_stock_yway, buyY, sellY, adjInY, adjOutY);

  const tt = txns.filter((t) => t.date === today);
  const tS = tt.filter((t) => t.type === 'sell');
  const tB = tt.filter((t) => t.type === 'buy');
  const sum = (arr: typeof tt, f: (t: (typeof tt)[0]) => number) =>
    arr.reduce((a, t) => a + f(t), 0);

  const recent = [...txns].sort((a, b) => b.voucher_no - a.voucher_no).slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1360 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 22 }}>
        <Card padding="28px 32px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 15, color: colors.muted, lineHeight: 1.6 }}>
                အခေါက်ရွှေ စျေးနှုန်း · ၁ ကျပ်သား · ၁၆ ပဲရည်
              </div>
              <button
                type="button"
                onClick={openPriceDialog}
                style={{
                  height: 36,
                  padding: '0 16px',
                  border: `1.5px solid ${colors.ink}`,
                  borderRadius: 8,
                  background: colors.white,
                  color: colors.ink,
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
              >
                စျေးနှုန်းပြင်ဆင်ရန်
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              <div style={{ paddingRight: 28 }}>
                <div style={{ fontSize: 15, color: colors.muted, lineHeight: 1.6 }}>ဆိုင်ဝယ်ဈေး</div>
                <div
                  className="num"
                  style={{
                    fontSize: 40,
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: colors.ink,
                    marginTop: 6,
                  }}
                >
                  {money(cur.buy, digits)}
                </div>
              </div>
              <div
                style={{
                  borderLeft: `1.5px solid ${colors.cardBorder}`,
                  paddingLeft: 28,
                }}
              >
                <div style={{ fontSize: 15, color: colors.muted, lineHeight: 1.6 }}>ဆိုင်ရောင်းဈေး</div>
                <div
                  className="num"
                  style={{
                    fontSize: 40,
                    fontWeight: 700,
                    lineHeight: 1.15,
                    color: colors.ink,
                    marginTop: 6,
                  }}
                >
                  {money(cur.sell, digits)}
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="28px 30px" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6 }}>လက်ကျန်</div>
          <WeightFigure size={28}>{W(stockY, digits)}</WeightFigure>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setScreen('stock')}
              style={{
                background: 'none',
                border: 'none',
                color: colors.ink,
                fontWeight: 700,
                fontSize: 15,
                padding: 0,
                lineHeight: 1.5,
                cursor: 'pointer',
              }}
            >
              ကြည့်ရန် →
            </button>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16 }}>
        <Card padding="22px 22px">
          <CardLabel>ယနေ့ ရောင်းရွှေ</CardLabel>
          <div style={{ marginTop: 6 }}>
            <WeightFigure>{W(sum(tS, (t) => t.yway), digits)}</WeightFigure>
          </div>
          <div style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>{D(tS.length, digits)} စောင်</div>
        </Card>
        <Card padding="22px 22px">
          <CardLabel>ယနေ့ ရောင်းငွေ</CardLabel>
          <div className="num" style={{ marginTop: 6, fontSize: 28, fontWeight: 700, color: colors.sell, lineHeight: 1.3 }}>
            {money(sum(tS, (t) => t.amount), digits)}
          </div>
          <div style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>ကျပ်</div>
        </Card>
        <Card padding="22px 22px">
          <CardLabel>ယနေ့ ဝယ်ရွှေ</CardLabel>
          <div style={{ marginTop: 6 }}>
            <WeightFigure color={colors.buy}>{W(sum(tB, (t) => t.yway), digits)}</WeightFigure>
          </div>
          <div style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>{D(tB.length, digits)} စောင်</div>
        </Card>
        <Card padding="22px 22px">
          <CardLabel>ယနေ့ ဝယ်ငွေ</CardLabel>
          <div className="num" style={{ marginTop: 6, fontSize: 28, fontWeight: 700, color: colors.buy, lineHeight: 1.3 }}>
            {money(sum(tB, (t) => t.amount), digits)}
          </div>
          <div style={{ fontSize: 14, color: colors.muted, marginTop: 4 }}>ကျပ်</div>
        </Card>
      </div>

      <Card padding="22px 26px">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.4 }}>နောက်ဆုံးစာရင်း</div>
            <div style={{ fontSize: 13, color: colors.muted }}>ဘောင်ချာ အသစ်များ</div>
          </div>
          <button
            type="button"
            onClick={() => setScreen('ledger')}
            style={{
              background: 'none',
              border: 'none',
              color: colors.ink,
              fontSize: 14,
              fontWeight: 600,
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
          >
            အားလုံး →
          </button>
        </div>
        {recent.length === 0 && (
          <div style={{ padding: '28px 0', color: colors.muted2, fontSize: 15, textAlign: 'center' }}>
            စာရင်း မရှိသေးပါ
          </div>
        )}
        {recent.map((t) => (
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              setVoucherId(t.id);
              setScreen('voucher');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setVoucherId(t.id);
                setScreen('voucher');
              }
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto minmax(0, 1fr) auto',
              gap: 12,
              alignItems: 'center',
              padding: '12px 0',
              borderTop: `1px solid ${colors.rowDivider}`,
              cursor: 'pointer',
            }}
          >
            <Pill type={t.type} />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  lineHeight: 1.4,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {customerName(t.customer_id, custMap)}
              </div>
              <div style={{ fontSize: 13, color: colors.muted2, marginTop: 2 }}>
                {voucherNo(t.voucher_no, digits)} · {D(t.date, digits)} · စျေး {money(t.price, digits)}
              </div>
              <MoneyLine>{money(t.amount, digits)} ကျပ်</MoneyLine>
            </div>
            <WeightFigure size={17}>{W(t.yway, digits)}</WeightFigure>
          </div>
        ))}
      </Card>
    </div>
  );
}
