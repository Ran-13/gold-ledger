import { useEffect, type CSSProperties, type ReactNode } from 'react';
import {
  IconCalendar,
  IconClock,
  IconId,
  IconMapPin,
  IconPhone,
  IconPrint,
  IconUser,
} from './Icons';
import { customerName } from '../lib/format';
import { D, W, fromYway, voucherNo } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function VoucherDialog() {
  const open = useStore((s) => s.voucherDialogOpen);
  const close = useStore((s) => s.closeVoucherDialog);
  const voucherId = useStore((s) => s.voucherId);
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const printAfterOpen = useStore((s) => s.printAfterOpen);
  const setPrintAfterOpen = useStore((s) => s.setPrintAfterOpen);
  const digits = settings.digits;
  const shopMark = settings.shop_mark;

  const vt = txns.find((t) => t.id === voucherId) ?? null;
  const custMap = new Map(customers.map((c) => [c.id, c]));
  const vc = vt ? custMap.get(vt.customer_id ?? -1) : null;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open || !printAfterOpen || !vt) return;
    let alive = true;
    const t = window.setTimeout(() => {
      if (!alive) return;
      setPrintAfterOpen(false);
      window.print();
    }, 450);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [open, printAfterOpen, vt?.id, setPrintAfterOpen]);

  if (!open || !vt) return null;

  const parts = fromYway(vt.yway);
  const dash = (v: string | null | undefined) => {
    const t = (v || '').trim();
    return t ? D(t, digits) : '—';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ဘောင်ချာ"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        data-noprint="1"
        onClick={close}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15, 23, 36, 0.48)',
          backdropFilter: 'blur(2px)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 480,
          maxHeight: 'min(92vh, 900px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          alignItems: 'center',
        }}
      >
        <div
          data-noprint="1"
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: 440,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 14px',
            background: colors.white,
            borderRadius: 12,
            border: `1px solid ${colors.cardBorder}`,
            boxShadow: '0 12px 40px rgba(15,23,36,.18)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{voucherNo(vt.voucher_no, digits)}</div>
            <div style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>
              {vt.type === 'sell' ? 'အရောင်း' : 'အဝယ်'}
              {vt.channel === 'card' ? ' · အကယ်ဒမီအခေါက်ရွှေ' : ' · မီးလင်းဖြတ်စ'} · {W(vt.yway, digits)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button type="button" onClick={close} style={ghostBtn}>
              ပိတ်မည်
            </button>
            <button type="button" onClick={() => window.print()} style={printBtn}>
              <IconPrint size={16} />
              ပရင့်ထုတ်မည်
            </button>
          </div>
        </div>

        <div
          data-print-root="1"
          style={{
            width: '100%',
            maxWidth: 440,
            boxSizing: 'border-box',
            background: '#FFFFFF',
            border: '1px solid #111111',
            boxShadow: '0 10px 36px rgba(0, 0, 0, 0.08)',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
            overflow: 'auto',
            maxHeight: 'min(78vh, 720px)',
          }}
        >
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              margin: 8,
              padding: '30px 26px 34px',
              minHeight: 500,
              border: '1px solid #111111',
              background: '#FFFFFF',
            }}
          >
            <CornerOrnament pos="tl" />
            <CornerOrnament pos="tr" />
            <CornerOrnament pos="bl" />
            <CornerOrnament pos="br" />
            <WatermarkSeal mark={shopMark} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 16,
                  marginBottom: 18,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
                      fontSize: 36,
                      fontWeight: 600,
                      letterSpacing: 1.2,
                      color: '#111111',
                      lineHeight: 1,
                    }}
                  >
                    Voucher
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      width: 48,
                      height: 2,
                      background: 'linear-gradient(90deg, #111111, transparent)',
                      borderRadius: 1,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 16,
                    color: '#111111',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    paddingBottom: 2,
                  }}
                >
                  <IconClock size={14} style={{ color: '#111111' }} />
                  <span className="num" style={{ fontWeight: 600, letterSpacing: 0.3 }}>
                    {D(vt.time.slice(0, 5), digits)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  height: 1,
                  background: 'linear-gradient(90deg, transparent, #111111, transparent)',
                  opacity: 0.35,
                  marginBottom: 22,
                }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 15, marginBottom: 34 }}>
                <FieldRow icon={<IconCalendar size={15} />} label="ရက်စွဲ" value={D(vt.date, digits)} />
                <FieldRow
                  icon={<IconUser size={15} />}
                  label="အမည်"
                  value={customerName(vt.customer_id, custMap)}
                />
                <FieldRow icon={<IconId size={15} />} label="မှတ်ပုံတင်" value={dash(vc?.nrc)} />
                <FieldRow
                  icon={<IconMapPin size={15} />}
                  label="နေရပ်"
                  value={vc?.address?.trim() || '—'}
                />
                <FieldRow icon={<IconPhone size={15} />} label="ဖုန်းနံပါတ်" value={dash(vc?.phone)} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 280 }}>
                  <thead>
                    <tr>
                      {(['ကျပ်', 'ပဲ', 'ရွေး'] as const).map((h) => (
                        <th
                          key={h}
                          style={{
                            border: '1.5px solid #111111',
                            padding: '10px 14px',
                            fontWeight: 700,
                            fontSize: 16,
                            letterSpacing: 0.3,
                            background: '#F5F5F5',
                            color: '#111111',
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <WeightCell>{parts.k ? D(Math.abs(parts.k), digits) : '—'}</WeightCell>
                      <WeightCell>{parts.p ? D(parts.p, digits) : '—'}</WeightCell>
                      <WeightCell>{parts.y ? D(parts.y, digits) : '—'}</WeightCell>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 17,
                  fontWeight: 600,
                  color: '#111111',
                  letterSpacing: 0.4,
                  marginTop: 28,
                }}
              >
                ကျေးဇူးတင်ပါသည်။
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const ghostBtn: CSSProperties = {
  height: 40,
  padding: '0 14px',
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: 8,
  background: colors.white,
  color: colors.ink,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
};

const printBtn: CSSProperties = {
  height: 40,
  padding: '0 14px',
  border: 'none',
  borderRadius: 8,
  background: colors.ink,
  color: colors.white,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

function WatermarkSeal({ mark }: { mark: string }) {
  const label = mark.slice(0, 2);
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <div style={{ transform: 'rotate(-14deg)' }}>
        <svg width="248" height="248" viewBox="0 0 248 248" fill="none">
          <defs>
            <radialGradient id="wmGlowDlg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#111111" stopOpacity="0.06" />
              <stop offset="55%" stopColor="#111111" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#111111" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="124" cy="124" r="118" fill="url(#wmGlowDlg)" />
          <circle cx="124" cy="124" r="108" stroke="#111111" strokeOpacity="0.12" strokeWidth="1.25" />
          <circle cx="124" cy="124" r="102" stroke="#111111" strokeOpacity="0.1" strokeWidth="3" />
          <circle cx="124" cy="124" r="94" stroke="#111111" strokeOpacity="0.08" strokeWidth="1" />
          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const outer = 100;
            const inner = i % 3 === 0 ? 90 : 94;
            return (
              <line
                key={i}
                x1={124 + Math.cos(a) * outer}
                y1={124 + Math.sin(a) * outer}
                x2={124 + Math.cos(a) * inner}
                y2={124 + Math.sin(a) * inner}
                stroke="#111111"
                strokeOpacity={i % 3 === 0 ? 0.2 : 0.1}
                strokeWidth={i % 3 === 0 ? 1.4 : 1}
              />
            );
          })}
          <circle cx="124" cy="124" r="62" fill="#FFFFFF" fillOpacity="0.5" />
          <circle cx="124" cy="124" r="62" stroke="#111111" strokeOpacity="0.14" strokeWidth="1.5" />
          <text
            x="124"
            y="124"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#111111"
            fillOpacity="0.1"
            fontFamily="'Pyidaungsu', sans-serif"
            fontSize={label.length > 1 ? 52 : 72}
            fontWeight="700"
          >
            {label}
          </text>
        </svg>
      </div>
    </div>
  );
}

