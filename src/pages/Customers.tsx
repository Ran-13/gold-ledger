import { useState, type CSSProperties } from 'react';
import { Card } from '../components/Card';
import { createCustomer } from '../db/queries';
import { D, W } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function Customers() {
  const customers = useStore((s) => s.customers);
  const txns = useStore((s) => s.txns);
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const setFlt = useStore((s) => s.setFlt);
  const clearFlt = useStore((s) => s.clearFlt);
  const setScreen = useStore((s) => s.setScreen);
  const digits = settings.digits;

  const [nc, setNc] = useState({ name: '', phone: '', address: '' });

  const rows = customers.map((cu) => {
    const a = txns.filter((t) => t.customer_id === cu.id);
    const sa = a.filter((t) => t.type === 'sell');
    const ba = a.filter((t) => t.type === 'buy');
    const sumY = (arr: typeof a) => arr.reduce((s, t) => s + t.yway, 0);
    return {
      id: cu.id,
      name: cu.name,
      phone: D(cu.phone || '—', digits),
      count: D(a.length, digits),
      soldW: W(sumY(sa), digits),
      boughtW: W(sumY(ba), digits),
    };
  });

  const addCust = async () => {
    if (!nc.name.trim()) return;
    await createCustomer(nc.name.trim(), nc.phone.trim(), nc.address.trim());
    await refresh();
    setNc({ name: '', phone: '', address: '' });
  };

  const openLedger = (name: string) => {
    clearFlt();
    setFlt({ q: name });
    setScreen('ledger');
  };

  const navyInput: CSSProperties = {
    height: 52,
    border: `1px solid ${colors.navyBorder}`,
    borderRadius: radii.card,
    padding: '0 16px',
    fontSize: 16,
    background: colors.navyInput,
    color: colors.white,
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 340px',
        gap: 24,
        alignItems: 'start',
        maxWidth: 1360,
      }}
    >
      <Card padding={0} style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
          <thead>
            <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 15 }}>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>
                ဖောက်သည် ({D(customers.length, digits)})
              </th>
              <th style={{ padding: '16px 12px', fontWeight: 600 }}>စောင်</th>
              <th style={{ padding: '16px 12px', fontWeight: 600 }}>ဆိုင်မှရောင်း / ဝယ်</th>
              <th style={{ padding: '16px 20px' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td style={{ padding: '16px 20px', borderTop: `1px solid ${colors.rowDivider}` }}>
                  <div style={{ fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 14, color: colors.muted2 }}>{c.phone}</div>
                </td>
                <td style={{ padding: '16px 12px', borderTop: `1px solid ${colors.rowDivider}` }}>{c.count}</td>
                <td
                  style={{
                    padding: '16px 12px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div>{c.soldW}</div>
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
      </Card>

      <Card navy padding="30px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
            ဖောက်သည်အသစ်
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 15, color: colors.mutedOnNavy }}>အမည်</span>
            <input
              value={nc.name}
              onChange={(e) => setNc((s) => ({ ...s, name: e.target.value }))}
              style={navyInput}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 15, color: colors.mutedOnNavy }}>ဖုန်း</span>
            <input
              value={nc.phone}
              onChange={(e) => setNc((s) => ({ ...s, phone: e.target.value }))}
              style={navyInput}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 15, color: colors.mutedOnNavy }}>လိပ်စာ</span>
            <input
              value={nc.address}
              onChange={(e) => setNc((s) => ({ ...s, address: e.target.value }))}
              style={navyInput}
            />
          </label>
          <button
            type="button"
            onClick={() => void addCust()}
            style={{
              height: 52,
              border: 'none',
              borderRadius: 8,
              background: colors.gold,
              color: colors.ink,
              fontWeight: 700,
              fontSize: 16,
              marginTop: 4,
            }}
          >
            ထည့်မည်
          </button>
        </div>
      </Card>
    </div>
  );
}
