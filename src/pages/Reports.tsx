import { useMemo } from 'react';
import { Card } from '../components/Card';
import { DivergingBars, ProfitBars, StockLine } from '../components/Charts';
import { Segmented } from '../components/Segmented';
import { customerName } from '../lib/format';
import {
  bucketDates,
  enumerateDates,
  lastNDates,
  makeChartData,
  marginOf,
  monthDayBuckets,
  yearMonthBuckets,
} from '../lib/reports';
import { D, W, addDays, isoDate, money, voucherNo } from '../lib/units';
import { MONTHS_MY, colors } from '../styles/tokens';
import { useStore } from '../store';

function ChartSection({
  title,
  unit,
  cols,
  stock,
  profitTotal,
  first,
  last,
  useShortLabel,
}: {
  title?: string;
  unit: string;
  cols: ReturnType<typeof makeChartData>['cols'];
  stock: ReturnType<typeof makeChartData>['stock'];
  profitTotal: string;
  first: string;
  last: string;
  useShortLabel?: boolean;
}) {
  return (
    <>
      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>{title ?? 'ရောင်း / ဝယ်'}</div>
              <div style={{ fontSize: 14, color: colors.muted2 }}>{unit}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: colors.muted }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: colors.gold }} />
                ရောင်း (အပေါ်)
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: colors.muted }}>
                <span style={{ width: 12, height: 12, borderRadius: 2, background: colors.buyBar }} />
                ဝယ် (အောက်)
              </span>
              <MetricToggle />
            </div>
          </div>
          <DivergingBars cols={cols} useShortLabel={useShortLabel} />
        </div>
      </Card>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
        <Card padding="28px">
          <StockLine
            line={stock.line}
            area={stock.area}
            start={stock.start}
            end={stock.end}
            chg={stock.chg}
            chgPositive={stock.chgPositive}
            first={first}
            last={last}
          />
        </Card>
        <Card padding="28px">
          <ProfitBars cols={cols} profitTotal={profitTotal} useShortLabel={useShortLabel} />
        </Card>
      </div>
    </>
  );
}

function MetricToggle() {
  const repMetric = useStore((s) => s.repMetric);
  const setRepMetric = useStore((s) => s.setRepMetric);
  return (
    <Segmented
      options={[
        { value: 'w', label: 'အလေးချိန်' },
        { value: 'm', label: 'ငွေ' },
      ]}
      value={repMetric}
      onChange={setRepMetric}
    />
  );
}

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
          }}
        >
          ပရင့်ထုတ်မည်
        </button>
      )}
    </div>
  );
}