function CornerOrnament({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base: CSSProperties = {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#111111',
    borderStyle: 'solid',
    zIndex: 2,
    pointerEvents: 'none',
    opacity: 0.45,
  };
  const map: Record<typeof pos, CSSProperties> = {
    tl: { ...base, top: 10, left: 10, borderWidth: '1.5px 0 0 1.5px' },
    tr: { ...base, top: 10, right: 10, borderWidth: '1.5px 1.5px 0 0' },
    bl: { ...base, bottom: 10, left: 10, borderWidth: '0 0 1.5px 1.5px' },
    br: { ...base, bottom: 10, right: 10, borderWidth: '0 1.5px 1.5px 0' },
  };
  return <div aria-hidden style={map[pos]} />;
}

function FieldRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '22px 88px 14px minmax(0, 1fr)',
        alignItems: 'center',
        fontSize: 17,
        lineHeight: 1.45,
        gap: 2,
      }}
    >
      <span style={{ color: '#111111', display: 'flex' }}>{icon}</span>
      <span style={{ fontWeight: 600, color: '#111111', letterSpacing: 0.1 }}>{label}</span>
      <span style={{ color: '#111111', textAlign: 'center' }}>-</span>
      <span
        className="num"
        style={{
          fontWeight: 500,
          color: '#111111',
          borderBottom: '1px dotted #AAAAAA',
          minHeight: 22,
          paddingBottom: 3,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function WeightCell({ children }: { children: ReactNode }) {
  return (
    <td
      className="num"
      style={{
        border: '1.5px solid #111111',
        padding: '14px 12px',
        textAlign: 'center',
        fontWeight: 700,
        fontSize: 22,
        letterSpacing: 0.3,
        color: '#111111',
        background: '#FFFFFF',
      }}
    >
      {children}
    </td>
  );
}
