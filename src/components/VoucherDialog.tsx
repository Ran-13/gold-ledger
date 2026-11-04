import { useEffect, useMemo, type CSSProperties } from 'react';
import { IconPrint } from './Icons';
import { VoucherSlipPreview } from './VoucherSlipPreview';
import { customerName } from '../lib/format';
import { dashPrint, printVoucher, type VoucherPrintData } from '../lib/printVoucher';
import { D, W, formatDate, formatTimeAmPm, fromYway, voucherNo } from '../lib/units';
import { colors, radii } from '../styles/tokens';
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
  const printSize = settings.print_size;

  const vt = txns.find((t) => t.id === voucherId) ?? null;
  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);
  const vc = vt ? custMap.get(vt.customer_id ?? -1) : null;

  const printData: VoucherPrintData | null = useMemo(() => {
    if (!vt) return null;
    const parts = fromYway(vt.yway);
    return {
      voucherNo: voucherNo(vt.voucher_no),
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
  }, [vt, digits, custMap, vc]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open || !printAfterOpen || !printData) return;
    let alive = true;
    const t = window.setTimeout(() => {
      if (!alive) return;
      setPrintAfterOpen(false);
      printVoucher(printSize, printData);
    }, 450);
    return () => {
      alive = false;
      window.clearTimeout(t);
    };
  }, [open, printAfterOpen, printData, setPrintAfterOpen, printSize]);

  if (!open || !vt || !printData) return null;

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
            borderRadius: radii.card,
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
            <button
              type="button"
              onClick={() => printVoucher(printSize, printData)}
              style={printBtn}
            >
              <IconPrint size={16} />
              ပရင့်ထုတ်မည်
            </button>
          </div>
        </div>

        <VoucherSlipPreview data={printData} size={printSize} maxWidth={440} />
      </div>
    </div>
  );
}

const ghostBtn: CSSProperties = {
  height: 40,
  padding: '0 14px',
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: radii.button,
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
  borderRadius: radii.button,
  background: colors.ink,
  color: colors.white,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};
