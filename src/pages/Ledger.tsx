import { useMemo } from 'react';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { deleteTxn } from '../db/queries';
import { customerName, pillStyle, typeLabel } from '../lib/format';
import { D, W, money, voucherNo } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function Ledger() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const flt = useStore((s) => s.flt);
  const setFlt = useStore((s) => s.setFlt);
  const clearFlt = useStore((s) => s.clearFlt);
  const refresh = useStore((s) => s.refresh);
  const setScreen = useStore((s) => s.setScreen);
  const setVoucherId = useStore((s) => s.setVoucherId);
  const digits = settings.digits;

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const ql = flt.q.trim().toLowerCase();

  const rows = txns.filter(
    (t) =>
      (flt.type === 'all' || t.type === flt.type) &&
      (!flt.from || t.date >= flt.from) &&
      (!flt.to || t.date <= flt.to) &&
      (!ql ||
        customerName(t.customer_id, custMap).toLowerCase().includes(ql) ||
        String(t.voucher_no).includes(ql)),
  );

  const lS = rows.filter((t) => t.type === 'sell');
  const lB = rows.filter((t) => t.type === 'buy');
  const sum = (arr: typeof rows, f: (t: (typeof rows)[0]) => number) =>
    arr.reduce((a, t) => a + f(t), 0);

  const onDelete = async (id: number) => {
    if (!window.confirm('ဘောင်ချာ ဖျက်မှာ သေချာပါသလား?')) return;
    await deleteTxn(id);
    await refresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1360 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <Segmented
          options={[
            { value: 'all', label: 'အားလုံး' },
            { value: 'sell', label: 'ရောင်း' },
            { value: 'buy', label: 'ဝယ်' },
          ]}
          value={flt.type}
          onChange={(v) => setFlt({ type: v })}
        />
        <input
          value={flt.q}
          onChange={(e) => setFlt({ q: e.target.value })}
          placeholder="အမည် / ဘောင်ချာအမှတ် ရှာရန်"
          style={{
            height: 46,
            width: 300,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 8,
            padding: '0 20px',
            fontSize: 16,
            background: colors.white,
          }}
        />
        <input
          type="date"
          value={flt.from}
          onChange={(e) => setFlt({ from: e.target.value })}
          style={{
            height: 46,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 8,
            padding: '0 16px',
            background: colors.white,
            fontSize: 15,
          }}
        />
        <span style={{ color: colors.muted2 }}>—</span>
        <input
          type="date"
          value={flt.to}
          onChange={(e) => setFlt({ to: e.target.value })}
          style={{
            height: 46,
            border: `1px solid ${colors.inputBorder}`,
            borderRadius: 8,
            padding: '0 16px',
            background: colors.white,
            fontSize: 15,
          }}
        />
        <button
          type="button"
          onClick={clearFlt}
          style={{
            height: 46,
            padding: '0 14px',
            border: 'none',
            background: 'none',
            color: colors.goldDark,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          ရှင်းမည်
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 16, color: colors.muted }}>{D(rows.length, digits)} စောင်</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 20 }}>
        <Card padding="22px 26px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, color: colors.muted }}>ရောင်း စုစုပေါင်း</div>
              <div style={{ fontSize: 16, color: colors.muted }}>
                {money(sum(lS, (t) => t.amount), digits)} ကျပ်
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: colors.sell }}>
              {W(sum(lS, (t) => t.yway), digits)}
            </div>
          </div>
        </Card>
        <Card padding="22px 26px">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, color: colors.muted }}>ဝယ် စုစုပေါင်း</div>
              <div style={{ fontSize: 16, color: colors.muted }}>
                {money(sum(lB, (t) => t.amount), digits)} ကျပ်
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, color: colors.buy }}>
              {W(sum(lB, (t) => t.yway), digits)}
            </div>
          </div>
        </Card>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
          <thead>
            <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 15 }}>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>ဘောင်ချာ</th>
              <th style={{ padding: '16px 12px', fontWeight: 600 }}>အမျိုး</th>
              <th style={{ padding: '16px 12px', fontWeight: 600 }}>ဖောက်သည်</th>
              <th style={{ padding: '16px 12px', fontWeight: 600 }}>အလေးချိန်</th>
              <th style={{ padding: '16px 12px', fontWeight: 600, textAlign: 'right' }}>ငွေ</th>
              <th style={{ padding: '16px 20px' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td style={{ padding: '16px 20px', borderTop: `1px solid ${colors.rowDivider}`, whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 700 }}>{voucherNo(t.voucher_no, digits)}</div>
                  <div style={{ fontSize: 14, color: colors.muted2 }}>{D(t.date, digits)}</div>
                </td>
                <td style={{ padding: '16px 12px', borderTop: `1px solid ${colors.rowDivider}` }}>
                  <span style={pillStyle(t.type)}>{typeLabel(t.type)}</span>
                </td>
                <td style={{ padding: '16px 12px', borderTop: `1px solid ${colors.rowDivider}`, fontWeight: 500 }}>
                  {customerName(t.customer_id, custMap)}
                </td>
                <td
                  style={{
                    padding: '16px 12px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    whiteSpace: 'nowrap',
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {W(t.yway, digits)}
                </td>
                <td
                  style={{
                    padding: '16px 12px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    textAlign: 'right',
                    color: colors.muted,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {money(t.amount, digits)}
                </td>
                <td
                  style={{
                    padding: '16px 20px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    whiteSpace: 'nowrap',
                    textAlign: 'right',
                  }}
                >
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherId(t.id);
                        setScreen('voucher');
                      }}
                      style={{
                        height: 36,
                        border: `1px solid ${colors.inputBorder}`,
                        background: '#fff',
                        color: colors.ink,
                        borderRadius: radii.button,
                        padding: '0 16px',
                        fontSize: 15,
                        fontWeight: 600,
                      }}
                    >
                      ဘောင်ချာ
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDelete(t.id)}
                      style={{
                        height: 36,
                        border: 'none',
                        background: 'none',
                        color: colors.buy,
                        fontSize: 15,
                        padding: '0 8px',
                      }}
                    >
                      ဖျက်
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
