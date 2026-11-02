import { useMemo } from 'react';
import { Card } from '../components/Card';
import { customerName } from '../lib/format';
import { D, W, money, voucherNo } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function Voucher() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const voucherId = useStore((s) => s.voucherId);
  const setVoucherId = useStore((s) => s.setVoucherId);
  const digits = settings.digits;

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const desc = [...txns].sort((a, b) => b.voucher_no - a.voucher_no);
  const vt = txns.find((t) => t.id === voucherId) ?? desc[0] ?? null;
  const vc = vt ? custMap.get(vt.customer_id ?? -1) : null;

  const vList = desc.slice(0, 60);

  if (!vt) {
    return (
      <div style={{ color: colors.muted, fontSize: 17, padding: 24 }}>
        ဘောင်ချာ မရှိသေးပါ
      </div>
    );
  }

  const title = vt.type === 'sell' ? 'အရောင်းဘောင်ချာ' : 'အဝယ်ဘောင်ချာ';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px minmax(0, 1fr)',
        gap: 32,
        alignItems: 'start',
        maxWidth: 1280,
      }}
    >
      <div data-noprint="1">
      <Card
        padding="14px"
        style={{ maxHeight: 'calc(100vh - 170px)', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        <div
          style={{
            fontFamily: "'Noto Sans Myanmar', sans-serif",
            fontSize: 17,
            fontWeight: 700,
            padding: '8px 12px 12px',
          }}
        >
          ဘောင်ချာများ
        </div>
        {vList.map((t) => {
          const on = t.id === vt.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setVoucherId(t.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                textAlign: 'left',
                padding: '12px 14px',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: on ? colors.goldLight : 'transparent',
                fontSize: 15,
                color: colors.ink,
                boxShadow: on ? `inset 3px 0 0 ${colors.goldNav}` : 'none',
              }}
            >
              <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontWeight: 700 }}>{voucherNo(t.voucher_no, digits)}</span>
                <span style={{ fontSize: 14, color: colors.muted2 }}>
                  {t.type === 'sell' ? 'ရောင်း' : 'ဝယ်'}
                </span>
              </span>
              <span
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: 15,
                  color: colors.muted,
                }}
              >
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {customerName(t.customer_id, custMap)}
                </span>
                <span>{money(t.amount, digits)}</span>
              </span>
            </button>
          );
        })}
      </Card>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }}>
        <div data-noprint="1" style={{ display: 'flex', gap: 10, alignSelf: 'stretch', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              height: 48,
              padding: '0 26px',
              border: 'none',
              borderRadius: 8,
              background: colors.ink,
              color: colors.goldOnNavy,
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            ပရင့်ထုတ်မည်
          </button>
        </div>
        <div
          data-print-root="1"
          style={{
            width: '100%',
            maxWidth: 600,
            boxSizing: 'border-box',
            background: '#FFFDF8',
            boxShadow: '0 20px 50px rgba(60,40,10,.12)',
            padding: 12,
          }}
        >
          <div
            style={{
              border: `1.5px solid ${colors.voucherGold}`,
              outline: `1px solid ${colors.voucherGold}`,
              outlineOffset: -6,
              padding: '40px 44px',
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
            }}
          >
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  border: `1.5px solid ${colors.voucherGold}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.goldDark,
                  fontFamily: "'Noto Sans Myanmar', sans-serif",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                သ
              </div>
              <div
                style={{
                  fontFamily: "'Noto Sans Myanmar', sans-serif",
                  fontSize: 30,
                  fontWeight: 700,
                  lineHeight: 1.6,
                }}
              >
                ဦးသန့်စင်
              </div>
              <div style={{ fontSize: 15, color: colors.voucherMuted }}>အခေါက်ရွှေ အရောင်းအဝယ်</div>
              <div
                style={{
                  marginTop: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  color: colors.goldDark,
                  borderTop: `1px solid ${colors.voucherLine}`,
                  borderBottom: `1px solid ${colors.voucherLine}`,
                  padding: '4px 22px',
                }}
              >
                {title}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', fontSize: 15 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: colors.voucherMuted, width: 60 }}>အမှတ်</span>
                <span style={{ fontWeight: 700 }}>{voucherNo(vt.voucher_no, digits)}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: colors.voucherMuted, width: 60 }}>ရက်စွဲ</span>
                <span>
                  {D(vt.date, digits)} {D(vt.time, digits)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: colors.voucherMuted, width: 60 }}>အမည်</span>
                <span>{customerName(vt.customer_id, custMap)}</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <span style={{ color: colors.voucherMuted, width: 60 }}>ဖုန်း</span>
                <span>{vc ? D(vc.phone || '—', digits) : '—'}</span>
              </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
              <thead>
                <tr style={{ borderTop: `1px solid ${colors.ink}`, borderBottom: `1px solid ${colors.ink}`, textAlign: 'left' }}>
                  <th style={{ padding: '9px 4px', fontWeight: 700 }}>အကြောင်းအရာ</th>
                  <th style={{ padding: '9px 4px', fontWeight: 700 }}>အလေးချိန်</th>
                  <th style={{ padding: '9px 4px', fontWeight: 700, textAlign: 'right' }}>ငွေ</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '14px 4px', verticalAlign: 'top' }}>
                    အခေါက်ရွှေ
                    <div style={{ fontSize: 12, color: colors.voucherMuted }}>
                      ၁၆ ပဲရည် · {vt.note || ''}
                    </div>
                  </td>
                  <td style={{ padding: '14px 4px', verticalAlign: 'top' }}>{W(vt.yway, digits)}</td>
                  <td style={{ padding: '14px 4px', textAlign: 'right', verticalAlign: 'top' }}>
                    {money(vt.amount, digits)}
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
                fontSize: 15,
                borderTop: `1px dashed ${colors.voucherDash}`,
                paddingTop: 14,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: colors.voucherMuted }}>ပေါက်ဈေး / ကျပ်သား</span>
                <span>{money(vt.price, digits)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: 8,
                }}
              >
                <span style={{ fontSize: 17, fontWeight: 700 }}>စုစုပေါင်း</span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontSize: 32,
                    fontWeight: 700,
                  }}
                >
                  {money(vt.amount, digits)}
                </span>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 44,
                marginTop: 30,
                fontSize: 14,
                color: colors.voucherMuted,
                textAlign: 'center',
              }}
            >
              <div style={{ borderTop: `1px solid ${colors.voucherSig}`, paddingTop: 6 }}>ဝယ်သူ လက်မှတ်</div>
              <div style={{ borderTop: `1px solid ${colors.voucherSig}`, paddingTop: 6 }}>ရောင်းသူ လက်မှတ်</div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 14, color: colors.goldDark }}>ကျေးဇူးတင်ပါသည်</div>
          </div>
        </div>
      </div>
    </div>
  );
}
