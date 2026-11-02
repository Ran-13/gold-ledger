import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { upsertPrice } from '../db/queries';
import { D, isoDate, money } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function Prices() {
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const digits = settings.digits;
  const today = isoDate();

  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : 1));
  const cur = sorted[sorted.length - 1] ?? { buy: 0, sell: 0, date: today };

  const [buyStr, setBuyStr] = useState('');
  const [sellStr, setSellStr] = useState('');

  useEffect(() => {
    const row = prices.find((p) => p.date === today);
    setBuyStr(row ? String(row.buy) : '');
    setSellStr(row ? String(row.sell) : '');
  }, [prices, today]);

  const pfB = buyStr !== '' ? +buyStr : cur.buy;
  const pfS = sellStr !== '' ? +sellStr : cur.sell;

  const savePrice = async () => {
    if (!pfB || !pfS) return;
    await upsertPrice(today, pfB, pfS);
    await refresh();
    setBuyStr('');
    setSellStr('');
  };

  const priceRows = sorted
    .map((p, i) => {
      const prev = sorted[i - 1];
      const ch = prev ? p.buy - prev.buy : 0;
      return {
        date: D(p.date, digits),
        buy: money(p.buy, digits),
        sell: money(p.sell, digits),
        ch:
          ch === 0
            ? '—'
            : `${ch > 0 ? '+' : '−'}${money(Math.abs(ch), digits)}`,
        chPositive: ch > 0,
        chNegative: ch < 0,
      };
    })
    .reverse();

  const navyField = {
    height: 68,
    border: `1px solid ${colors.navyBorder}`,
    borderRadius: radii.input,
    padding: '0 20px',
    fontFamily: "'IBM Plex Sans', sans-serif",
    fontSize: 26,
    fontWeight: 600,
    background: colors.navyInput,
    color: colors.white,
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: 24,
        alignItems: 'start',
        maxWidth: 1160,
      }}
    >
      <Card navy padding="34px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
              ယနေ့ဈေး သတ်မှတ်
            </div>
            <div style={{ fontSize: 15, color: colors.mutedOnNavy }}>၁ ကျပ်သား · ၁၆ ပဲရည်</div>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 15, color: colors.mutedOnNavy }}>ဝယ်ဈေး (ဆိုင်မှဝယ်)</span>
            <input
              type="number"
              min={0}
              value={buyStr}
              placeholder={String(cur.buy)}
              onChange={(e) => setBuyStr(e.target.value)}
              style={navyField}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={{ fontSize: 15, color: colors.mutedOnNavy }}>ရောင်းဈေး (ဆိုင်မှရောင်း)</span>
            <input
              type="number"
              min={0}
              value={sellStr}
              placeholder={String(cur.sell)}
              onChange={(e) => setSellStr(e.target.value)}
              style={{ ...navyField, color: colors.goldOnNavy }}
            />
          </label>
          <div style={{ fontSize: 15, color: colors.mutedOnNavy }}>ကွာဟချက် {money(pfS - pfB, digits)}</div>
          <button
            type="button"
            onClick={() => void savePrice()}
            style={{
              height: 56,
              border: 'none',
              borderRadius: 8,
              background: colors.gold,
              color: colors.ink,
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            ဈေးသတ်မှတ်မည်
          </button>
        </div>
      </Card>

      <Card padding={0} style={{ overflow: 'auto', maxHeight: 620 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
          <thead>
            <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 15 }}>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>ရက်စွဲ</th>
              <th style={{ padding: '16px 12px', fontWeight: 600, textAlign: 'right' }}>ဝယ်</th>
              <th style={{ padding: '16px 12px', fontWeight: 600, textAlign: 'right' }}>ရောင်း</th>
              <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>ပြောင်းလဲ</th>
            </tr>
          </thead>
          <tbody>
            {priceRows.map((p) => (
              <tr key={p.date}>
                <td style={{ padding: '13px 20px', borderTop: `1px solid ${colors.rowDivider}`, whiteSpace: 'nowrap' }}>
                  {p.date}
                </td>
                <td style={{ padding: '13px 12px', borderTop: `1px solid ${colors.rowDivider}`, textAlign: 'right' }}>
                  {p.buy}
                </td>
                <td
                  style={{
                    padding: '13px 12px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    textAlign: 'right',
                    fontWeight: 600,
                  }}
                >
                  {p.sell}
                </td>
                <td style={{ padding: '13px 20px', borderTop: `1px solid ${colors.rowDivider}`, textAlign: 'right' }}>
                  <span
                    style={{
                      color: p.chPositive ? colors.sell : p.chNegative ? colors.buy : colors.muted2,
                      fontWeight: 600,
                    }}
                  >
                    {p.ch}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
