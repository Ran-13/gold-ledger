import { Card } from '../components/Card';
import { PaginationBar, usePagination } from '../components/Pagination';
import { D, W } from '../lib/units';
import { colors, radii } from '../styles/tokens';
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
        <button
          type="button"
          onClick={openCustomerDialog}
          style={{
            height: 44,
            padding: '0 20px',
            border: 'none',
            borderRadius: 8,
            background: colors.ink,
            color: colors.white,
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          + ဝယ်သူအသစ်
        </button>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
          <thead>
            <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 15 }}>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>
                ဝယ်သူ ({D(customers.length, digits)})
              </th>
              <th style={{ padding: '16px 12px', fontWeight: 600 }}>မှတ်ပုံတင်</th>
              <th style={{ padding: '16px 12px', fontWeight: 600 }}>စောင်</th>
              <th style={{ padding: '16px 12px', fontWeight: 600 }}>ဆိုင်မှရောင်း / ဝယ်</th>
              <th style={{ padding: '16px 20px' }} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  style={{ padding: '36px 20px', textAlign: 'center', color: colors.muted2 }}
                >
                  ဝယ်သူ မရှိသေးပါ
                </td>
              </tr>
            )}
            {page.slice.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: '16px 20px', borderTop: `1px solid ${colors.rowDivider}` }}>
                  <div style={{ fontWeight: 700, lineHeight: 1.5 }}>{c.name}</div>
                  <div className="num" style={{ fontSize: 14, color: colors.muted2 }}>
                    {c.phone}
                  </div>
                </td>
                <td
                  className="num"
                  style={{
                    padding: '16px 12px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    whiteSpace: 'nowrap',
                    fontSize: 14,
                    color: colors.muted,
                  }}
                >
                  {c.nrc}
                </td>
                <td
                  className="num"
                  style={{ padding: '16px 12px', borderTop: `1px solid ${colors.rowDivider}` }}
                >
                  {c.count}
                </td>
                <td
                  style={{
                    padding: '16px 12px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{c.soldW}</div>
                  <div style={{ fontSize: 14, color: colors.muted2 }}>{c.boughtW}</div>
                </td>
                <td
                  style={{
                    padding: '16px 20px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    textAlign: 'right',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => openLedger(c.name)}
                    style={{
                      height: 36,
                      border: `1px solid ${colors.inputBorder}`,
                      background: '#fff',
                      color: colors.ink,
                      borderRadius: radii.button,
                      padding: '0 16px',
                      fontSize: 15,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    မှတ်တမ်း
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
