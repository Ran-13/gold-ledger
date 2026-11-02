import { useMemo } from 'react';
import { Card } from '../components/Card';
import { SimpleBars14 } from '../components/Charts';
import { customerName, pillStyle, typeLabel } from '../lib/format';
import { lastNDates } from '../lib/reports';
import { D, W, money, isoDate, stock as stockCalc } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function Dashboard() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const setScreen = useStore((s) => s.setScreen);
  const setVoucherId = useStore((s) => s.setVoucherId);
  const digits = settings.digits;
  const today = isoDate();

  const sortedPrices = [...prices].sort((a, b) => (a.date < b.date ? -1 : 1));
  const cur = sortedPrices[sortedPrices.length - 1] ?? { buy: 0, sell: 0, date: today };
  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const buyY = txns.filter((t) => t.type === 'buy').reduce((a, t) => a + t.yway, 0);
  const sellY = txns.filter((t) => t.type === 'sell').reduce((a, t) => a + t.yway, 0);
  const stockY = stockCalc(settings.opening_stock_yway, buyY, sellY);

  const tt = txns.filter((t) => t.date === today);
  const tS = tt.filter((t) => t.type === 'sell');
  const tB = tt.filter((t) => t.type === 'buy');
  const sum = (arr: typeof tt, f: (t: (typeof tt)[0]) => number) =>
    arr.reduce((a, t) => a + f(t), 0);

  const bars = useMemo(() => {
    const dates = lastNDates(14);
    const ds = dates.map((d) => {
      const day = txns.filter((t) => t.date === d);
      const sa = sum(
        day.filter((t) => t.type === 'sell'),
        (t) => t.yway,
      );
      const ba = sum(
        day.filter((t) => t.type === 'buy'),
        (t) => t.yway,
      );
      return { d, sa, ba };
    });
    const mx = Math.max(1, ...ds.map((x) => Math.max(x.sa, x.ba)));
    return ds.map((x) => ({
      label: String(+x.d.slice(8)),
      title: `${x.d} · ရောင်း ${W(x.sa, digits)} · ဝယ် ${W(x.ba, digits)}`,
      sellH: (x.sa / mx) * 100,
      buyH: (x.ba / mx) * 100,
    }));
  }, [txns, digits]);

  const recent = [...txns]
    .sort((a, b) => b.voucher_no - a.voucher_no)
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1360 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 24 }}>
        <Card navy padding="34px 38px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, color: colors.mutedOnNavy }}>
                ယနေ့ပေါက်ဈေး · ၁ ကျပ်သား · ၁၆ ပဲရည်
              </div>
              <button
                type="button"
                onClick={() => setScreen('prices')}
                style={{
                  height: 38,
                  padding: '0 18px',
                  border: `1px solid ${colors.goldNav}`,
                  borderRadius: 8,
                  background: 'none',
                  color: colors.goldOnNavy,
                  fontSize: 15,
                }}
              >
                ဈေးပြင်မည်
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              <div>
                <div style={{ fontSize: 16, color: colors.mutedOnNavy }}>ဆိုင်ဝယ်ဈေး</div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 46,
                    fontWeight: 600,
                    lineHeight: 1.1,
                    color: colors.white,
                  }}
                >
                  {money(cur.buy, digits)}
                </div>
              </div>
              <div style={{ borderLeft: `1px solid ${colors.navyBorder}`, paddingLeft: 28 }}>
                <div style={{ fontSize: 16, color: colors.mutedOnNavy }}>ဆိုင်ရောင်းဈေး</div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 46,
                    fontWeight: 600,
                    lineHeight: 1.1,
                    color: colors.goldOnNavy,
                  }}
                >
                  {money(cur.sell, digits)}
                </div>
              </div>
            </div>
          </div>
        </Card>
        <Card padding="34px">
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16, minHeight: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 600 }}>လက်ကျန်ရွှေ (အခေါက်)</div>
            <div
              style={{
                fontFamily: "'IBM Plex Sans', 'Noto Sans Myanmar', sans-serif",
                fontSize: 26,
                fontWeight: 700,
                lineHeight: 1.3,
              }}
            >
              {W(stockY, digits)}
            </div>
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
                }}
              >
                ကြည့်ရန် →
              </button>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 }}>
        <Card padding="26px 28px">
          <div style={{ fontSize: 16, color: colors.muted }}>ယနေ့ ရောင်းရွှေ</div>
          <div
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.4,
              marginTop: 6,
            }}
          >
            {W(sum(tS, (t) => t.yway), digits)}
          </div>
          <div style={{ fontSize: 15, color: colors.sell, marginTop: 4 }}>
            {money(sum(tS, (t) => t.amount), digits)} ကျပ် · {D(tS.length, digits)} စောင်
          </div>
        </Card>
        <Card padding="26px 28px">
          <div style={{ fontSize: 16, color: colors.muted }}>ယနေ့ ဝယ်ရွှေ</div>
          <div
            style={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.4,
              marginTop: 6,
            }}
          >
            {W(sum(tB, (t) => t.yway), digits)}
          </div>
          <div style={{ fontSize: 15, color: colors.buy, marginTop: 4 }}>
            {money(sum(tB, (t) => t.amount), digits)} ကျပ် · {D(tB.length, digits)} စောင်
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 24 }}>
        <Card padding="28px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
                ရက် ၁၄ ရက်
              </div>
              <div style={{ display: 'flex', gap: 18, fontSize: 15, color: colors.muted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: colors.gold }} />
                  ရောင်း
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: colors.buyBarSoft }} />
                  ဝယ်
                </span>
              </div>
            </div>
            <SimpleBars14 bars={bars} />
          </div>
        </Card>
        <Card padding="28px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
                နောက်ဆုံးစာရင်း
              </div>
              <button
                type="button"
                onClick={() => setScreen('ledger')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.goldDark,
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                အားလုံး →
              </button>
            </div>
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
                  gap: 14,
                  alignItems: 'center',
                  padding: '12px 0',
                  borderTop: `1px solid ${colors.rowDivider}`,
                  cursor: 'pointer',
                }}
              >
                <span style={pillStyle(t.type)}>{typeLabel(t.type)}</span>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {customerName(t.customer_id, custMap)}
                  </div>
                  <div style={{ fontSize: 14, color: colors.muted2 }}>{money(t.amount, digits)} ကျပ်</div>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, whiteSpace: 'nowrap' }}>{W(t.yway, digits)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
