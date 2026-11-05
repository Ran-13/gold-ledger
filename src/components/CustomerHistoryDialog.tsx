import { Dialog, dialogBtnGhost } from './Dialog';
import { KbdHint } from './KbdHint';
import {
  CellChannel,
  CellMeta,
  CellPrimary,
  CellTone,
  btnTableAction,
  tableHover,
  tableTd,
  tableTh,
  ty,
} from './ClearUI';
import { IconPrint } from './Icons';
import { PaginationBar, usePagination } from './Pagination';
import { typeLabel } from '../lib/format';
import { formatCardLines, isCardDenom, type CardDenom } from '../lib/cards';
import {
  D,
  W,
  formatDateTime,
  money,
  voucherNo,
} from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';
import type { Customer } from '../db/types';
import { useMemo } from 'react';

export function CustomerHistoryDialog({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const open = !!customer;
  const txns = useStore((s) => s.txns);
  const txnCards = useStore((s) => s.txnCards);
  const digits = useStore((s) => s.settings.digits);
  const openVoucher = useStore((s) => s.openVoucher);
  const voucherOpen = useStore((s) => s.voucherDialogOpen);

  const rows = useMemo(() => {
    if (!customer) return [];
    return txns
      .filter((t) => t.customer_id === customer.id)
      .sort((a, b) => b.voucher_no - a.voucher_no);
  }, [txns, customer]);

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

  const soldY = rows.filter((t) => t.type === 'sell').reduce((s, t) => s + t.yway, 0);
  const boughtY = rows.filter((t) => t.type === 'buy').reduce((s, t) => s + t.yway, 0);
  const page = usePagination(rows, { resetKey: customer?.id ?? 0 });

  const meta = customer
    ? [
        customer.phone ? D(customer.phone, digits) : '',
        customer.nrc ? D(customer.nrc, digits) : '',
        customer.address?.trim() || '',
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <Dialog
      open={open}
      title={customer ? `${customer.name} · မှတ်တမ်း` : 'မှတ်တမ်း'}
      subtitle={
        customer ? (
          <span>
            {D(rows.length, digits)} ဘောင်ချာ
            <span style={{ margin: '0 8px', color: colors.cardBorder }}>·</span>
            <span style={{ color: colors.sell }}>ရောင်း {W(soldY, digits)}</span>
            <span style={{ margin: '0 8px', color: colors.cardBorder }}>·</span>
            <span style={{ color: colors.buy }}>ဝယ် {W(boughtY, digits)}</span>
            {meta ? (
              <>
                <span style={{ margin: '0 8px', color: colors.cardBorder }}>·</span>
                <span className="num">{meta}</span>
              </>
            ) : null}
          </span>
        ) : undefined
      }
      onClose={() => {
        if (voucherOpen) return;
        onClose();
      }}
      width={1040}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              ...dialogBtnGhost,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            ပိတ်မည်
            <KbdHint>Esc</KbdHint>
          </button>
        </div>
      }
    >
      <div style={{ margin: '0 -8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              <th style={{ ...tableTh, paddingLeft: 8 }}>ဘောင်ချာ</th>
              <th style={tableTh}>အမျိုးအစား</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>အလေးချိန်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ရွှေစျေး</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ကျသင့်ငွေ</th>
              <th style={{ ...tableTh, paddingRight: 8, textAlign: 'right' }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    ...tableTd,
                    padding: 36,
                    textAlign: 'center',
                    color: colors.muted2,
                    borderBottom: 'none',
                  }}
                >
                  ဒီဝယ်သူမှာ ဘောင်ချာ မရှိသေးပါ
                </td>
              </tr>
            )}
            {page.slice.map((t) => {
              const sell = t.type === 'sell';
              return (
                <tr
                  key={t.id}
                  onClick={() => openVoucher(t.id)}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = tableHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.white;
                  }}
                >
                  <td style={{ ...tableTd, paddingLeft: 8, whiteSpace: 'nowrap' }}>
                    <CellPrimary className="num">{voucherNo(t.voucher_no, digits)}</CellPrimary>
                    <CellMeta className="num">{formatDateTime(t.date, t.time, digits)}</CellMeta>
                  </td>
                  <td style={tableTd}>
                    <CellTone sell={sell}>{typeLabel(t.type)}</CellTone>
                    <CellChannel>
                      {t.channel === 'card' ? 'အကယ်ဒမီအခေါက်ရွှေ' : 'မီးလင်းဖြတ်စ'}
                    </CellChannel>
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
                    style={{ ...tableTd, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 }}
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
                    style={{ ...tableTd, paddingRight: 8, textAlign: 'right' }}
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
        {rows.length > 0 ? (
          <PaginationBar
            page={page.page}
            totalPages={page.totalPages}
            total={page.total}
            from={page.from}
            to={page.to}
            digits={digits}
            onPage={page.setPage}
          />
        ) : null}
      </div>
    </Dialog>
  );
}
