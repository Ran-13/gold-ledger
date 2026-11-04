
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Card } from '../components/Card';
import { Dialog, dialogBtnGhost, dialogBtnPrimary } from '../components/Dialog';
import {
  CellMeta,
  CellTone,
  MiniFact,
  StatStrip,
  tableTd,
  tableTh,
  ty,
} from '../components/ClearUI';

import { DateChip } from '../components/DateChip';
import { IconMinus, IconPlus, IconTrash } from '../components/Icons';
import { PaginationBar, usePagination } from '../components/Pagination';
import {
  FilterField,
  FilterPanel,
  FilterSelect,
} from '../components/TableFilters';
import { deleteCardAdjustment, deleteStockAdjustment } from '../db/queries';
import {
  CARD_DENOMS,
  cardLabel,
  cardStockTotalYway,
  cardYway,
  computeCardStock,
  isCardDenom,
} from '../lib/cards';
import {
  D,
  W,
  formatDateTime,
  isoDate,
  stock as stockCalc,
} from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

type MoveFilter = 'all' | 'card-in' | 'card-out' | 'adj-in' | 'adj-out';

type MoveRow = {
  key: string;
  sort: string;
  id: number;
  kind: 'adj-in' | 'adj-out' | 'card-in' | 'card-out';
  label: string;
  date: string;
  time: string;
  detail: string;
  inY: number;
  outY: number;
  bal: number;
  deletable?: boolean;
  deleteKind?: 'loose' | 'card';
};

