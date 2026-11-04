import { Card } from '../components/Card';
import {
  CellMeta,
  CellPrimary,
  btnTableAction,
  clearPrimaryBtn,
  tableTd,
  tableTh,
} from '../components/ClearUI';
import { PaginationBar, usePagination } from '../components/Pagination';
import { D, W } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function Customers() {
  const customers = useStore((s) => s.customers);
  const txns = useStore((s) => s.txns);
  const settings = useStore((s) => s.settings);
  const setFlt = useStore((s) => s.setFlt);
  const clearFlt = useStore((s) => s.clearFlt);
  const setScreen = useStore((s) => s.setScreen);
  const openCustomerDialog = useStore((s) => s.openCustomerDialog);
  const digits = settings.digits;

  const rows = customers.map((cu) => {
    const a = txns.filter((t) => t.customer_id === cu.id);
    const sa = a.filter((t) => t.type === 'sell');
    const ba = a.filter((t) => t.type === 'buy');
    const sumY = (arr: typeof a) => arr.reduce((s, t) => s + t.yway, 0);
    return {
      id: cu.id,
      name: cu.name,
      phone: D(cu.phone || '—', digits),
      nrc: cu.nrc ? D(cu.nrc, digits) : '—',
      count: D(a.length, digits),
      soldW: W(sumY(sa), digits),
      boughtW: W(sumY(ba), digits),
    };
  });

  const page = usePagination(rows);

  const openLedger = (name: string) => {
    clearFlt();
    setFlt({ q: name });
    setScreen('ledger');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1360 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={openCustomerDialog} style={clearPrimaryBtn}>
          + ဝယ်သူအသစ်
        </button>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...tableTh, paddingLeft: 16 }}>
                အမည် · ဖုန်း
              </th>
              <th style={tableTh}>မှတ်ပုံတင်</th>
              <th style={tableTh}>ဘောင်ချာ</th>
              <th style={tableTh}>ရောင်းရွှေ / ဝယ်ရွှေ</th>
              <th style={{ ...tableTh, paddingRight: 16 }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{ ...tableTd, padding: 36, textAlign: 'center', color: colors.muted2, borderBottom: 'none' }}
                >
                  ဝယ်သူ မရှိသေးပါ
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
                <td style={{ ...tableTd, whiteSpace: 'nowrap' }}>
                  <CellPrimary style={{ color: colors.sell }}>{c.soldW}</CellPrimary>
                  <CellPrimary style={{ color: colors.buy, marginTop: 2 }}>{c.boughtW}</CellPrimary>
                </td>
                <td style={{ ...tableTd, paddingRight: 16, textAlign: 'right' }}>
                  <button type="button" onClick={() => openLedger(c.name)} style={btnTableAction}>
                    မှတ်တမ်းကြည့်မည်
                  </button>
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
    </div>
  );
}