const radiiBtn = 6;

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
  const repMetric = useStore((s) => s.repMetric);
  const digits = settings.digits;
  const today = isoDate();

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const buyByDate = useMemo(
    () => Object.fromEntries(prices.map((p) => [p.date, p.buy])),
    [prices],
  );
  const txnsAsc = useMemo(
    () =>
      [...txns].sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        if (a.time !== b.time) return a.time < b.time ? -1 : 1;
        return a.voucher_no - b.voucher_no;
      }),
    [txns],
  );
  const sortedPrices = [...prices].sort((a, b) => (a.date < b.date ? -1 : 1));
  const firstPrice = sortedPrices[0]?.buy ?? 0;

  const avgCostAll = useMemo(() => {
    const buys = txns.filter((t) => t.type === 'buy');
    const buyY = buys.reduce((a, t) => a + t.yway, 0);
    const num =
      settings.opening_stock_yway * firstPrice +
      buys.reduce((a, t) => a + t.yway * t.price, 0);
    return num / Math.max(1, settings.opening_stock_yway + buyY);
  }, [txns, settings.opening_stock_yway, firstPrice]);

  const unit = repMetric === 'w' ? 'ကျပ်သား' : 'သိန်း';

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
    const buckets = bucketDates(rds);
    const chart = makeChartData(
      buckets,
      rt,
      buyByDate,
      settings.opening_stock_yway,
      txnsAsc,
      repMetric,
      digits,
    );
    const rDates = [...new Set(rt.map((t) => t.date))].sort().reverse();
    const byC: Record<string, { name: string; count: number; amt: number }> = {};
    rt.forEach((t) => {
      const k = String(t.customer_id ?? '_');
      if (!byC[k]) byC[k] = { name: customerName(t.customer_id, custMap), count: 0, amt: 0 };
      byC[k].count++;
      byC[k].amt += t.amount;
    });
    return {
      rangeLabel: rn ? `${D(rFrom, digits)} မှ ${D(today, digits)} ထိ` : 'မှတ်တမ်းအားလုံး',
      sellW: W(sum(rS, (t) => t.yway), digits),
      sellAmt: money(sum(rS, (t) => t.amount), digits),
      sellCount: D(rS.length, digits),
      buyW: W(sum(rB, (t) => t.yway), digits),
      buyAmt: money(sum(rB, (t) => t.amount), digits),
      buyCount: D(rB.length, digits),
      margin: money(marginOf(rS, buyByDate), digits),
      avgCost: money(avgCostAll, digits),
      chart,
      first: buckets[0]?.title ?? '',
      last: buckets[buckets.length - 1]?.title ?? '',
      days: rDates.map((d) => {
        const a = rt.filter((t) => t.date === d);
        const sa = a.filter((t) => t.type === 'sell');
        const ba = a.filter((t) => t.type === 'buy');
        return {
          date: D(d, digits),
          sellW: sa.length ? W(sum(sa, (t) => t.yway), digits) : '—',
          sellAmt: sa.length ? money(sum(sa, (t) => t.amount), digits) : '—',
          buyW: ba.length ? W(sum(ba, (t) => t.yway), digits) : '—',
          buyAmt: ba.length ? money(sum(ba, (t) => t.amount), digits) : '—',
        };
      }),
      top: Object.values(byC)
        .sort((a, b) => b.amt - a.amt)
        .slice(0, 5)
        .map((x) => ({
          name: x.name,
          count: D(x.count, digits),
          amount: money(x.amt, digits),
        })),
    };
  }, [
    range,
    txns,
    buyByDate,
    settings.opening_stock_yway,
    txnsAsc,
    repMetric,
    digits,
    today,
    custMap,
    avgCostAll,
  ]);

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
    const buckets = monthDayBuckets(ym);
    const chart = makeChartData(
      buckets,
      mt,
      buyByDate,
      settings.opening_stock_yway,
      txnsAsc,
      repMetric,
      digits,
    );
    const lr = (t: (typeof mt)[0]) => ({
      no: voucherNo(t.voucher_no, digits),
      date: D(t.date, digits),
      cust: customerName(t.customer_id, custMap),
      pure: W(t.yway, digits),
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
      chart,
      first: D(buckets[0]?.from ?? '', digits),
      last: D(buckets[buckets.length - 1]?.from ?? '', digits),
      sells: ms.map(lr),
      buys: mb.map(lr),
      sellTot: { count: D(ms.length, digits), pure: W(sp, digits), amt: money(sa, digits) },
      buyTot: {
        count: D(mb.length, digits),
        pure: W(bp, digits),
        amt: money(sum(mb, (t) => t.amount), digits),
      },
    };
  }, [
    repMonth,
    txns,
    buyByDate,
    settings.opening_stock_yway,
    txnsAsc,
    repMetric,
    digits,
    custMap,
    setRepMonth,
  ]);

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
    const buckets = yearMonthBuckets(Y, digits);
    const chart = makeChartData(
      buckets,
      yt,
      buyByDate,
      settings.opening_stock_yway,
      txnsAsc,
      repMetric,
      digits,
    );
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
      chart,
      first: MONTHS_MY[0]!,
      last: MONTHS_MY[11]!,
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
  }, [
    repYear,
    txns,
    buyByDate,
    settings.opening_stock_yway,
    txnsAsc,
    repMetric,
    digits,
    setRepYear,
    setRepMode,
    setRepMonth,
  ]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1360 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 16, color: colors.muted }}>{dayData.rangeLabel}</div>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 20 }}>
            <Card navy padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.mutedOnNavy }}>ရောင်းရွှေ</div>
              <div
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 26,
                  fontWeight: 700,
                  lineHeight: 1.45,
                  color: colors.goldOnNavy,
                }}
              >
                {dayData.sellW}
              </div>
              <div style={{ fontSize: 14, color: colors.mutedOnNavy }}>
                {dayData.sellAmt} ကျပ် · {dayData.sellCount} စောင်
              </div>
            </Card>
            <Card padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.muted }}>ဝယ်ရွှေ</div>
              <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1.45 }}>
                {dayData.buyW}
              </div>
              <div style={{ fontSize: 14, color: colors.muted }}>
                {dayData.buyAmt} ကျပ် · {dayData.buyCount} စောင်
              </div>
            </Card>
            <Card padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.muted }}>ခန့်မှန်းအမြတ်</div>
              <div
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 28,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: colors.sell,
                }}
              >
                {dayData.margin}
              </div>
              <div style={{ fontSize: 14, color: colors.muted }}>ပျမ်းမျှဝယ်ဈေး {dayData.avgCost}</div>
            </Card>
          </div>
          <ChartSection
            unit={unit}
            cols={dayData.chart.cols}
            stock={dayData.chart.stock}
            profitTotal={dayData.chart.profitTotal}
            first={dayData.first}
            last={dayData.last}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
            <Card padding={0} style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
                <thead>
                  <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 15 }}>
                    <th style={{ padding: '16px 20px', fontWeight: 600 }}>ရက်စွဲ</th>
                    <th style={{ padding: '16px 12px', fontWeight: 600 }}>ရောင်း</th>
                    <th style={{ padding: '16px 12px', fontWeight: 600, textAlign: 'right' }}>ရောင်းငွေ</th>
                    <th style={{ padding: '16px 12px', fontWeight: 600 }}>ဝယ်</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>ဝယ်ငွေ</th>
                  </tr>
                </thead>
                <tbody>
                  {dayData.days.map((d) => (
                    <tr key={d.date}>
                      <td style={{ padding: '14px 20px', borderTop: `1px solid ${colors.rowDivider}`, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {d.date}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: `1px solid ${colors.rowDivider}`, fontWeight: 700 }}>
                        {d.sellW}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: `1px solid ${colors.rowDivider}`, textAlign: 'right' }}>
                        {d.sellAmt}
                      </td>
                      <td style={{ padding: '14px 12px', borderTop: `1px solid ${colors.rowDivider}`, fontWeight: 700 }}>
                        {d.buyW}
                      </td>
                      <td style={{ padding: '14px 20px', borderTop: `1px solid ${colors.rowDivider}`, textAlign: 'right' }}>
                        {d.buyAmt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card padding="26px">
              <div
                style={{
                  fontFamily: "'Noto Sans Myanmar', sans-serif",
                  fontSize: 19,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                ဖောက်သည် ထိပ်ဆုံး ၅ ဦး
              </div>
              {dayData.top.map((c) => (
                <div
                  key={c.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 10,
                    padding: '12px 0',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    fontSize: 16,
                  }}
                >
                  <span>
                    <span style={{ fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: colors.muted2, fontSize: 14 }}> · {c.count} စောင်</span>
                  </span>
                  <span style={{ fontWeight: 600 }}>{c.amount}</span>
                </div>
              ))}
            </Card>
          </div>
        </div>
      )}

      {repMode === 'month' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <MonthNav
            label={monthData.label}
            onPrev={() => monthData.shift(-1)}
            onNext={() => monthData.shift(1)}
            showPrint
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
            <Card navy padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.mutedOnNavy }}>ရောင်းရွှေ</div>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.4, color: colors.goldOnNavy }}>
                {monthData.sellPure}
              </div>
              <div style={{ fontSize: 14, color: colors.mutedOnNavy }}>
                {monthData.sellAmt} ကျပ် · {monthData.sellCount} စောင်
              </div>
            </Card>
            <Card padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.muted }}>ဝယ်ရွှေ</div>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.4 }}>{monthData.buyPure}</div>
              <div style={{ fontSize: 14, color: colors.muted }}>
                {monthData.buyAmt} ကျပ် · {monthData.buyCount} စောင်
              </div>
            </Card>
            <Card padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.muted }}>ရွှေ အသားတင် (ဝယ် − ရောင်း)</div>
              <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.3 }}>{monthData.net}</div>
            </Card>
            <Card padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.muted }}>ခန့်မှန်းအမြတ်</div>
              <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.3 }}>{monthData.margin}</div>
              <div style={{ fontSize: 14, color: colors.muted }}>ပျမ်းမျှဝယ်ဈေး {monthData.avgCost}</div>
            </Card>
          </div>
          <ChartSection
            unit={unit}
            cols={monthData.chart.cols}
            stock={monthData.chart.stock}
            profitTotal={monthData.chart.profitTotal}
            first={monthData.first}
            last={monthData.last}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24, alignItems: 'start' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <MonthNav label={yearData.label} onPrev={yearData.prev} onNext={yearData.next} showPrint />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 20 }}>
            <Card navy padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.mutedOnNavy }}>နှစ်ချုပ် ရောင်းရွှေ</div>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.4, color: colors.goldOnNavy }}>
                {yearData.sellPure}
              </div>
              <div style={{ fontSize: 14, color: colors.mutedOnNavy }}>
                {yearData.sellAmt} ကျပ် · {yearData.sellCount} စောင်
              </div>
            </Card>
            <Card padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.muted }}>နှစ်ချုပ် ဝယ်ရွှေ</div>
              <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.4 }}>{yearData.buyPure}</div>
              <div style={{ fontSize: 14, color: colors.muted }}>
                {yearData.buyAmt} ကျပ် · {yearData.buyCount} စောင်
              </div>
            </Card>
            <Card padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.muted }}>ရွှေ အသားတင် (ဝယ် − ရောင်း)</div>
              <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.3 }}>{yearData.net}</div>
            </Card>
            <Card padding="24px 26px">
              <div style={{ fontSize: 15, color: colors.muted }}>ခန့်မှန်းအမြတ်</div>
              <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.3 }}>{yearData.margin}</div>
              <div style={{ fontSize: 14, color: colors.muted }}>ပျမ်းမျှဝယ်ဈေး {yearData.avgCost}</div>
            </Card>
          </div>
          <ChartSection
            unit={unit}
            cols={yearData.chart.cols}
            stock={yearData.chart.stock}
            profitTotal={yearData.chart.profitTotal}
            first={yearData.first}
            last={yearData.last}
            useShortLabel
          />
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
              <thead>
                <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 15 }}>
                  <th style={{ padding: '14px 20px', fontWeight: 600 }}>လ</th>
                  <th style={{ padding: '14px 10px', fontWeight: 600 }}>ရောင်း (အခေါက်)</th>
                  <th style={{ padding: '14px 10px', fontWeight: 600, textAlign: 'right' }}>ရောင်းငွေ</th>
                  <th style={{ padding: '14px 10px', fontWeight: 600 }}>ဝယ် (အခေါက်)</th>
                  <th style={{ padding: '14px 10px', fontWeight: 600, textAlign: 'right' }}>ဝယ်ငွေ</th>
                  <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>အမြတ်</th>
                </tr>
              </thead>
              <tbody>
                {yearData.rows.map((m) => (
                  <tr
                    key={m.name}
                    onClick={m.onOpen}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ padding: '13px 20px', borderTop: `1px solid ${colors.rowDivider}`, fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {m.name}
                      <div style={{ fontSize: 14, color: colors.muted2, fontWeight: 400 }}>{m.count} စောင်</div>
                    </td>
                    <td style={{ padding: '13px 10px', borderTop: `1px solid ${colors.rowDivider}`, whiteSpace: 'nowrap', fontWeight: 700 }}>
                      {m.sellPure}
                    </td>
                    <td style={{ padding: '13px 10px', borderTop: `1px solid ${colors.rowDivider}`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {m.sellAmt}
                    </td>
                    <td style={{ padding: '13px 10px', borderTop: `1px solid ${colors.rowDivider}`, whiteSpace: 'nowrap', fontWeight: 700 }}>
                      {m.buyPure}
                    </td>
                    <td style={{ padding: '13px 10px', borderTop: `1px solid ${colors.rowDivider}`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {m.buyAmt}
                    </td>
                    <td
                      style={{
                        padding: '13px 20px',
                        borderTop: `1px solid ${colors.rowDivider}`,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        color: colors.sell,
                        fontWeight: 600,
                      }}
                    >
                      {m.margin}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: colors.goldLight, fontWeight: 700 }}>
                  <td style={{ padding: '14px 20px' }}>စုစုပေါင်း</td>
                  <td style={{ padding: '14px 10px', whiteSpace: 'nowrap' }}>{yearData.sellPure}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right' }}>{yearData.sellAmt}</td>
                  <td style={{ padding: '14px 10px', whiteSpace: 'nowrap' }}>{yearData.buyPure}</td>
                  <td style={{ padding: '14px 10px', textAlign: 'right' }}>{yearData.buyAmt}</td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>{yearData.margin}</td>
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
  rows: { no: string; date: string; cust: string; pure: string; amount: string }[];
  tot: { count: string; pure: string; amt: string };
}) {
  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      <div
        style={{
          padding: '18px 20px 6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div style={{ fontSize: 19, fontWeight: 700, color: titleColor }}>{title}</div>
        <div style={{ fontSize: 15, color: colors.muted }}>{count} စောင်</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
        <thead>
          <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 15 }}>
            <th style={{ padding: '12px 20px', fontWeight: 600 }}>ဘောင်ချာ</th>
            <th style={{ padding: '12px 10px', fontWeight: 600 }}>ဖောက်သည်</th>
            <th style={{ padding: '12px 10px', fontWeight: 600 }}>အလေးချိန်</th>
            <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>ငွေ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.no + r.date}>
              <td style={{ padding: '12px 20px', borderTop: `1px solid ${colors.rowDivider}`, whiteSpace: 'nowrap' }}>
                <div style={{ fontWeight: 600 }}>{r.no}</div>
                <div style={{ fontSize: 14, color: colors.muted2 }}>{r.date}</div>
              </td>
              <td style={{ padding: '12px 10px', borderTop: `1px solid ${colors.rowDivider}` }}>{r.cust}</td>
              <td
                style={{
                  padding: '12px 10px',
                  borderTop: `1px solid ${colors.rowDivider}`,
                  whiteSpace: 'nowrap',
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                {r.pure}
              </td>
              <td
                style={{
                  padding: '12px 20px',
                  borderTop: `1px solid ${colors.rowDivider}`,
                  textAlign: 'right',
                  color: colors.muted,
                  whiteSpace: 'nowrap',
                }}
              >
                {r.amount}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: colors.goldLight, fontWeight: 700 }}>
            <td colSpan={2} style={{ padding: '14px 20px' }}>
              စုစုပေါင်း
            </td>
            <td style={{ padding: '14px 10px', whiteSpace: 'nowrap' }}>{tot.pure}</td>
            <td style={{ padding: '14px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>{tot.amt}</td>
          </tr>
        </tfoot>
      </table>
    </Card>
  );
}
