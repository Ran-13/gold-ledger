import { useEffect, useMemo, type CSSProperties } from 'react';
import * as XLSX from 'xlsx';
import { Card } from '../components/Card';
import { clearOutlineBtn, tableHover, tableTd, tableTh } from '../components/ClearUI';
import { IconPrint, IconSearch } from '../components/Icons';
import { PaginationBar, usePagination } from '../components/Pagination';
import { Segmented } from '../components/Segmented';
import { filterInputStyle } from '../components/TableFilters';
import { customerName, typeLabel } from '../lib/format';
import {
  formatCardLines,
  isCardDenom,
  type CardDenom,
} from '../lib/cards';
import { D, W, isoDate, money, toLatinDigits, voucherNo } from '../lib/units';
import { colors } from '../styles/tokens';
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
  const monthStart = `${today.slice(0, 7)}-01`;

  // Entering မှတ်တမ်း → always start on ယနေ့
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

  const exportExcel = () => {
    if (rows.length === 0) {
      window.alert('ထုတ်ယူရန် စာရင်း မရှိပါ');
      return;
    }
    const header = [
      'ဘောင်ချာ',
      'ရက်စွဲ',
      'အချိန်',
      'အမျိုး',
      'လမ်းကြောင်း',
      'ဖောက်သည်',
      'အလေးချိန်',
      'စျေးနှုန်း',
      'ငွေ',
      'မှတ်ချက်',
      'အကယ်ဒမီအခေါက်ရွှေ',
    ];
    const data = rows.map((t) => {
      const cards = cardsByTxn.get(t.id);
      return [
        voucherNo(t.voucher_no, 'latin'),
        t.date,
        t.time,
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
    XLSX.utils.book_append_sheet(book, sheet, 'မှတ်တမ်း');
    XLSX.writeFile(book, `ledger-${today}.xlsx`);
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
            gap: 14,
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
              <div style={{ fontSize: 19, fontWeight: 700 }}>ဘောင်ချာစာရင်း</div>
              <div style={{ fontSize: 16, color: colors.muted }}>
                {D(rows.length, digits)} စောင်
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-flex', gap: 4, padding: 3, border: `1px solid ${colors.cardBorder}`, borderRadius: 8, background: colors.white }}>
                <PresetChip
                  label="ယနေ့"
                  active={flt.from === today && flt.to === today}
                  onClick={() => setFlt({ from: today, to: today })}
                />
                <PresetChip
                  label="ဒီလ"
                  active={flt.from === monthStart && flt.to === today}
                  onClick={() => setFlt({ from: monthStart, to: today })}
                />
                <PresetChip
                  label="အားလုံး"
                  active={!flt.from && !flt.to}
                  onClick={() => setFlt({ from: '', to: '' })}
                />
              </div>
              {filterActive && (
                <button type="button" onClick={clearFlt} style={btnClear}>
                  ရှင်းမည်
                </button>
              )}
              <button type="button" onClick={exportExcel} style={{ ...clearOutlineBtn, height: 40 }}>
                Excel ထုတ်မည်
              </button>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.muted2,
                display: 'flex',
                pointerEvents: 'none',
              }}
            >
              <IconSearch size={16} />
            </span>
            <input
              value={flt.q}
              onChange={(e) => setFlt({ q: e.target.value })}
              placeholder="ဝယ်သူအမည် သို့မဟုတ် ဘောင်ချာနံပါတ်…"
              style={{
                ...filterInputStyle,
                height: 44,
                paddingLeft: 42,
                fontSize: 16,
                borderRadius: 8,
                background: colors.white,
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr) minmax(280px, 1.2fr)',
              gap: 14,
              alignItems: 'end',
            }}
          >
            <label style={fieldWrap}>
              <span style={fieldLabel}>အမျိုးအစား</span>
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
            </label>
            <label style={fieldWrap}>
              <span style={fieldLabel}>အကယ်ဒမီအခေါက်ရွှေ / မီးလင်းဖြတ်စ</span>
              <Segmented
                size="chip"
                value={flt.channel}
                onChange={(v) => setFlt({ channel: v })}
                options={[
                  { value: 'all', label: 'အားလုံး' },
                  { value: 'card', label: 'အကယ်ဒမီအခေါက်ရွှေ' },
                  { value: 'loose', label: 'မီးလင်းဖြတ်စ' },
                ]}
              />
            </label>
            <label style={fieldWrap}>
              <span style={fieldLabel}>ရက်စွဲ အပိုင်းအခြား</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="date"
                  value={flt.from}
                  onChange={(e) => setFlt({ from: e.target.value })}
                  style={{ ...filterInputStyle, flex: 1, minWidth: 0, background: colors.white }}
                />
                <span style={{ color: colors.muted2, fontSize: 16, flexShrink: 0 }}>—</span>
                <input
                  type="date"
                  value={flt.to}
                  onChange={(e) => setFlt({ to: e.target.value })}
                  style={{ ...filterInputStyle, flex: 1, minWidth: 0, background: colors.white }}
                />
              </div>
            </label>
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
                <th style={tableTh}>အမျိုး</th>
                <th style={tableTh}>ဖောက်သည်</th>
                <th style={{ ...tableTh, textAlign: 'right' }}>အလေးချိန်</th>
                <th style={{ ...tableTh, textAlign: 'right' }}>စျေး</th>
                <th style={{ ...tableTh, textAlign: 'right' }}>ငွေ</th>
                <th style={{ ...tableTh, paddingRight: 16, textAlign: 'right' }} />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: '36px 16px',
                      textAlign: 'center',
                      color: colors.muted2,
                      fontSize: 16,
                    }}
                  >
                    {filterActive ? 'စစ်ထုတ်မှုနှင့် ကိုက်ညီသော စာရင်း မရှိပါ' : 'စာရင်း မရှိသေးပါ'}
                  </td>
                </tr>
              )}
              {page.slice.map((t) => {
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
                      <div className="num" style={{ fontWeight: 700, fontSize: 16, color: colors.ink }}>
                        {voucherNo(t.voucher_no, digits)}
                      </div>
                      <div className="num" style={{ fontSize: 14, color: colors.muted2, marginTop: 2 }}>
                        {D(t.date, digits)}
                        {t.time ? ` · ${D(t.time.slice(0, 5), digits)}` : ''}
                      </div>
                    </td>
                    <td style={tableTd}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          lineHeight: 1.35,
                          color: sell ? colors.sell : colors.buy,
                        }}
                      >
                        {typeLabel(t.type)}
                      </div>
                      <div style={{ fontSize: 14, color: colors.muted2, marginTop: 3 }}>
                        {t.channel === 'card' ? 'အကယ်ဒမီအခေါက်ရွှေ' : 'မီးလင်းဖြတ်စ'}
                      </div>
                    </td>
                    <td style={{ ...tableTd, maxWidth: 220 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 16,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {customerName(t.customer_id, custMap)}
                      </div>
                      {t.channel === 'card' && cardsByTxn.get(t.id)?.length ? (
                        <div
                          style={{
                            fontSize: 14,
                            color: colors.muted2,
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatCardLines(cardsByTxn.get(t.id)!, digits)}
                        </div>
                      ) : t.note ? (
                        <div
                          style={{
                            fontSize: 14,
                            color: colors.muted2,
                            marginTop: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {t.note}
                        </div>
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
                      {W(t.yway, digits)}
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
                        style={btnVoucher}
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

function PresetChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        padding: '0 12px',
        borderRadius: 6,
        border: 'none',
        background: active ? colors.ink : 'transparent',
        color: active ? colors.white : colors.muted,
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

const fieldWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  minWidth: 0,
};

const fieldLabel: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: colors.muted,
};

const btnClear: CSSProperties = {
  height: 38,
  padding: '0 14px',
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: 8,
  background: colors.white,
  color: colors.ink,
  fontSize: 16,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnVoucher: CSSProperties = {
  height: 32,
  padding: '0 12px',
  border: 'none',
  borderRadius: 7,
  background: colors.ink,
  color: colors.white,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
