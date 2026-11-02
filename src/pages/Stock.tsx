import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { setSetting } from '../db/queries';
import { pillStyle, typeLabel } from '../lib/format';
import { D, W, YWAY_PER_KYAT, money, stock as stockCalc, voucherNo } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function Stock() {
  const txns = useStore((s) => s.txns);
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const refreshSettings = useStore((s) => s.refreshSettings);
  const digits = settings.digits;

  const sortedPrices = [...prices].sort((a, b) => (a.date < b.date ? -1 : 1));
  const curBuy = sortedPrices[sortedPrices.length - 1]?.buy ?? 0;

  const buyY = txns.filter((t) => t.type === 'buy').reduce((a, t) => a + t.yway, 0);
  const sellY = txns.filter((t) => t.type === 'sell').reduce((a, t) => a + t.yway, 0);
  const opening = settings.opening_stock_yway;
  const stockY = stockCalc(opening, buyY, sellY);

  const [openK, setOpenK] = useState(String(Math.round((opening / YWAY_PER_KYAT) * 1000) / 1000));

  const moves = useMemo(() => {
    const asc = [...txns].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (a.time !== b.time) return a.time < b.time ? -1 : 1;
      return a.voucher_no - b.voucher_no;
    });
    let bal = opening;
    return asc
      .map((t) => {
        bal += t.type === 'buy' ? t.yway : -t.yway;
        return {
          id: t.id,
          no: voucherNo(t.voucher_no, digits),
          date: D(t.date, digits),
          type: t.type,
          inW: t.type === 'buy' ? W(t.yway, digits) : '',
          outW: t.type === 'sell' ? W(t.yway, digits) : '',
          bal: W(bal, digits),
        };
      })
      .reverse()
      .slice(0, 40);
  }, [txns, opening, digits]);

  const saveOpening = async () => {
    const v = +openK || 0;
    await setSetting('opening_stock_yway', String(v * YWAY_PER_KYAT));
    await refreshSettings();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1360 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) repeat(3, minmax(0, 1fr))', gap: 20 }}>
        <Card padding="28px 30px">
          <div style={{ fontSize: 16, fontWeight: 600 }}>လက်ရှိလက်ကျန် (အခေါက်)</div>
          <div
            style={{
              fontFamily: "'IBM Plex Sans', 'Noto Sans Myanmar', sans-serif",
              fontSize: 32,
              fontWeight: 700,
              lineHeight: 1.35,
              marginTop: 6,
            }}
          >
            {W(stockY, digits)}
          </div>
          <div style={{ fontSize: 15, marginTop: 4 }}>
            တန်ဖိုး {money((stockY / YWAY_PER_KYAT) * curBuy, digits)}
          </div>
        </Card>
        <Card padding="24px 26px">
          <div style={{ fontSize: 15, color: colors.muted }}>အစလက်ကျန်</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6 }}>{W(opening, digits)}</div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <input
              type="number"
              min={0}
              step="any"
              value={openK}
              onChange={(e) => setOpenK(e.target.value)}
              onBlur={() => void saveOpening()}
              style={{
                width: 100,
                height: 40,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: 10,
                padding: '0 12px',
                fontSize: 16,
                background: '#fff',
              }}
            />
            <span style={{ fontSize: 15, color: colors.muted }}>ကျပ်သား</span>
          </div>
        </Card>
        <Card padding="24px 26px">
          <div style={{ fontSize: 15, color: colors.muted }}>ဝယ်ယူ (အဝင်)</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6, color: colors.sell }}>
            + {W(buyY, digits)}
          </div>
        </Card>
        <Card padding="24px 26px">
          <div style={{ fontSize: 15, color: colors.muted }}>ရောင်းချ (အထွက်)</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginTop: 6, color: colors.buy }}>
            − {W(sellY, digits)}
          </div>
        </Card>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '22px 24px 8px',
            fontFamily: "'Noto Sans Myanmar', sans-serif",
            fontSize: 19,
            fontWeight: 700,
          }}
        >
          အဝင်အထွက်
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
          <thead>
            <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 15 }}>
              <th style={{ padding: '14px 24px', fontWeight: 600 }}>ဘောင်ချာ</th>
              <th style={{ padding: '14px 12px', fontWeight: 600 }}>အမျိုး</th>
              <th style={{ padding: '14px 12px', fontWeight: 600 }}>အဝင်</th>
              <th style={{ padding: '14px 12px', fontWeight: 600 }}>အထွက်</th>
              <th style={{ padding: '14px 24px', fontWeight: 600 }}>လက်ကျန်</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <tr key={m.id}>
                <td style={{ padding: '14px 24px', borderTop: `1px solid ${colors.rowDivider}` }}>
                  <div style={{ fontWeight: 700 }}>{m.no}</div>
                  <div style={{ fontSize: 14, color: colors.muted2 }}>{m.date}</div>
                </td>
                <td style={{ padding: '14px 12px', borderTop: `1px solid ${colors.rowDivider}` }}>
                  <span style={pillStyle(m.type)}>{typeLabel(m.type)}</span>
                </td>
                <td style={{ padding: '14px 12px', borderTop: `1px solid ${colors.rowDivider}`, color: colors.sell }}>
                  {m.inW}
                </td>
                <td style={{ padding: '14px 12px', borderTop: `1px solid ${colors.rowDivider}`, color: colors.buy }}>
                  {m.outW}
                </td>
                <td
                  style={{
                    padding: '14px 24px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    fontWeight: 700,
                  }}
                >
                  {m.bal}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
