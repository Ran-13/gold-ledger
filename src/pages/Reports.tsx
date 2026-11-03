import { useMemo, type CSSProperties } from 'react';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { customerName } from '../lib/format';
import { lastNDates, marginOf, enumerateDates } from '../lib/reports';
import { D, W, addDays, isoDate, money, voucherNo } from '../lib/units';
import { MONTHS_MY, colors } from '../styles/tokens';
import { useStore } from '../store';

const radiiBtn = 6;

const th: CSSProperties = {
  padding: '12px 16px',
  fontWeight: 600,
  fontSize: 13,
  color: colors.muted,
  background: '#F7F8FA',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const td: CSSProperties = {
  padding: '13px 16px',
  borderTop: `1px solid ${colors.rowDivider}`,
  fontSize: 15,
};

function MonthNav({
  label,
  onPrev,
  onNext,
  showPrint,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  showPrint?: boolean;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          onClick={onPrev}
          style={{
            width: 44,
            height: 44,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: radiiBtn,
            background: colors.white,
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: 22, fontWeight: 700, minWidth: 220, textAlign: 'center' }}>{label}</div>
        <button
          type="button"
          onClick={onNext}
          style={{
            width: 44,
            height: 44,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: radiiBtn,
            background: colors.white,
            fontSize: 18,
            cursor: 'pointer',
          }}
        >
          ›
        </button>
      </div>
      {showPrint && (
        <button
          type="button"
          data-noprint="1"
          onClick={() => window.print()}
          style={{
            height: 44,
            padding: '0 22px',
            border: `1.5px solid ${colors.ink}`,
            borderRadius: radiiBtn,
            background: 'none',
            color: colors.ink,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ပရင့်ထုတ်မည်
        </button>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'sell' | 'buy' | 'ink';
}) {
  const color = tone === 'sell' ? colors.sell : tone === 'buy' ? colors.buy : colors.ink;
  return (
    <Card padding="20px 22px">
      <div style={{ fontSize: 14, color: colors.muted, fontWeight: 600 }}>{label}</div>
      <div className="num" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.35, marginTop: 6, color }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 13, color: colors.muted, marginTop: 4, lineHeight: 1.45 }}>{sub}</div>
      )}
    </Card>
  );
}