export function Stock() {
  const txns = useStore((s) => s.txns);
  const adjustments = useStore((s) => s.stockAdjustments);
  const cardOpenings = useStore((s) => s.cardOpenings);
  const cardAdjustments = useStore((s) => s.cardAdjustments);
  const txnCards = useStore((s) => s.txnCards);
  const settings = useStore((s) => s.settings);
  const openStockAdjustDialog = useStore((s) => s.openStockAdjustDialog);
  const openCardAdjustDialog = useStore((s) => s.openCardAdjustDialog);
  const refresh = useStore((s) => s.refresh);
  const digits = settings.digits;

  const [filter, setFilter] = useState<MoveFilter>('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pendingDelete, setPendingDelete] = useState<MoveRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const today = isoDate();

  const pickFrom = (d: string) => {
    setFrom(d);
    setTo((prev) => (!prev || d > prev ? d : prev));
  };

  const pickTo = (d: string) => {
    setTo(d);
    setFrom((prev) => (!prev || d < prev ? d : prev));
  };

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

  const cardWeight = cardStockTotalYway(cardStock);
  const cardCount = CARD_DENOMS.reduce((a, d) => a + (cardStock[d.id] || 0), 0);

  const looseTxns = useMemo(() => txns.filter((t) => t.channel !== 'card'), [txns]);
  const buyY = looseTxns.filter((t) => t.type === 'buy').reduce((a, t) => a + t.yway, 0);
  const sellY = looseTxns.filter((t) => t.type === 'sell').reduce((a, t) => a + t.yway, 0);
  const adjInY = adjustments.filter((a) => a.kind === 'in').reduce((a, x) => a + x.yway, 0);
  const adjOutY = adjustments.filter((a) => a.kind === 'out').reduce((a, x) => a + x.yway, 0);
  const opening = settings.opening_stock_yway;
  const looseY = stockCalc(opening, buyY, sellY, adjInY, adjOutY);
  const totalY = cardWeight + looseY;
  const negative = totalY < 0;

  const moves = useMemo(() => {
    type Ev =
      | { sort: string; type: 'txn'; t: (typeof txns)[0] }
      | { sort: string; type: 'adj'; a: (typeof adjustments)[0] }
      | { sort: string; type: 'cardAdj'; a: (typeof cardAdjustments)[0] };

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
      ...cardAdjustments.map((a) => ({
        sort: `${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}-c${String(a.id).padStart(8, '0')}`,
        type: 'cardAdj' as const,
        a,
      })),
    ].sort((x, y) => (x.sort < y.sort ? -1 : 1));

    let bal = opening;
    bal += CARD_DENOMS.reduce((a, d) => {
      const o = cardOpenings.find((x) => x.denom === d.id)?.qty ?? 0;
      return a + o * d.yway;
    }, 0);

    const rows: MoveRow[] = [];
    for (const ev of events) {
      if (ev.type === 'txn') {
        bal += ev.t.type === 'buy' ? ev.t.yway : -ev.t.yway;
      } else if (ev.type === 'adj') {
        const a = ev.a;
        bal += a.kind === 'in' ? a.yway : -a.yway;
        rows.push({
          key: `a-${a.id}`,
          sort: ev.sort,
          id: a.id,
          kind: a.kind === 'in' ? 'adj-in' : 'adj-out',
          label: a.kind === 'in' ? 'မီးလင်းဖြတ်စ ထည့်' : 'မီးလင်းဖြတ်စ လျှော့',
          date: a.date,
          time: a.time.slice(0, 5),
          detail: a.note || 'မီးလင်းဖြတ်စ လက်ကျန် ညှိ',
          inY: a.kind === 'in' ? a.yway : 0,
          outY: a.kind === 'out' ? a.yway : 0,
          bal,
          deletable: true,
          deleteKind: 'loose',
        });
      } else {
        const a = ev.a;
        const yw = isCardDenom(a.denom) ? cardYway(a.denom) * a.qty : 0;
        bal += a.kind === 'in' ? yw : -yw;
        rows.push({
          key: `c-${a.id}`,
          sort: ev.sort,
          id: a.id,
          kind: a.kind === 'in' ? 'card-in' : 'card-out',
          label: a.kind === 'in' ? 'အကယ်ဒမီအခေါက်ရွှေ ထည့်' : 'အကယ်ဒမီအခေါက်ရွှေ လျှော့',
          date: a.date,
          time: a.time.slice(0, 5),
          detail: `${isCardDenom(a.denom) ? cardLabel(a.denom) : a.denom} × ${D(a.qty, digits)} ကဒ်${
            a.note ? ` · ${a.note}` : ''
          }`,
          inY: a.kind === 'in' ? yw : 0,
          outY: a.kind === 'out' ? yw : 0,
          bal,
          deletable: true,
          deleteKind: 'card',
        });
      }
    }
    return rows.reverse();
  }, [txns, adjustments, cardAdjustments, cardOpenings, opening, digits]);

  const filterActive = filter !== 'all' || !!from || !!to;

  const filtered = moves.filter((m) => {
    if (filter !== 'all' && m.kind !== filter) return false;
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
    { value: 'card-in', label: 'အကယ်ဒမီအခေါက်ရွှေ ထည့်' },
    { value: 'card-out', label: 'အကယ်ဒမီအခေါက်ရွှေ လျှော့' },
    { value: 'adj-in', label: 'မီးလင်းဖြတ်စ ထည့်' },
    { value: 'adj-out', label: 'မီးလင်းဖြတ်စ လျှော့' },
  ];

  const confirmDelete = async () => {
    const m = pendingDelete;
    if (!m || deleting) return;
    setDeleting(true);
    try {
      if (m.deleteKind === 'card') await deleteCardAdjustment(m.id);
      else await deleteStockAdjustment(m.id);
      setPendingDelete(null);
      await refresh();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1280 }}>
      <StatStrip>
        <MiniFact
          label="စုစုပေါင်း လက်ကျန်"
          value={W(totalY, digits)}
          tone={negative ? 'buy' : 'ink'}
          sub={negative ? 'အနှုတ်ဖြစ်နေသည်' : undefined}
        />
        <MiniFact label={`အကယ်ဒမီအခေါက်ရွှေ · ${D(cardCount, digits)} ကဒ်`} value={W(cardWeight, digits)} />
        <MiniFact label="မီးလင်းဖြတ်စ" value={W(looseY, digits)} />
      </StatStrip>

      {/* Manage: cards + loose */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.65fr) minmax(260px, 0.85fr)',
          gap: 14,
          alignItems: 'start',
        }}
      >
        <Card padding={0} style={{ overflow: 'hidden' }}>
          <SectionHead
            title="အကယ်ဒမီအခေါက်ရွှေများ"
            right={
              <span className="num" style={{ fontSize: 16, fontWeight: 600, color: colors.muted }}>
                {D(cardCount, digits)} ကဒ်
              </span>
            }
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            }}
          >
            {CARD_DENOMS.map((d, i) => {
              const q = cardStock[d.id] || 0;
              const col = i % 3;
              const row = Math.floor(i / 3);
              return (
                <div
                  key={d.id}
                  style={{
                    padding: '14px 14px 12px',
                    borderRight: col < 2 ? `1px solid ${colors.rowDivider}` : 'none',
                    borderTop: row > 0 ? `1px solid ${colors.rowDivider}` : 'none',
                    background: q === 0 ? '#FAFBFC' : colors.white,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    minHeight: 118,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, color: colors.muted, lineHeight: 1.45 }}>
                      {d.label}
                    </div>
                    <div
                      className="num"
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        marginTop: 4,
                        letterSpacing: '-0.01em',
                        lineHeight: 1.4,
                        color: q === 0 ? colors.muted2 : colors.ink,
                      }}
                    >
                      {D(q, digits)}
                    </div>
                    <div className="num" style={{ ...ty.meta, marginTop: 4 }}>
                      {W(q * d.yway, digits)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => openCardAdjustDialog('in', d.id)}
                      style={cardActionIn}
                      title={`${d.label} ထည့်`}
                    >
                      <IconPlus size={13} />
                      ထည့်
                    </button>
                    <button
                      type="button"
                      onClick={() => openCardAdjustDialog('out', d.id)}
                      disabled={q <= 0}
                      style={{
                        ...cardActionOut,
                        opacity: q <= 0 ? 0.35 : 1,
                        cursor: q <= 0 ? 'default' : 'pointer',
                      }}
                      title={`${d.label} လျှော့`}
                    >
                      <IconMinus size={13} />
                      လျှော့
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding={0} style={{ overflow: 'hidden' }}>
          <SectionHead title="မီးလင်းဖြတ်စ" />
          <div style={{ padding: '18px 18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: colors.muted, lineHeight: 1.45 }}>
                လက်ကျန်
              </div>
              <div
                className="num"
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  marginTop: 6,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.4,
                  color: looseY < 0 ? colors.buy : colors.ink,
                }}
              >
                {W(looseY, digits)}
              </div>
            </div>

            <div style={{ height: 1, background: colors.rowDivider }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button type="button" onClick={() => openStockAdjustDialog('in')} style={looseBtnPrimary}>
                <IconPlus size={15} />
                မီးလင်းဖြတ်စ ထည့်
              </button>
              <button type="button" onClick={() => openStockAdjustDialog('out')} style={looseBtnOutline}>
                <IconMinus size={15} />
                မီးလင်းဖြတ်စ လျှော့
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Activity */}
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <SectionHead title="ထည့် / လျှော့ မှတ်တမ်း" />
        <FilterPanel active={filterActive} onClear={clearFilters}>
          <FilterField label="အမျိုးအစား" minWidth={140}>
            <FilterSelect
              value={filter}
              onChange={(v) => setFilter(v as MoveFilter)}
              options={typeOptions}
            />
          </FilterField>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <DateChip
              caption="မှ"
              value={from || today}
              digits={digits}
              max={to || today}
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
              value={to || today}
              digits={digits}
              min={from || undefined}
              max={today}
              onChange={pickTo}
            />
          </div>
        </FilterPanel>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...tableTh, paddingLeft: 16 }}>အမျိုးအစား / ရက်စွဲ</th>
              <th style={tableTh}>အသေးစိတ်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>အဝင်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>အထွက်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>လက်ကျန်</th>
              <th style={{ ...tableTh, paddingRight: 16 }} />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ ...tableTd, padding: 40, textAlign: 'center', color: colors.muted2, borderBottom: 'none' }}
                >
                  {filterActive ? 'စစ်ထုတ်မှုနှင့် ကိုက်ညီသော မှတ်တမ်း မရှိပါ' : 'မှတ်တမ်း မရှိသေးပါ'}
                </td>
              </tr>
            )}
            {page.slice.map((m) => {
              const isIn = m.kind === 'adj-in' || m.kind === 'card-in';
              return (
                <tr key={m.key}>
                  <td style={{ ...tableTd, paddingLeft: 16 }}>
                    <CellTone sell={isIn}>{m.label}</CellTone>
                    <CellMeta className="num">{formatDateTime(m.date, m.time, digits)}</CellMeta>
                  </td>
                  <td style={{ ...tableTd, maxWidth: 280 }}>
                    <div
                      style={{
                        ...ty.tone,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: colors.ink,
                      }}
                    >
                      {m.detail}
                    </div>
                  </td>
                  <td
                    className="num"
                    style={{
                      ...tableTd,
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
                      ...tableTd,
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
                      ...tableTd,
                      textAlign: 'right',
                      fontWeight: 700,
                      color: m.bal < 0 ? colors.buy : colors.ink,
                    }}
                  >
                    {W(m.bal, digits)}
                  </td>
                  <td style={{ ...tableTd, paddingRight: 16, textAlign: 'right' }}>
                    {m.deletable && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingDelete(m);
                        }}
                        style={{
                          height: 36,
                          padding: '0 14px',
                          border: `1.5px solid ${colors.cardBorder}`,
                          borderRadius: radii.sm,
                          background: colors.white,
                          color: colors.buy,
                          fontSize: 17,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <IconTrash size={15} />
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

      <Dialog
        open={!!pendingDelete}
        title="ဖျက်မည်"
        onClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
        width={440}
        compact
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
              style={dialogBtnGhost}
            >
              မလုပ်တော့ပါ
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void confirmDelete()}
              style={{ ...dialogBtnPrimary, background: colors.buy }}
            >
              <IconTrash size={16} />
              {deleting ? 'ဖျက်နေသည်…' : 'ဖျက်မည်'}
            </button>
          </div>
        }
      >
        <div style={{ fontSize: 18, lineHeight: 1.55, color: colors.ink, padding: '8px 4px 12px' }}>
          ဒီမှတ်တမ်းကို ဖျက်မှာ သေချာပါသလား?
        </div>
      </Dialog>
    </div>
  );
}

function SectionHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: `1px solid ${colors.rowDivider}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={ty.section}>{title}</div>
      {right}
    </div>
  );
}

const cardActionIn: CSSProperties = {
  flex: 1,
  height: 32,
  padding: '0 6px',
  border: 'none',
  borderRadius: radii.button,
  background: colors.ink,
  color: colors.white,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  lineHeight: 1.4,
};

const cardActionOut: CSSProperties = {
  flex: 1,
  height: 32,
  padding: '0 6px',
  border: `1px solid ${colors.ink}`,
  borderRadius: radii.button,
  background: colors.white,
  color: colors.ink,
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.4,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
};

const looseBtnPrimary: CSSProperties = {
  height: 44,
  width: '100%',
  border: 'none',
  borderRadius: radii.button,
  background: colors.ink,
  color: colors.white,
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  lineHeight: 1.4,
};

const looseBtnOutline: CSSProperties = {
  height: 44,
  width: '100%',
  border: `1px solid ${colors.ink}`,
  borderRadius: radii.button,
  background: colors.white,
  color: colors.ink,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: 1.4,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
};
