import { useEffect, useMemo, type CSSProperties } from 'react';
import { appAlert } from '../lib/appAlert';
import * as XLSX from 'xlsx';
import { Card } from '../components/Card';
import {
  CellChannel,
  CellMeta,
  CellPrimary,
  CellTone,
  btnTableAction,
  clearOutlineBtn,
  tableHover,
  tableTd,
  tableTh,
  ty,
} from '../components/ClearUI';
import { DateChip } from '../components/DateChip';
import { IconDownload, IconPrint, IconSearch, IconX } from '../components/Icons';
import { PaginationBar, usePagination } from '../components/Pagination';
import { Segmented } from '../components/Segmented';
import { filterInputStyle } from '../components/TableFilters';
import { customerName, typeLabel } from '../lib/format';
import {
  formatCardLines,
  isCardDenom,
  type CardDenom,
} from '../lib/cards';
import {
  D,
  W,
  formatDate,
  formatDateTime,
  formatTimeAmPm,
  isoDate,
  money,
  toLatinDigits,
  voucherNo,
} from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function Ledger() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const txnCards = useStore((s) => s.txnCards);
  const settings = useStore((s) => s.settings);
  const flt = useStore((s) => s.flt);
  const setFlt = useStore((s) => s.setFlt);
  const clearFlt = useStore((s) => s.clearFlt);
  const openVoucherDlg = useStore((s) => s.openVoucher);
  const digits = settings.digits;

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

  const today = isoDate();

  // Entering အရောင်း/အဝယ် စာရင်း → always start on ယနေ့
  useEffect(() => {
    setFlt({ from: today, to: today });
  }, [setFlt, today]);

  const ql = toLatinDigits(flt.q.trim()).toLowerCase();
  const isTodayRange = flt.from === today && flt.to === today;
  const filterActive =
    flt.type !== 'all' ||
    flt.channel !== 'all' ||
    !!flt.q ||
    ((!!flt.from || !!flt.to) && !isTodayRange);

  const rows = useMemo(() => {
    const filtered = txns.filter(
      (t) =>
        (flt.type === 'all' || t.type === flt.type) &&
        (flt.channel === 'all' ||
          (flt.channel === 'card' ? t.channel === 'card' : t.channel !== 'card')) &&
        (!flt.from || t.date >= flt.from) &&
        (!flt.to || t.date <= flt.to) &&
        (!ql ||
          toLatinDigits(customerName(t.customer_id, custMap)).toLowerCase().includes(ql) ||
          String(t.voucher_no).includes(ql) ||
          toLatinDigits(voucherNo(t.voucher_no, digits)).includes(ql)),
    );
    return [...filtered].sort((a, b) => b.voucher_no - a.voucher_no);
  }, [txns, flt.type, flt.channel, flt.from, flt.to, ql, custMap, digits]);

  const page = usePagination(rows, {
    resetKey: `${flt.type}|${flt.channel}|${flt.q}|${flt.from}|${flt.to}`,
  });

  const openVoucher = (id: number) => {
    openVoucherDlg(id);
  };

  const pickFrom = (d: string) => {
    const nextTo = flt.to || today;
    setFlt({ from: d, to: d > nextTo ? d : nextTo });
  };

  const pickTo = (d: string) => {
    const nextFrom = flt.from || d;
    setFlt({ from: d < nextFrom ? d : nextFrom, to: d });
  };

  const exportExcel = () => {
    if (rows.length === 0) {
      void appAlert('ထုတ်ယူရန် စာရင်း မရှိပါ');
      return;
    }
    const header = [
      'ဘောင်ချာ',
      'ရက်စွဲ',
      'အချိန်',
      'အမျိုးအစား',
      'လမ်းကြောင်း',
      'ဝယ်သူ',
      'အလေးချိန်',
      'ရွှေစျေး',
      'ကျသင့်ငွေ',
      'မှတ်ချက်',
      'အကယ်ဒမီအခေါက်ရွှေ',
    ];
    const data = rows.map((t) => {
      const cards = cardsByTxn.get(t.id);
      return [
        voucherNo(t.voucher_no, 'latin'),
        formatDate(t.date, 'latin'),
        formatTimeAmPm(t.time),
        t.type === 'sell' ? 'အရောင်း' : 'အဝယ်',
        t.channel === 'card' ? 'အကယ်ဒမီအခေါက်ရွှေ' : 'မီးလင်းဖြတ်စ',
        customerName(t.customer_id, custMap),
        W(t.yway, 'latin'),
        t.price,
        t.amount,
        t.note || '',
        cards?.length ? formatCardLines(cards, 'latin') : '',
      ];
    });
    const sheet = XLSX.utils.aoa_to_sheet([header, ...data]);
    sheet['!cols'] = [
      { wch: 10 },
      { wch: 12 },
      { wch: 10 },
      { wch: 10 },
      { wch: 18 },
      { wch: 18 },
      { wch: 16 },
      { wch: 12 },
      { wch: 14 },
      { wch: 20 },
      { wch: 24 },
    ];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'အရောင်းအဝယ်');
    XLSX.writeFile(book, `အရောင်းအဝယ်-${today}.xlsx`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1360 }}>
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '16px 18px',
            borderBottom: `1px solid ${colors.rowDivider}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            background: colors.white,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={ty.page}>အရောင်း/အဝယ် စာရင်း</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: colors.muted }}>
                {D(rows.length, digits)} စောင်
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {filterActive && (
                <button type="button" onClick={clearFlt} style={btnClear}>
                  <IconX size={14} />
                  ရှင်းမည်
                </button>
              )}
              <button type="button" onClick={exportExcel} style={{ ...clearOutlineBtn, height: 40 }}>
                <IconDownload size={16} />
                Excel ထုတ်မည်
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={rangeLabel}>မှ</span>
              <DateChip
                value={flt.from || today}
                digits={digits}
                max={flt.to || today}
                onChange={pickFrom}
              />
              <span style={{ color: colors.muted2, fontSize: 16, fontWeight: 700 }}>—</span>
              <span style={rangeLabel}>ထိ</span>
              <DateChip
                value={flt.to || today}
                digits={digits}
                min={flt.from || undefined}
                max={today}
                onChange={pickTo}
              />
            </div>

            <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.ink,
                  display: 'flex',
                  pointerEvents: 'none',
                }}
              >
                <IconSearch size={16} stroke={2} />
              </span>
              <input
                value={flt.q}
                onChange={(e) => setFlt({ q: e.target.value })}
                placeholder="ဝယ်သူ / ဘောင်ချာ…"
                style={{
                  ...filterInputStyle,
                  width: '100%',
                  height: 44,
                  paddingLeft: 42,
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: radii.input,
                  background: colors.white,
                }}
              />
            </div>
            <Segmented
              size="chip"
              value={flt.type}
              onChange={(v) => setFlt({ type: v })}
              options={[
                { value: 'all', label: 'အားလုံး' },
                { value: 'sell', label: 'ရောင်း' },
                { value: 'buy', label: 'ဝယ်' },
              ]}
            />
            <Segmented
              size="chip"
              value={flt.channel}
              onChange={(v) => setFlt({ channel: v })}
              options={[
                { value: 'all', label: 'အားလုံး' },
                { value: 'card', label: 'အကယ်ဒမီ' },
                { value: 'loose', label: 'မီးလင်း' },
              ]}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 16,
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
              {rows.length === 0 && (
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
                    {filterActive ? 'စစ်ထုတ်မှုနှင့် ကိုက်ညီသော စာရင်း မရှိပါ' : 'စာရင်း မရှိသေးပါ'}
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
                    <td style={{ ...tableTd, maxWidth: 220 }}>
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
                      style={{
                        ...tableTd,
                        textAlign: 'right',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <div>{W(t.yway, digits)}</div>
                      {t.channel === 'card' && cardsByTxn.get(t.id)?.length ? (
                        <div style={ty.weightMeta}>{formatCardLines(cardsByTxn.get(t.id)!, digits)}</div>
                      ) : null}
                    </td>
                    <td
                      className="num"
                      style={{
                        ...tableTd,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        fontWeight: 600,
                      }}
                    >
                      {money(t.price, digits)}
                    </td>
                    <td
                      className="num"
                      style={{
                        ...tableTd,
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        fontWeight: 700,
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

const rangeLabel: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: colors.muted,
  flexShrink: 0,
};

const btnClear: CSSProperties = {
  height: 38,
  padding: '0 14px',
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: radii.button,
  background: colors.white,
  color: colors.ink,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

