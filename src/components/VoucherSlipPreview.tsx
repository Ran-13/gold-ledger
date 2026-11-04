import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  buildVoucherHtml,
  type PrintSize,
  type VoucherPrintData,
} from '../lib/printVoucher';
import { radii } from '../styles/tokens';

/** Aspect ratios match print paper (width ÷ height). */
const ASPECT: Record<PrintSize, number> = {
  S: 3.5 / 5,
  M: 4 / 6,
  L: 5 / 7,
};

type Props = {
  data: VoucherPrintData;
  size: PrintSize;
  /** Max CSS width of the preview frame. */
  maxWidth?: number;
  style?: CSSProperties;
};

/**
 * On-screen slip preview — same HTML as print, sized to the box (no transform clip).
 */
export function VoucherSlipPreview({ data, size, maxWidth = 440, style }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [width, setWidth] = useState(maxWidth);
  const html = useMemo(() => buildVoucherHtml(size, data, 'preview'), [size, data]);
  const aspect = ASPECT[size];
  const frameH = width / aspect;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => setWidth(Math.min(el.clientWidth || maxWidth, maxWidth));
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [maxWidth]);

  useEffect(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%',
        maxWidth,
        height: frameH,
        boxSizing: 'border-box',
        background: '#E8EAED',
        borderRadius: radii.card,
        boxShadow: '0 10px 36px rgba(0, 0, 0, 0.08)',
        padding: 10,
        position: 'relative',
        ...style,
      }}
    >
      <iframe
        ref={iframeRef}
        title="ဘောင်ချာ preview"
        srcDoc={html}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          border: 0,
          borderRadius: 2,
          background: '#fff',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
