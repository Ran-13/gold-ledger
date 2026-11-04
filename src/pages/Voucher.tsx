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
import { dashPrint, printVoucher, type VoucherPrintData } from '../lib/printVoucher';
import { D, W, formatDate, formatTimeAmPm, fromYway, voucherNo } from '../lib/units';
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
  const printSize = settings.print_size;

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

  const buildPrintData = (): VoucherPrintData | null => {
    if (!vt) return null;
    const parts = fromYway(vt.yway);
    return {
      date: formatDate(vt.date, 'latin'),
      time: formatTimeAmPm(vt.time, digits),
      name: customerName(vt.customer_id, custMap),
      nrc: dashPrint(vc?.nrc),
      address: vc?.address?.trim() || '—',
      phone: dashPrint(vc?.phone),
      kyat: parts.k ? D(Math.abs(parts.k), digits) : '—',
      pe: parts.p ? D(parts.p, digits) : '—',
      yway: parts.y ? D(parts.y, digits) : '—',
    };
  };

  // Save → print: wait for paint; clear flag only when actually printing
  // (clearing early breaks React Strict Mode remount / cancels the dialog)
  useEffect(() => {
    if (!printAfterOpen || !vt) return;
    let alive = true;
    const t = window.setTimeout(() => {
      if (!alive) return;
      const data = buildPrintData();
      if (!data) return;
      setPrintAfterOpen(false);
      printVoucher(printSize, data);
    }, 450);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [printAfterOpen, vt?.id, setPrintAfterOpen, printSize]);

  if (!vt) {
    return (
      <Card padding="48px 32px">
        <div style={{ textAlign: 'center', color: colors.muted, fontSize: 18, lineHeight: 1.6 }}>
          ဘောင်ချာ မရှိသေးပါ
          <div style={{ fontSize: 16, color: colors.muted2, marginTop: 8 }}>
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
    fontSize: 16,
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
              <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.35, letterSpacing: 0.2 }}>
                ဘောင်ချာစာရင်း
              </div>
              <div style={{ fontSize: 16, color: colors.muted, fontWeight: 600, lineHeight: 1.4 }}>
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
                  fontSize: 18,
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
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '24%' }} />
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ ...thBase, paddingLeft: 16 }}>အမှတ်</th>
                  <th style={thBase}>အမျိုး</th>
                  <th style={thBase}>အမည်</th>
                  <th style={thBase}>ရက်စွဲ</th>
                  <th style={{ ...thBase, textAlign: 'right', paddingRight: 16 }}>ရွှေချိန်</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: 48,
                        textAlign: 'center',
                        color: colors.muted2,
                        fontSize: 18,
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
                          fontSize: 18,
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
                            fontSize: 16,
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
                          fontSize: 17,
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
                          fontSize: 16,
                          lineHeight: 1.4,
                          color: on ? 'rgba(255,255,255,.78)' : colors.muted,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(t.date, digits)}
                      </td>
                      <td
                        className="num"
                        style={{
                          padding: '15px 16px 15px 12px',
                          borderTop: rowBorder,
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: 17,
                          lineHeight: 1.35,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {W(t.yway, digits)}
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
            <div style={{ fontSize: 20, fontWeight: 700 }}>{voucherNo(vt.voucher_no, digits)}</div>
            <div style={{ fontSize: 16, color: colors.muted, marginTop: 2 }}>
              {vt.type === 'sell' ? 'အရောင်း' : 'အဝယ်'}
              {vt.channel === 'card' ? ' · အကယ်ဒမီအခေါက်ရွှေ' : ' · မီးလင်းဖြတ်စ'} · {W(vt.yway, digits)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const data = buildPrintData();
              if (data) printVoucher(printSize, data);
            }}
            style={{
              height: 42,
              padding: '0 18px',
              border: 'none',
              borderRadius: 8,
              background: colors.ink,
              color: colors.white,
              fontSize: 16,
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

            <WatermarkSeal />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'end',
                  gap: 8,
                  marginBottom: 18,
                }}
              >
                <div />
                <div style={{ textAlign: 'center' }}>
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
                      margin: '8px auto 0',
                      width: 48,
                      height: 2,
                      background: 'linear-gradient(90deg, transparent, #111111, transparent)',
                      borderRadius: 1,
                    }}
                  />
                </div>
                <div
                  style={{
                    justifySelf: 'end',
                    fontSize: 16,
                    color: '#111111',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    paddingBottom: 2,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <IconClock size={14} style={{ color: '#111111' }} />
                  <span className="num" style={{ fontWeight: 600, letterSpacing: 0.3 }}>
                    {formatTimeAmPm(vt.time, digits)}
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
                <FieldRow icon={<IconCalendar size={15} />} label="ရက်စွဲ" value={formatDate(vt.date, 'latin')} />
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

/** Small generic ornament — no shop mark (keeps shop identity subtle). */
function WatermarkSeal() {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        right: 14,
        bottom: 14,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.55,
      }}
    >
      <div style={{ transform: 'rotate(-12deg)' }}>
        <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="#111111" strokeOpacity="0.18" strokeWidth="1.2" />
          <circle cx="32" cy="32" r="22" stroke="#111111" strokeOpacity="0.12" strokeWidth="1" />
          <path
            d="M32 14 L36 28 L50 28 L39 37 L43 51 L32 42 L21 51 L25 37 L14 28 L28 28 Z"
            fill="#111111"
            fillOpacity="0.08"
            stroke="#111111"
            strokeOpacity="0.2"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
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
  const style: CSSProperties = {
    border: '1.5px solid #111111',
    padding: '14px 12px',
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 22,
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
