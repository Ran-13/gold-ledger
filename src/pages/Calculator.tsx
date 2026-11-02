import { useMemo, useState } from 'react';
import { Card } from '../components/Card';
import { amount, isoDate, money, toYway } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function Calculator() {
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const digits = settings.digits;
  const today = isoDate();

  const [k, setK] = useState('1');
  const [p, setP] = useState('');
  const [y, setY] = useState('');
  const [priceStr, setPriceStr] = useState('');

  const sorted = [...prices].sort((a, b) => (a.date < b.date ? -1 : 1));
  const cur = sorted[sorted.length - 1] ?? { buy: 0, sell: 0, date: today };
  const defaultSell = cur.sell;

  const yway = toYway(+k || 0, +p || 0, +y || 0);
  const price = priceStr !== '' ? +priceStr : defaultSell;
  const val = useMemo(
    () => amount(yway, price, settings.round_to),
    [yway, price, settings.round_to],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1360 }}>
      <div style={{ fontSize: 16, color: colors.muted }}>၁ ကျပ်သား = ၁၆ ပဲ · ၁ ပဲ = ၈ ရွေး</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 620px)', gap: 24, alignItems: 'start' }}>
        <Card padding="28px">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
              တန်ဖိုးတွက်
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {(
                [
                  ['ကျပ်', k, setK],
                  ['ပဲ', p, setP],
                  ['ရွေး', y, setY],
                ] as const
              ).map(([label, val, set]) => (
                <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                  <span style={{ fontSize: 15, color: colors.muted }}>{label}</span>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    style={{
                      height: 52,
                      border: `1px solid ${colors.inputBorder}`,
                      borderRadius: radii.card,
                      padding: '0 14px',
                      fontSize: 20,
                      fontWeight: 600,
                      width: '100%',
                      boxSizing: 'border-box',
                      background: '#fff',
                    }}
                  />
                </label>
              ))}
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
              <span style={{ fontSize: 15, color: colors.muted }}>ဈေး / ကျပ်သား</span>
              <input
                type="number"
                min={0}
                value={priceStr}
                placeholder={String(defaultSell)}
                onChange={(e) => setPriceStr(e.target.value)}
                style={{
                  height: 52,
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: radii.card,
                  padding: '0 14px',
                  fontSize: 20,
                  fontWeight: 600,
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#fff',
                }}
              />
            </label>
            <div
              style={{
                background: colors.ink,
                color: colors.white,
                borderRadius: radii.input,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                fontSize: 16,
              }}
            >
              <div
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 32,
                  fontWeight: 600,
                  color: colors.goldOnNavy,
                  textAlign: 'right',
                  lineHeight: 1.2,
                  paddingTop: 8,
                  borderTop: `1px solid ${colors.navyBorder}`,
                }}
              >
                {money(val, digits)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
