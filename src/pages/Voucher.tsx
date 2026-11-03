import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Card } from '../components/Card';
import {
  IconCalendar,
  IconClock,
  IconId,
  IconMapPin,
  IconPhone,
  IconPrint,
  IconSearch,
  IconUser,
} from '../components/Icons';
import { PaginationBar, usePagination } from '../components/Pagination';
import { customerName } from '../lib/format';
import { D, W, fromYway, money, voucherNo } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function Voucher() {
  const txns = useStore((s) => s.txns);
  const customers = useStore((s) => s.customers);
  const settings = useStore((s) => s.settings);
  const voucherId = useStore((s) => s.voucherId);
  const setVoucherId = useStore((s) => s.setVoucherId);
  const printAfterOpen = useStore((s) => s.printAfterOpen);
  const setPrintAfterOpen = useStore((s) => s.setPrintAfterOpen);
  const digits = settings.digits;
  const shopMark = settings.shop_mark;

  const [q, setQ] = useState('');

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const desc = useMemo(
    () => [...txns].sort((a, b) => b.voucher_no - a.voucher_no),
    [txns],
  );

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return desc;
    return desc.filter((t) => {
      const name = customerName(t.customer_id, custMap).toLowerCase();
      const no = String(t.voucher_no);
      return name.includes(ql) || no.includes(ql) || voucherNo(t.voucher_no, digits).includes(ql);
    });
  }, [desc, q, custMap, digits]);

  const page = usePagination(filtered, { resetKey: q });

  const vt = txns.find((t) => t.id === voucherId) ?? filtered[0] ?? desc[0] ?? null;
  const vc = vt ? custMap.get(vt.customer_id ?? -1) : null;

  // Save → print: wait for paint; clear flag only when actually printing
  // (clearing early breaks React Strict Mode remount / cancels the dialog)
  useEffect(() => {
    if (!printAfterOpen || !vt) return;
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
  }, [printAfterOpen, vt.id, setPrintAfterOpen]);

  if (!vt) {
    return (
      <Card padding="48px 32px">
        <div style={{ textAlign: 'center', color: colors.muted, fontSize: 16, lineHeight: 1.6 }}>
          ဘောင်ချာ မရှိသေးပါ
          <div style={{ fontSize: 14, color: colors.muted2, marginTop: 8 }}>
            စာရင်းသွင်းခြင်းမှ သိမ်းဆည်းရင် ဒီမှာ ပေါ်ပါမယ်
          </div>
        </div>
      </Card>
    );
  }

  const parts = fromYway(vt.yway);
  const dash = (v: string | null | undefined) => {
    const t = (v || '').trim();
    return t ? D(t, digits) : '—';
  };

  const thBase: CSSProperties = {
    padding: '14px 12px',
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: 0.2,
    lineHeight: 1.4,
    color: colors.muted,
    whiteSpace: 'nowrap',
    background: '#F7F8FA',
  };

  return (
    <div
      data-print-page="1"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(380px, 0.85fr)',
        gap: 24,
        alignItems: 'start',
        width: '100%',
        minHeight: 'calc(100vh - 140px)',
      }}
    >
      {/* List — ~half page, columns fully visible */}
      <div data-noprint="1" style={{ minWidth: 0, height: '100%' }}>
        <Card
          padding={0}
          style={{
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'calc(100vh - 160px)',
          }}
        >
          <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${colors.cardBorder}` }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.35, letterSpacing: 0.2 }}>
                ဘောင်ချာစာရင်း
              </div>
              <div style={{ fontSize: 14, color: colors.muted, fontWeight: 600, lineHeight: 1.4 }}>
                {D(filtered.length, digits)} စောင်
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.muted,
                  display: 'flex',
                }}
              >
                <IconSearch size={17} />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="အမှတ် / အမည် ရှာရန်"
                style={{
                  width: '100%',
                  height: 48,
                  boxSizing: 'border-box',
                  border: `1.5px solid ${colors.inputBorder}`,
                  borderRadius: 8,
                  padding: '0 14px 0 42px',
                  fontSize: 16,
                  lineHeight: 1.5,
                  background: colors.white,
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: 640,
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                <col style={{ width: '11%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '15%' }} />
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ ...thBase, paddingLeft: 16 }}>အမှတ်</th>
                  <th style={thBase}>အမျိုး</th>
                  <th style={thBase}>အမည်</th>
                  <th style={thBase}>ရက်စွဲ</th>
                  <th style={{ ...thBase, textAlign: 'right' }}>ရွှေချိန်</th>
                  <th style={{ ...thBase, textAlign: 'right' }}>စျေး</th>
                  <th style={{ ...thBase, textAlign: 'right', paddingRight: 16 }}>ငွေ</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        padding: 48,
                        textAlign: 'center',
                        color: colors.muted2,
                        fontSize: 16,
                        lineHeight: 1.6,
                      }}
                    >
                      မတွေ့ပါ
                    </td>
                  </tr>
                )}
                {page.slice.map((t) => {
                  const on = t.id === vt.id;
                  const sell = t.type === 'sell';
                  const rowBorder = on ? 'none' : `1px solid ${colors.rowDivider}`;
                  return (
                    <tr
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setVoucherId(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setVoucherId(t.id);
                      }}
                      style={{
                        cursor: 'pointer',
                        background: on ? colors.ink : colors.white,
                        color: on ? colors.white : colors.ink,
                      }}
                    >
                      <td
                        className="num"
                        style={{
                          padding: '15px 12px 15px 16px',
                          borderTop: rowBorder,
                          fontWeight: 700,
                          fontSize: 16,
                          lineHeight: 1.35,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {voucherNo(t.voucher_no, digits)}
                      </td>
                      <td style={{ padding: '15px 12px', borderTop: rowBorder }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: 1.3,
                            padding: '5px 9px',
                            borderRadius: 6,
                            border: on
                              ? '1.5px solid rgba(255,255,255,.4)'
                              : `1.5px solid ${sell ? colors.sell : colors.buy}`,
                            color: on ? colors.white : sell ? colors.sell : colors.buy,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {sell ? 'အရောင်း' : 'အဝယ်'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '15px 12px',
                          borderTop: rowBorder,
                          fontWeight: 600,
                          fontSize: 15,
                          lineHeight: 1.45,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={customerName(t.customer_id, custMap)}
                      >
                        {customerName(t.customer_id, custMap)}
                      </td>
                      <td
                        className="num"
                        style={{
                          padding: '15px 12px',
                          borderTop: rowBorder,
                          fontSize: 14,
                          lineHeight: 1.4,
                          color: on ? 'rgba(255,255,255,.78)' : colors.muted,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {D(t.date, digits)}
                      </td>
                      <td
                        className="num"
                        style={{
                          padding: '15px 12px',
                          borderTop: rowBorder,
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: 15,
                          lineHeight: 1.35,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {W(t.yway, digits)}
                      </td>
                      <td
                        className="num"
                        style={{
                          padding: '15px 12px',
                          borderTop: rowBorder,
                          textAlign: 'right',
                          fontWeight: 600,
                          fontSize: 14,
                          lineHeight: 1.35,
                          color: on ? 'rgba(255,255,255,.85)' : colors.muted,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {money(t.price, digits)}
                      </td>
                      <td
                        className="num"
                        style={{
                          padding: '15px 16px 15px 12px',
                          borderTop: rowBorder,
                          textAlign: 'right',
                          fontWeight: 600,
                          fontSize: 14,
                          lineHeight: 1.35,
                          color: on ? 'rgba(255,255,255,.85)' : colors.muted,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {money(t.amount, digits)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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

      {/* Preview — other half */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignItems: 'center',
          minWidth: 0,
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
          }}
        >
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{voucherNo(vt.voucher_no, digits)}</div>
            <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
              {vt.type === 'sell' ? 'အရောင်း' : 'အဝယ်'} · {W(vt.yway, digits)} · စျေး {money(vt.price, digits)} ·{' '}
              {money(vt.amount, digits)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            style={{
              height: 42,
              padding: '0 18px',
              border: 'none',
              borderRadius: 8,
              background: colors.ink,
              color: colors.white,
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <IconPrint size={16} />
            ပရင့်ထုတ်မည်
          </button>
        </div>

        {/* Slip — black & white only */}
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
                      fontSize: 34,
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
                    fontSize: 13,
                    color: '#111111',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    paddingBottom: 2,
                  }}
                >
                  <IconClock size={14} style={{ color: '#555555' }} />
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
                            fontSize: 14,
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
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  alignItems: 'center',
                  marginBottom: 28,
                  fontSize: 15,
                  color: '#111111',
                }}
              >
                <div>
                  စျေးနှုန်း · <span className="num" style={{ fontWeight: 700 }}>{money(vt.price, digits)}</span>
                  <span style={{ color: '#555555' }}> / ကျပ်သား</span>
                </div>
                <div>
                  ကျသင့်ငွေ · <span className="num" style={{ fontWeight: 700 }}>{money(vt.amount, digits)}</span>
                  <span style={{ color: '#555555' }}> ကျပ်</span>
                </div>
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#111111',
                  letterSpacing: 0.4,
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
            <radialGradient id="wmGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#111111" stopOpacity="0.06" />
              <stop offset="55%" stopColor="#111111" stopOpacity="0.02" />
              <stop offset="100%" stopColor="#111111" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx="124" cy="124" r="118" fill="url(#wmGlow)" />

          <circle cx="124" cy="124" r="108" stroke="#111111" strokeOpacity="0.12" strokeWidth="1.25" />
          <circle cx="124" cy="124" r="102" stroke="#111111" strokeOpacity="0.1" strokeWidth="3" />
          <circle cx="124" cy="124" r="94" stroke="#111111" strokeOpacity="0.08" strokeWidth="1" />

          {Array.from({ length: 36 }, (_, i) => {
            const a = (i * 10 * Math.PI) / 180;
            const outer = 100;
            const inner = i % 3 === 0 ? 90 : 94;
            const x1 = 124 + Math.cos(a) * outer;
            const y1 = 124 + Math.sin(a) * outer;
            const x2 = 124 + Math.cos(a) * inner;
            const y2 = 124 + Math.sin(a) * inner;
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#111111"
                strokeOpacity={i % 3 === 0 ? 0.2 : 0.1}
                strokeWidth={i % 3 === 0 ? 1.4 : 1}
              />
            );
          })}

          <circle cx="124" cy="124" r="62" fill="#FFFFFF" fillOpacity="0.5" />
          <circle cx="124" cy="124" r="62" stroke="#111111" strokeOpacity="0.14" strokeWidth="1.5" />
          <circle cx="124" cy="124" r="56" stroke="#111111" strokeOpacity="0.08" strokeWidth="1" />

          {[0, 90, 180, 270].map((deg) => {
            const a = ((deg - 90) * Math.PI) / 180;
            const x = 124 + Math.cos(a) * 78;
            const y = 124 + Math.sin(a) * 78;
            return (
              <rect
                key={deg}
                x={x - 3}
                y={y - 3}
                width="6"
                height="6"
                rx="0.5"
                transform={`rotate(45 ${x} ${y})`}
                fill="#111111"
                fillOpacity="0.16"
              />
            );
          })}

          <text
            x="124"
            y="124"
            textAnchor="middle"
            dominantBaseline="central"
            fill="#111111"
            fillOpacity="0.1"
            fontFamily="'Noto Sans Myanmar', sans-serif"
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
        fontSize: 15,
        lineHeight: 1.45,
        gap: 2,
      }}
    >
      <span style={{ color: '#555555', display: 'flex' }}>{icon}</span>
      <span style={{ fontWeight: 600, color: '#111111', letterSpacing: 0.1 }}>{label}</span>
      <span style={{ color: '#888888', textAlign: 'center' }}>-</span>
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
  const style: CSSProperties = {
    border: '1.5px solid #111111',
    padding: '14px 12px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 20,
    letterSpacing: 0.3,
    color: '#111111',
    background: '#FFFFFF',
  };
  return (
    <td className="num" style={style}>
      {children}
    </td>
  );
}