export function Reports() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const repMode = useStore((s) => s.repMode);
  const setRepMode = useStore((s) => s.setRepMode);
  const repMonth = useStore((s) => s.repMonth);
  const setRepMonth = useStore((s) => s.setRepMonth);
  const repYear = useStore((s) => s.repYear);
  const setRepYear = useStore((s) => s.setRepYear);
  const range = useStore((s) => s.range);
  const setRange = useStore((s) => s.setRange);
  const digits = settings.digits;
  const today = isoDate();

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const buyByDate = useMemo(() => {
    const map: Record<string, number> = {};
    const sorted = [...prices].sort((a, b) => {
      const ka = `${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}`;
      const kb = `${b.date}T${b.time.length === 5 ? b.time + ':00' : b.time}`;
      return ka < kb ? -1 : 1;
    });
    for (const p of sorted) map[p.date] = p.buy;
    return map;
  }, [prices]);

  const sortedPrices = [...prices].sort((a, b) => (a.date < b.date ? -1 : 1));
  const firstPrice = sortedPrices[0]?.buy ?? 0;

  const avgCostAll = useMemo(() => {
    const buys = txns.filter((t) => t.type === 'buy');
    const buyY = buys.reduce((a, t) => a + t.yway, 0);
    const num =
      settings.opening_stock_yway * firstPrice + buys.reduce((a, t) => a + t.yway * t.price, 0);
    return num / Math.max(1, settings.opening_stock_yway + buyY);
  }, [txns, settings.opening_stock_yway, firstPrice]);

  const dayData = useMemo(() => {
    const rn = range === 'all' ? null : +range;
    const rFrom = rn ? isoDate(addDays(new Date(), -(rn - 1))) : '';
    const rt = txns.filter((t) => !rFrom || t.date >= rFrom);
    const rS = rt.filter((t) => t.type === 'sell');
    const rB = rt.filter((t) => t.type === 'buy');
    const sum = (arr: typeof rt, f: (t: (typeof rt)[0]) => number) =>
      arr.reduce((a, t) => a + f(t), 0);

    let rds: string[];
    if (rn) rds = lastNDates(rn);
    else {
      const dates = txns.map((t) => t.date).sort();
      const from = dates[0] ?? today;
      rds = enumerateDates(from, today);
    }
    const rDates = [...new Set(rt.map((t) => t.date))].sort().reverse();
    const byC: Record<string, { name: string; count: number; amt: number }> = {};
    rt.forEach((t) => {
      const k = String(t.customer_id ?? '_');
      if (!byC[k]) byC[k] = { name: customerName(t.customer_id, custMap), count: 0, amt: 0 };
      byC[k].count++;
      byC[k].amt += t.amount;
    });
    return {
      rangeLabel: rn ? `${D(rFrom, digits)} → ${D(today, digits)}` : 'မှတ်တမ်းအားလုံး',
      sellW: W(sum(rS, (t) => t.yway), digits),
      sellAmt: money(sum(rS, (t) => t.amount), digits),
      sellCount: D(rS.length, digits),
      buyW: W(sum(rB, (t) => t.yway), digits),
      buyAmt: money(sum(rB, (t) => t.amount), digits),
      buyCount: D(rB.length, digits),
      margin: money(marginOf(rS, buyByDate), digits),
      avgCost: money(avgCostAll, digits),
      dayCount: D(rds.length, digits),
      days: rDates.map((d) => {
        const a = rt.filter((t) => t.date === d);
        const sa = a.filter((t) => t.type === 'sell');
        const ba = a.filter((t) => t.type === 'buy');
        return {
          date: d,
          sellW: sa.length ? W(sum(sa, (t) => t.yway), digits) : '—',
          sellAmt: sa.length ? money(sum(sa, (t) => t.amount), digits) : '—',
          sellN: sa.length,
          buyW: ba.length ? W(sum(ba, (t) => t.yway), digits) : '—',
          buyAmt: ba.length ? money(sum(ba, (t) => t.amount), digits) : '—',
          buyN: ba.length,
          margin: sa.length ? money(marginOf(sa, buyByDate), digits) : '—',
        };
      }),
      top: Object.values(byC)
        .sort((a, b) => b.amt - a.amt)
        .slice(0, 8)
        .map((x) => ({
          name: x.name,
          count: D(x.count, digits),
          amount: money(x.amt, digits),
        })),
    };
  }, [range, txns, buyByDate, digits, today, custMap, avgCostAll]);

  const monthData = useMemo(() => {
    const ym = repMonth;
    const [Y, M] = ym.split('-').map(Number) as [number, number];
    const mt = txns.filter((t) => t.date.slice(0, 7) === ym);
    const ms = mt.filter((t) => t.type === 'sell');
    const mb = mt.filter((t) => t.type === 'buy');
    const sum = (arr: typeof mt, f: (t: (typeof mt)[0]) => number) =>
      arr.reduce((a, t) => a + f(t), 0);
    const sp = sum(ms, (t) => t.yway);
    const bp = sum(mb, (t) => t.yway);
    const sa = sum(ms, (t) => t.amount);
    const lr = (t: (typeof mt)[0]) => ({
      no: voucherNo(t.voucher_no, digits),
      date: D(t.date, digits),
      cust: customerName(t.customer_id, custMap),
      pure: W(t.yway, digits),
      price: money(t.price, digits),
      amount: money(t.amount, digits),
    });
    return {
      label: `${D(Y, digits)} · ${MONTHS_MY[M - 1]}`,
      shift: (d: number) => {
        const x = new Date(Y, M - 1 + d, 1);
        setRepMonth(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
      },
      sellPure: W(sp, digits),
      sellAmt: money(sa, digits),
      sellCount: D(ms.length, digits),
      buyPure: W(bp, digits),
      buyAmt: money(sum(mb, (t) => t.amount), digits),
      buyCount: D(mb.length, digits),
      net: W(bp - sp, digits),
      margin: money(marginOf(ms, buyByDate), digits),
      avgCost: money(bp ? sum(mb, (t) => t.yway * t.price) / bp : 0, digits),
      sells: ms.map(lr),
      buys: mb.map(lr),
      sellTot: { count: D(ms.length, digits), pure: W(sp, digits), amt: money(sa, digits) },
      buyTot: {
        count: D(mb.length, digits),
        pure: W(bp, digits),
        amt: money(sum(mb, (t) => t.amount), digits),
      },
    };
  }, [repMonth, txns, buyByDate, digits, custMap, setRepMonth]);

  const yearData = useMemo(() => {
    const Y = repYear;
    const yt = txns.filter((t) => +t.date.slice(0, 4) === Y);
    const yS = yt.filter((t) => t.type === 'sell');
    const yB = yt.filter((t) => t.type === 'buy');
    const sum = (arr: typeof yt, f: (t: (typeof yt)[0]) => number) =>
      arr.reduce((a, t) => a + f(t), 0);
    const sp = sum(yS, (t) => t.yway);
    const bp = sum(yB, (t) => t.yway);
    const sa = sum(yS, (t) => t.amount);
    const ms = Array.from({ length: 12 }, (_, i) => {
      const k = `${Y}-${String(i + 1).padStart(2, '0')}`;
      const a = yt.filter((t) => t.date.slice(0, 7) === k);
      const saM = a.filter((t) => t.type === 'sell');
      const baM = a.filter((t) => t.type === 'buy');
      return {
        k,
        i,
        n: a.length,
        sA: sum(saM, (t) => t.amount),
        bA: sum(baM, (t) => t.amount),
        sP: sum(saM, (t) => t.yway),
        bP: sum(baM, (t) => t.yway),
        sa: saM,
      };
    });
    return {
      label: `${D(Y, digits)} ခုနှစ်`,
      prev: () => setRepYear(Y - 1),
      next: () => setRepYear(Y + 1),
      sellPure: W(sp, digits),
      sellAmt: money(sa, digits),
      sellCount: D(yS.length, digits),
      buyPure: W(bp, digits),
      buyAmt: money(sum(yB, (t) => t.amount), digits),
      buyCount: D(yB.length, digits),
      net: W(bp - sp, digits),
      margin: money(marginOf(yS, buyByDate), digits),
      avgCost: money(bp ? sum(yB, (t) => t.yway * t.price) / bp : 0, digits),
      rows: ms.map((m) => ({
        name: MONTHS_MY[m.i]!,
        count: D(m.n, digits),
        sellPure: m.sP ? W(m.sP, digits) : '—',
        sellAmt: m.sA ? money(m.sA, digits) : '—',
        buyPure: m.bP ? W(m.bP, digits) : '—',
        buyAmt: m.bA ? money(m.bA, digits) : '—',
        margin: m.sA ? money(marginOf(m.sa, buyByDate), digits) : '—',
        onOpen: () => {
          setRepMode('month');
          setRepMonth(m.k);
        },
      })),
    };
  }, [repYear, txns, buyByDate, digits, setRepYear, setRepMode, setRepMonth]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1360 }}>
      <div data-noprint="1">
        <Segmented
          options={[
            { value: 'day', label: 'နေ့စဉ်' },
            { value: 'month', label: 'လချုပ်' },
            { value: 'year', label: 'နှစ်ချုပ်' },
          ]}
          value={repMode}
          onChange={setRepMode}
        />
      </div>

      {repMode === 'day' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>နေ့စဉ် အနှစ်ချုပ်</div>
              <div style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>{dayData.rangeLabel}</div>
            </div>
            <Segmented
              options={[
                { value: '7', label: '၇ ရက်' },
                { value: '30', label: '၃၀ ရက်' },
                { value: '90', label: '၉၀ ရက်' },
                { value: 'all', label: 'အားလုံး' },
              ]}
              value={range}
              onChange={setRange}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <SummaryCard
              label="ရောင်းရွှေ"
              value={dayData.sellW}
              sub={`${dayData.sellCount} စောင်`}
              tone="sell"
            />
            <SummaryCard
              label="ရောင်းငွေ"
              value={`${dayData.sellAmt}`}
              sub="ကျပ်"
              tone="sell"
            />
            <SummaryCard
              label="ဝယ်ရွှေ"
              value={dayData.buyW}
              sub={`${dayData.buyCount} စောင်`}
              tone="buy"
            />
            <SummaryCard
              label="ဝယ်ငွေ"
              value={`${dayData.buyAmt}`}
              sub="ကျပ်"
              tone="buy"
            />
          </div>

          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 8px' }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>နေ့အလိုက် စာရင်း</div>
              <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                ရက်စွဲအလိုက် ရောင်း / ဝယ် / အမြတ်
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>ရက်စွဲ</th>
                  <th style={th}>ရောင်း</th>
                  <th style={{ ...th, textAlign: 'right' }}>ရောင်းငွေ</th>
                  <th style={th}>ဝယ်</th>
                  <th style={{ ...th, textAlign: 'right' }}>ဝယ်ငွေ</th>
                  <th style={{ ...th, textAlign: 'right' }}>အမြတ်</th>
                </tr>
              </thead>
              <tbody>
                {dayData.days.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ ...td, textAlign: 'center', color: colors.muted2, padding: 36 }}>
                      ဤကာလတွင် စာရင်း မရှိပါ
                    </td>
                  </tr>
                )}
                {dayData.days.map((d) => (
                  <tr key={d.date}>
                    <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{D(d.date, digits)}</td>
                    <td
                      className="num"
                      style={{
                        ...td,
                        fontWeight: d.sellN ? 700 : 400,
                        color: d.sellN ? colors.sell : colors.muted2,
                      }}
                    >
                      {d.sellW}
                    </td>
                    <td className="num" style={{ ...td, textAlign: 'right', color: colors.muted }}>
                      {d.sellAmt}
                    </td>
                    <td
                      className="num"
                      style={{
                        ...td,
                        fontWeight: d.buyN ? 700 : 400,
                        color: d.buyN ? colors.buy : colors.muted2,
                      }}
                    >
                      {d.buyW}
                    </td>
                    <td className="num" style={{ ...td, textAlign: 'right', color: colors.muted }}>
                      {d.buyAmt}
                    </td>
                    <td
                      className="num"
                      style={{ ...td, textAlign: 'right', fontWeight: 600, color: colors.sell }}
                    >
                      {d.margin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 8px' }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>ဖောက်သည် ထိပ်ဆုံး</div>
              <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>ငွေပမာဏအလိုက်</div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>ဖောက်သည်</th>
                  <th style={th}>စောင်ရေ</th>
                  <th style={{ ...th, textAlign: 'right' }}>စုစုပေါင်းငွေ</th>
                </tr>
              </thead>
              <tbody>
                {dayData.top.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ ...td, textAlign: 'center', color: colors.muted2, padding: 28 }}>
                      ဖောက်သည် မရှိသေးပါ
                    </td>
                  </tr>
                )}
                {dayData.top.map((c, i) => (
                  <tr key={c.name}>
                    <td style={{ ...td, color: colors.muted2, width: 48 }}>{D(i + 1, digits)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{c.name}</td>
                    <td style={td}>{c.count} စောင်</td>
                    <td className="num" style={{ ...td, textAlign: 'right', fontWeight: 700 }}>
                      {c.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {repMode === 'month' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MonthNav
            label={monthData.label}
            onPrev={() => monthData.shift(-1)}
            onNext={() => monthData.shift(1)}
            showPrint
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <SummaryCard
              label="ရောင်းရွှေ"
              value={monthData.sellPure}
              sub={`${monthData.sellCount} စောင်`}
              tone="sell"
            />
            <SummaryCard
              label="ရောင်းငွေ"
              value={`${monthData.sellAmt}`}
              sub="ကျပ်"
              tone="sell"
            />
            <SummaryCard
              label="ဝယ်ရွှေ"
              value={monthData.buyPure}
              sub={`${monthData.buyCount} စောင်`}
              tone="buy"
            />
            <SummaryCard
              label="ဝယ်ငွေ"
              value={`${monthData.buyAmt}`}
              sub="ကျပ်"
              tone="buy"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18 }}>
            <TxnList
              title="ရောင်းရသည့်စာရင်း"
              titleColor={colors.sell}
              count={monthData.sellTot.count}
              rows={monthData.sells}
              tot={monthData.sellTot}
            />
            <TxnList
              title="ဝယ်ရသည့်စာရင်း"
              titleColor={colors.buy}
              count={monthData.buyTot.count}
              rows={monthData.buys}
              tot={monthData.buyTot}
            />
          </div>
        </div>
      )}

      {repMode === 'year' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <MonthNav label={yearData.label} onPrev={yearData.prev} onNext={yearData.next} showPrint />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
            <SummaryCard
              label="ရောင်းရွှေ"
              value={yearData.sellPure}
              sub={`${yearData.sellCount} စောင်`}
              tone="sell"
            />
            <SummaryCard
              label="ရောင်းငွေ"
              value={`${yearData.sellAmt}`}
              sub="ကျပ်"
              tone="sell"
            />
            <SummaryCard
              label="ဝယ်ရွှေ"
              value={yearData.buyPure}
              sub={`${yearData.buyCount} စောင်`}
              tone="buy"
            />
            <SummaryCard
              label="ဝယ်ငွေ"
              value={`${yearData.buyAmt}`}
              sub="ကျပ်"
              tone="buy"
            />
          </div>
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px 8px' }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>လအလိုက် စာရင်း</div>
              <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                လတစ်ခုကို နှိပ်ပြီး လချုပ် ကြည့်နိုင်သည်
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>လ</th>
                  <th style={th}>ရောင်း</th>
                  <th style={{ ...th, textAlign: 'right' }}>ရောင်းငွေ</th>
                  <th style={th}>ဝယ်</th>
                  <th style={{ ...th, textAlign: 'right' }}>ဝယ်ငွေ</th>
                  <th style={{ ...th, textAlign: 'right' }}>အမြတ်</th>
                </tr>
              </thead>
              <tbody>
                {yearData.rows.map((m) => (
                  <tr
                    key={m.name}
                    onClick={m.onOpen}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FAFBFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '';
                    }}
                  >
                    <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {m.name}
                      <div style={{ fontSize: 13, color: colors.muted2, fontWeight: 400 }}>{m.count} စောင်</div>
                    </td>
                    <td className="num" style={{ ...td, fontWeight: 700, color: colors.sell }}>
                      {m.sellPure}
                    </td>
                    <td className="num" style={{ ...td, textAlign: 'right', color: colors.muted }}>
                      {m.sellAmt}
                    </td>
                    <td className="num" style={{ ...td, fontWeight: 700, color: colors.buy }}>
                      {m.buyPure}
                    </td>
                    <td className="num" style={{ ...td, textAlign: 'right', color: colors.muted }}>
                      {m.buyAmt}
                    </td>
                    <td
                      className="num"
                      style={{ ...td, textAlign: 'right', color: colors.sell, fontWeight: 600 }}
                    >
                      {m.margin}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F3F5F7', fontWeight: 700 }}>
                  <td style={{ ...td, borderTop: `1.5px solid ${colors.cardBorder}` }}>စုစုပေါင်း</td>
                  <td
                    className="num"
                    style={{ ...td, borderTop: `1.5px solid ${colors.cardBorder}`, color: colors.sell }}
                  >
                    {yearData.sellPure}
                  </td>
                  <td
                    className="num"
                    style={{ ...td, borderTop: `1.5px solid ${colors.cardBorder}`, textAlign: 'right' }}
                  >
                    {yearData.sellAmt}
                  </td>
                  <td
                    className="num"
                    style={{ ...td, borderTop: `1.5px solid ${colors.cardBorder}`, color: colors.buy }}
                  >
                    {yearData.buyPure}
                  </td>
                  <td
                    className="num"
                    style={{ ...td, borderTop: `1.5px solid ${colors.cardBorder}`, textAlign: 'right' }}
                  >
                    {yearData.buyAmt}
                  </td>
                  <td
                    className="num"
                    style={{
                      ...td,
                      borderTop: `1.5px solid ${colors.cardBorder}`,
                      textAlign: 'right',
                      color: colors.sell,
                    }}
                  >
                    {yearData.margin}
                  </td>
                </tr>
              </tfoot>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

function TxnList({
  title,
  titleColor,
  count,
  rows,
  tot,
}: {
  title: string;
  titleColor: string;
  count: string;
  rows: { no: string; date: string; cust: string; pure: string; price: string; amount: string }[];
  tot: { count: string; pure: string; amt: string };
}) {
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 18px 8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: titleColor }}>{title}</div>
        <div style={{ fontSize: 13, color: colors.muted }}>{count} စောင်</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>ဘောင်ချာ</th>
            <th style={th}>ဖောက်သည်</th>
            <th style={th}>အလေးချိန်</th>
            <th style={{ ...th, textAlign: 'right' }}>စျေး</th>
            <th style={{ ...th, textAlign: 'right' }}>ငွေ</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} style={{ ...td, textAlign: 'center', color: colors.muted2, padding: 28 }}>
                စာရင်း မရှိပါ
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.no + r.date}>
              <td style={{ ...td, whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 600 }}>{r.no}</div>
                <div style={{ fontSize: 13, color: colors.muted2 }}>{r.date}</div>
              </td>
              <td style={td}>{r.cust}</td>
              <td className="num" style={{ ...td, whiteSpace: 'nowrap', fontWeight: 700 }}>
                {r.pure}
              </td>
              <td className="num" style={{ ...td, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}>
                {r.price}
              </td>
              <td className="num" style={{ ...td, textAlign: 'right', color: colors.muted, whiteSpace: 'nowrap' }}>
                {r.amount}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: '#F3F5F7', fontWeight: 700 }}>
            <td colSpan={2} style={{ ...td, borderTop: `1.5px solid ${colors.cardBorder}` }}>
              စုစုပေါင်း
            </td>
            <td
              className="num"
              style={{ ...td, borderTop: `1.5px solid ${colors.cardBorder}`, whiteSpace: 'nowrap' }}
            >
              {tot.pure}
            </td>
            <td
              className="num"
              style={{ ...td, borderTop: `1.5px solid ${colors.cardBorder}`, textAlign: 'right' }}
            >
              —
            </td>
            <td
              className="num"
              style={{
                ...td,
                borderTop: `1.5px solid ${colors.cardBorder}`,
                textAlign: 'right',
                whiteSpace: 'nowrap',
              }}
            >
              {tot.amt}
            </td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}
