import { useMemo, useState, type CSSProperties } from 'react';
import { Card } from '../components/Card';
import { IconMinus, IconPlus } from '../components/Icons';
import { PaginationBar, usePagination } from '../components/Pagination';
import { Pill } from '../components/Pill';
import {
  FilterField,
  FilterPanel,
  FilterSelect,
  filterInputStyle,
} from '../components/TableFilters';
import { customerName } from '../lib/format';
import { deleteStockAdjustment } from '../db/queries';
import {
  D,
  W,
  YWAY_PER_KYAT,
  money,
  stock as stockCalc,
  voucherNo,
} from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

type MoveFilter = 'all' | 'buy' | 'sell' | 'adj-in' | 'adj-out';

type MoveRow = {
  key: string;
  sort: string;
  id: number;
  kind: 'buy' | 'sell' | 'adj-in' | 'adj-out';
  label: string;
  date: string;
  time: string;
  detail: string;
  price?: number;
  inY: number;
  outY: number;
  bal: number;
  deletable?: boolean;
};

export function Stock() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const prices = useStore((s) => s.prices);
  const adjustments = useStore((s) => s.stockAdjustments);
  const settings = useStore((s) => s.settings);
  const openStockAdjustDialog = useStore((s) => s.openStockAdjustDialog);
  const setScreen = useStore((s) => s.setScreen);
  const setVoucherId = useStore((s) => s.setVoucherId);
  const refresh = useStore((s) => s.refresh);
  const digits = settings.digits;

  const [filter, setFilter] = useState<MoveFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const sortedPrices = [...prices].sort((a, b) => {
    const ka = `${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}`;
    const kb = `${b.date}T${b.time.length === 5 ? b.time + ':00' : b.time}`;
    return ka < kb ? -1 : 1;
  });
  const cur = sortedPrices[sortedPrices.length - 1];
  const curBuy = cur?.buy ?? 0;
  const curSell = cur?.sell ?? 0;

  const buyY = txns.filter((t) => t.type === 'buy').reduce((a, t) => a + t.yway, 0);
  const sellY = txns.filter((t) => t.type === 'sell').reduce((a, t) => a + t.yway, 0);
  const adjInY = adjustments.filter((a) => a.kind === 'in').reduce((a, x) => a + x.yway, 0);
  const adjOutY = adjustments.filter((a) => a.kind === 'out').reduce((a, x) => a + x.yway, 0);
  const opening = settings.opening_stock_yway;
  const stockY = stockCalc(opening, buyY, sellY, adjInY, adjOutY);
  const valueBuy = (stockY / YWAY_PER_KYAT) * curBuy;
  const valueSell = (stockY / YWAY_PER_KYAT) * curSell;
  const negative = stockY < 0;

  const moves = useMemo(() => {
    type Ev =
      | { sort: string; type: 'txn'; t: (typeof txns)[0] }
      | { sort: string; type: 'adj'; a: (typeof adjustments)[0] };

    const events: Ev[] = [
      ...txns.map((t) => ({
        sort: `${t.date}T${t.time.length === 5 ? t.time + ':00' : t.time}-${String(t.id).padStart(8, '0')}`,
        type: 'txn' as const,
        t,
      })),
      ...adjustments.map((a) => ({
        sort: `${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}-a${String(a.id).padStart(8, '0')}`,
        type: 'adj' as const,
        a,
      })),
    ].sort((x, y) => (x.sort < y.sort ? -1 : 1));

    let bal = opening;
    const rows: MoveRow[] = [];
    for (const ev of events) {
      if (ev.type === 'txn') {
        const t = ev.t;
        bal += t.type === 'buy' ? t.yway : -t.yway;
        rows.push({
          key: `t-${t.id}`,
          sort: ev.sort,
          id: t.id,
          kind: t.type,
          label: voucherNo(t.voucher_no, digits),
          date: t.date,
          time: t.time.slice(0, 5),
          detail: customerName(t.customer_id, custMap),
          price: t.price,
          inY: t.type === 'buy' ? t.yway : 0,
          outY: t.type === 'sell' ? t.yway : 0,
          bal,
        });
      } else {
        const a = ev.a;
        bal += a.kind === 'in' ? a.yway : -a.yway;
        rows.push({
          key: `a-${a.id}`,
          sort: ev.sort,
          id: a.id,
          kind: a.kind === 'in' ? 'adj-in' : 'adj-out',
          label: a.kind === 'in' ? 'ပေါင်းထည့်' : 'လျှော့',
          date: a.date,
          time: a.time.slice(0, 5),
          detail: a.note || 'လက်ကျန် ညှိနှိုင်း',
          inY: a.kind === 'in' ? a.yway : 0,
          outY: a.kind === 'out' ? a.yway : 0,
          bal,
          deletable: true,
        });
      }
    }
    return rows.reverse();
  }, [txns, adjustments, opening, digits, custMap]);

  const filterActive = filter !== 'all' || !!from || !!to;

  const filtered = moves.filter((m) => {
    if (filter === 'buy' && m.kind !== 'buy') return false;
    if (filter === 'sell' && m.kind !== 'sell') return false;
    if (filter === 'adj-in' && m.kind !== 'adj-in') return false;
    if (filter === 'adj-out' && m.kind !== 'adj-out') return false;
    if (from && m.date < from) return false;
    if (to && m.date > to) return false;
    return true;
  });

  const page = usePagination(filtered, {
    resetKey: `${filter}|${from}|${to}`,
  });

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setFilter('all');
  };

  const typeOptions = [
    { value: 'all', label: 'အားလုံး' },
    { value: 'buy', label: 'အဝယ်' },
    { value: 'sell', label: 'အရောင်း' },
    { value: 'adj-in', label: 'ပေါင်းထည့်' },
    { value: 'adj-out', label: 'လျှော့' },
  ];

  const openRow = (m: MoveRow) => {
    if (m.kind === 'buy' || m.kind === 'sell') {
      setVoucherId(m.id);
      setScreen('voucher');
    }
  };

  const removeAdj = async (id: number) => {
    if (!window.confirm('ဒီလက်ကျန် ညှိနှိုင်းမှုကို ဖျက်မှာ သေချာပါသလား?')) return;
    try {
      await deleteStockAdjustment(id);
      await refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1280 }}>
      {/* Actions */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
        }}
      >
        <button
          type="button"
          onClick={() => openStockAdjustDialog('in')}
          style={btnPrimary}
        >
          <IconPlus size={16} />
          လက်ကျန် ထည့်မည်
        </button>
        <button
          type="button"
          onClick={() => openStockAdjustDialog('out')}
          style={btnOutline}
        >
          <IconMinus size={16} />
          လက်ကျန် လျှော့မည်
        </button>
      </div>

      {/* Current + formula */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 18 }}>
        <Card padding="28px 30px">
          <div style={{ fontSize: 15, color: colors.muted, fontWeight: 600 }}>လက်ရှိလက်ကျန်</div>
          <div
            className="num"
            style={{
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.25,
              marginTop: 8,
              color: negative ? colors.buy : colors.ink,
            }}
          >
            {W(stockY, digits)}
          </div>
          {negative && (
            <div style={{ marginTop: 8, fontSize: 14, color: colors.buy, fontWeight: 600 }}>
              လက်ကျန် အနှုတ်ဖြစ်နေသည် — စစ်ဆေး / ညှိနှိုင်းပါ
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginTop: 20,
              paddingTop: 16,
              borderTop: `1px solid ${colors.cardBorder}`,
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: colors.muted }}>တန်ဖိုး (အဝယ်စျေး)</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                {money(valueBuy, digits)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: colors.muted }}>တန်ဖိုး (အရောင်းစျေး)</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                {money(valueSell, digits)}
              </div>
            </div>
          </div>
        </Card>

        <Card padding="24px 26px">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>စာရင်းချုပ်</div>
          <FormulaRow label="အစလက်ကျန်" value={W(opening, digits)} />
          <FormulaRow label="+ အဝယ် (စာရင်း)" value={W(buyY, digits)} tone="in" />
          <FormulaRow label="+ ပေါင်းထည့် (ညှိ)" value={W(adjInY, digits)} tone="in" />
          <FormulaRow label="− အရောင်း (စာရင်း)" value={W(sellY, digits)} tone="out" />
          <FormulaRow label="− လျှော့ (ညှိ)" value={W(adjOutY, digits)} tone="out" />
          <div style={{ height: 1, background: colors.cardBorder, margin: '10px 0' }} />
          <FormulaRow label="= လက်ရှိလက်ကျန်" value={W(stockY, digits)} strong />
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14 }}>
        <Metric title="အစလက်ကျန်" value={W(opening, digits)} />
        <Metric title="အဝင် စု" value={`+ ${W(buyY + adjInY, digits)}`} color={colors.sell} hint="အဝယ် + ပေါင်းထည့်" />
        <Metric title="အထွက် စု" value={`− ${W(sellY + adjOutY, digits)}`} color={colors.buy} hint="အရောင်း + လျှော့" />
        <Metric title="ညှိနှိုင်း" value={W(adjInY - adjOutY, digits)} hint={`ထည့် ${W(adjInY, digits)} / လျှော့ ${W(adjOutY, digits)}`} />
      </div>

      {/* Movement */}
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px 4px' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>အဝင်အထွက် မှတ်တမ်း</div>
          <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            အရောင်းအဝယ် + လက်ကျန် ညှိနှိုင်း
          </div>
        </div>

        <FilterPanel
          title="စစ်ထုတ်ရန်"
          countLabel={`${D(filtered.length, digits)} / ${D(moves.length, digits)} စောင်`}
          active={filterActive}
          onClear={clearFilters}
        >
          <FilterField label="အမျိုးအစား" minWidth={160}>
            <FilterSelect
              value={filter}
              onChange={(v) => setFilter(v as MoveFilter)}
              options={typeOptions}
            />
          </FilterField>
          <FilterField label="စတင်ရက်" minWidth={150}>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={filterInputStyle}
            />
          </FilterField>
          <div
            style={{
              alignSelf: 'flex-end',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              color: colors.muted2,
              fontSize: 14,
            }}
          >
            →
          </div>
          <FilterField label="ပြီးဆုံးရက်" minWidth={150}>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={filterInputStyle}
            />
          </FilterField>
        </FilterPanel>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
          <thead>
            <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 14, background: '#F7F8FA' }}>
              <th style={{ padding: '12px 22px', fontWeight: 600 }}>အမျိုး / ရက်စွဲ</th>
              <th style={{ padding: '12px 10px', fontWeight: 600 }}>အသေးစိတ်</th>
              <th style={{ padding: '12px 10px', fontWeight: 600, textAlign: 'right' }}>အဝင်</th>
              <th style={{ padding: '12px 10px', fontWeight: 600, textAlign: 'right' }}>အထွက်</th>
              <th style={{ padding: '12px 10px', fontWeight: 600, textAlign: 'right' }}>လက်ကျန်</th>
              <th style={{ padding: '12px 22px' }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '40px 22px', textAlign: 'center', color: colors.muted2 }}>
                  {filterActive ? 'စစ်ထုတ်မှုနှင့် ကိုက်ညီသော မှတ်တမ်း မရှိပါ' : 'မှတ်တမ်း မရှိသေးပါ'}
                </td>
              </tr>
            )}
            {page.slice.map((m) => {
              const isAdj = m.kind === 'adj-in' || m.kind === 'adj-out';
              return (
                <tr
                  key={m.key}
                  role={isAdj ? undefined : 'button'}
                  tabIndex={isAdj ? undefined : 0}
                  onClick={() => openRow(m)}
                  onKeyDown={(e) => {
                    if (!isAdj && e.key === 'Enter') openRow(m);
                  }}
                  style={{ cursor: isAdj ? 'default' : 'pointer' }}
                >
                  <td style={{ padding: '13px 22px', borderTop: `1px solid ${colors.rowDivider}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {m.kind === 'buy' || m.kind === 'sell' ? (
                        <Pill type={m.kind} />
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            border: `1.5px solid ${colors.ink}`,
                            color: colors.ink,
                            background: colors.white,
                          }}
                        >
                          {m.label}
                        </span>
                      )}
                      {(m.kind === 'buy' || m.kind === 'sell') && (
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{m.label}</span>
                      )}
                    </div>
                    <div className="num" style={{ fontSize: 13, color: colors.muted2 }}>
                      {D(m.date, digits)} · {D(m.time, digits)}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '13px 10px',
                      borderTop: `1px solid ${colors.rowDivider}`,
                      maxWidth: 260,
                    }}
                  >
                    <div
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {m.detail}
                    </div>
                    {m.price != null && m.price > 0 && (
                      <div className="num" style={{ fontSize: 13, color: colors.muted2, marginTop: 2 }}>
                        စျေး · {money(m.price, digits)} / ကျပ်သား
                      </div>
                    )}
                  </td>
                  <td
                    className="num"
                    style={{
                      padding: '13px 10px',
                      borderTop: `1px solid ${colors.rowDivider}`,
                      textAlign: 'right',
                      color: colors.sell,
                      fontWeight: m.inY ? 600 : 400,
                    }}
                  >
                    {m.inY ? W(m.inY, digits) : '—'}
                  </td>
                  <td
                    className="num"
                    style={{
                      padding: '13px 10px',
                      borderTop: `1px solid ${colors.rowDivider}`,
                      textAlign: 'right',
                      color: colors.buy,
                      fontWeight: m.outY ? 600 : 400,
                    }}
                  >
                    {m.outY ? W(m.outY, digits) : '—'}
                  </td>
                  <td
                    className="num"
                    style={{
                      padding: '13px 10px',
                      borderTop: `1px solid ${colors.rowDivider}`,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: m.bal < 0 ? colors.buy : colors.ink,
                    }}
                  >
                    {W(m.bal, digits)}
                  </td>
                  <td
                    style={{
                      padding: '13px 22px',
                      borderTop: `1px solid ${colors.rowDivider}`,
                      textAlign: 'right',
                    }}
                  >
                    {m.deletable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void removeAdj(m.id);
                        }}
                        style={{
                          height: 32,
                          padding: '0 12px',
                          border: `1.5px solid ${colors.inputBorder}`,
                          borderRadius: 6,
                          background: colors.white,
                          color: colors.buy,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        ဖျက်
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

const btnPrimary: CSSProperties = {
  height: 42,
  padding: '0 16px',
  border: 'none',
  borderRadius: 8,
  background: colors.ink,
  color: colors.white,
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const btnOutline: CSSProperties = {
  height: 42,
  padding: '0 16px',
  border: `1.5px solid ${colors.ink}`,
  borderRadius: 8,
  background: colors.white,
  color: colors.ink,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

function FormulaRow({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: 'in' | 'out';
  strong?: boolean;
}) {
  const color = tone === 'in' ? colors.sell : tone === 'out' ? colors.buy : colors.ink;
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
        padding: '5px 0',
        fontSize: strong ? 16 : 14,
        fontWeight: strong ? 700 : 400,
      }}
    >
      <span style={{ color: strong ? colors.ink : colors.muted }}>{label}</span>
      <span className="num" style={{ color, fontWeight: strong ? 700 : 600 }}>
        {value}
      </span>
    </div>
  );
}

function Metric({
  title,
  value,
  color,
  hint,
}: {
  title: string;
  value: string;
  color?: string;
  hint?: string;
}) {
  return (
    <Card padding="18px 20px">
      <div style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>{title}</div>
      {hint && (
        <div style={{ fontSize: 12, color: colors.muted2, marginTop: 2, lineHeight: 1.4 }}>{hint}</div>
      )}
      <div
        className="num"
        style={{ fontSize: 20, fontWeight: 700, marginTop: 10, color: color ?? colors.ink }}
      >
        {value}
      </div>
    </Card>
  );
}
