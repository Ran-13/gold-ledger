import { useMemo, useState, type CSSProperties } from 'react';
import { appAlert } from '../lib/appAlert';
import { Card } from '../components/Card';
import {
  CellMeta,
  CellPrimary,
  btnTableAction,
  clearPrimaryBtn,
  tableTd,
  tableTh,
  ty,
} from '../components/ClearUI';
import { CustomerHistoryDialog } from '../components/CustomerHistoryDialog';
import { Dialog, dialogBtnGhost, dialogBtnPrimary } from '../components/Dialog';
import { PaginationBar, usePagination } from '../components/Pagination';
import { IconEdit, IconLedger, IconPlus, IconSearch, IconTrash, IconX } from '../components/Icons';
import { filterInputStyle } from '../components/TableFilters';
import { deleteCustomer } from '../db/queries';
import { D, W, toLatinDigits } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function Customers() {
  const customers = useStore((s) => s.customers);
  const txns = useStore((s) => s.txns);
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const openCustomerDialog = useStore((s) => s.openCustomerDialog);
  const digits = settings.digits;
  const [pendingDelete, setPendingDelete] = useState<{
    id: number;
    name: string;
    vouchers: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [q, setQ] = useState('');
  const ql = toLatinDigits(q.trim()).toLowerCase();

  const rows = useMemo(() => {
    const list = !ql
      ? customers
      : customers.filter((cu) =>
          toLatinDigits(
            [cu.name, cu.phone || '', cu.nrc || '', cu.address || ''].join(' '),
          )
            .toLowerCase()
            .includes(ql),
        );
    return list.map((cu) => {
      const a = txns.filter((t) => t.customer_id === cu.id);
      const sa = a.filter((t) => t.type === 'sell');
      const ba = a.filter((t) => t.type === 'buy');
      const sumY = (arr: typeof a) => arr.reduce((s, t) => s + t.yway, 0);
      return {
        id: cu.id,
        name: cu.name,
        phone: D(cu.phone || '—', digits),
        address: cu.address?.trim() || '—',
        nrc: cu.nrc ? D(cu.nrc, digits) : '—',
        count: D(a.length, digits),
        vouchers: a.length,
        soldW: W(sumY(sa), digits),
        boughtW: W(sumY(ba), digits),
      };
    });
  }, [customers, txns, digits, ql]);

  const page = usePagination(rows, { resetKey: ql });
  const historyCustomer = customers.find((c) => c.id === historyId) ?? null;

  const confirmDelete = async () => {
    const p = pendingDelete;
    if (!p || deleting) return;
    setDeleting(true);
    try {
      await deleteCustomer(p.id);
      setPendingDelete(null);
      await refresh();
    } catch (e) {
      void appAlert(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1480 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={ty.page}>
          ဝယ်သူ စုစုပေါင်း ({D(customers.length, digits)}) ဦး
          {ql ? (
            <span style={{ fontSize: 16, fontWeight: 600, color: colors.muted, marginLeft: 10 }}>
              ရှာတွေ့ {D(rows.length, digits)} ဦး
            </span>
          ) : null}
        </div>
        <button type="button" onClick={() => openCustomerDialog()} style={clearPrimaryBtn}>
          <IconPlus size={17} />
          ဝယ်သူအသစ်
        </button>
      </div>

      <div style={{ position: 'relative' }}>
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
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="အမည်၊ ဖုန်း၊ မှတ်ပုံတင်၊ လိပ်စာ…"
          style={{
            ...filterInputStyle,
            height: 46,
            paddingLeft: 42,
            paddingRight: q ? 44 : 14,
            fontSize: 16,
            fontWeight: 600,
            borderRadius: radii.input,
            background: colors.white,
          }}
        />
        {q ? (
          <button
            type="button"
            onClick={() => setQ('')}
            aria-label="ရှင်းမည်"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 32,
              height: 32,
              border: 'none',
              borderRadius: '50%',
              background: 'transparent',
              color: colors.muted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconX size={15} />
          </button>
        ) : null}
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...tableTh, paddingLeft: 16 }}>အမည် · ဖုန်း</th>
              <th style={tableTh}>လိပ်စာ</th>
              <th style={tableTh}>မှတ်ပုံတင်</th>
              <th style={tableTh}>ဘောင်ချာ</th>
              <th style={tableTh}>ရွှေ (အရောင်း)</th>
              <th style={tableTh}>ရွှေ (အဝယ်)</th>
              <th style={{ ...tableTh, paddingRight: 16 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    ...tableTd,
                    padding: 36,
                    textAlign: 'center',
                    color: colors.muted2,
                    borderBottom: 'none',
                  }}
                >
                  {ql ? 'ရှာမတွေ့ပါ' : 'ဝယ်သူ မရှိသေးပါ'}
                </td>
              </tr>
            )}
            {page.slice.map((c) => (
              <tr key={c.id}>
                <td style={{ ...tableTd, paddingLeft: 16 }}>
                  <CellPrimary>{c.name}</CellPrimary>
                  <CellMeta className="num">{c.phone}</CellMeta>
                </td>
                <td
                  style={{
                    ...tableTd,
                    color: colors.muted,
                    maxWidth: 220,
                    lineHeight: 1.45,
                  }}
                >
                  {c.address}
                </td>
                <td
                  className="num"
                  style={{
                    ...tableTd,
                    whiteSpace: 'nowrap',
                    color: colors.muted,
                  }}
                >
                  {c.nrc}
                </td>
                <td className="num" style={{ ...tableTd, fontWeight: 700 }}>
                  {c.count}
                </td>
                <td
                  className="num"
                  style={{ ...tableTd, whiteSpace: 'nowrap', fontWeight: 700, color: colors.sell }}
                >
                  {c.soldW}
                </td>
                <td
                  className="num"
                  style={{ ...tableTd, whiteSpace: 'nowrap', fontWeight: 700, color: colors.buy }}
                >
                  {c.boughtW}
                </td>
                <td style={{ ...tableTd, paddingRight: 16, textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      justifyContent: 'flex-end',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => openCustomerDialog(c.id)}
                      style={btnGhost}
                    >
                      <IconEdit size={15} />
                      ပြင်
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({ id: c.id, name: c.name, vouchers: c.vouchers })
                      }
                      style={btnDanger}
                    >
                      <IconTrash size={15} />
                      ဖျက်
                    </button>
                    <button type="button" onClick={() => setHistoryId(c.id)} style={btnTableAction}>
                      <IconLedger size={15} />
                      မှတ်တမ်းကြည့်မည်
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
          {pendingDelete ? (
            pendingDelete.vouchers > 0 ? (
              <>
                ဝယ်သူစာရင်းကနေ <strong>{pendingDelete.name}</strong> ကို ဖျက်လျှင် ဘောင်ချာ{' '}
                {D(pendingDelete.vouchers, digits)} စောင် ရှိသောကြောင့် မှတ်တမ်းမှာ အမည် မပေါ်တော့ပါ။
              </>
            ) : (
              <>
                <strong>{pendingDelete.name}</strong> ကို ဖျက်မှာ သေချာပါသလား?
              </>
            )
          ) : null}
        </div>
      </Dialog>

      <CustomerHistoryDialog customer={historyCustomer} onClose={() => setHistoryId(null)} />
    </div>
  );
}

const btnGhost: CSSProperties = {
  height: 38,
  padding: '0 14px',
  border: `1.5px solid ${colors.cardBorder}`,
  borderRadius: radii.sm,
  background: colors.white,
  color: colors.ink,
  fontSize: 17,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const btnDanger: CSSProperties = {
  ...btnGhost,
  color: colors.buy,
};
