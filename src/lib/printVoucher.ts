import type { PrintSize } from '../db/types';

export type { PrintSize };

/**
 * Page size for each option.
 * ပုံမှန် (M) = shop slip 4in × 6in (width × height).
 */
export const PAGE: Record<PrintSize, { size: string; width: string; height: string }> = {
  S: { size: '3.5in 5in', width: '3.5in', height: '5in' },
  M: { size: '4in 6in', width: '4in', height: '6in' },
  L: { size: '5in 7in', width: '5in', height: '7in' },
};

export const PRINT_SIZE_OPTIONS: { value: PrintSize; label: string }[] = [
  { value: 'S', label: 'သေး' },
  { value: 'M', label: 'ပုံမှန်' },
  { value: 'L', label: 'ကြီး' },
];

export type VoucherPrintData = {
  voucherNo: string;
  date: string;
  time: string;
  name: string;
  nrc: string;
  address: string;
  phone: string;
  kyat: string;
  pe: string;
  yway: string;
};

export function dashPrint(v: string | null | undefined): string {
  const t = (v || '').trim();
  return t || '—';
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const ICO = {
  clock: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  calendar: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>`,
  user: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 19c1.5-3.5 4-5 7-5s5.5 1.5 7 5"/></svg>`,
  id: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="12" r="2"/><path d="M14 10h4M14 14h3"/></svg>`,
  pin: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"/><circle cx="12" cy="11" r="2"/></svg>`,
  phone: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5l2.8 1.2a1.5 1.5 0 0 1 .8 1.9l-.8 2a1.5 1.5 0 0 0 .3 1.6l3.4 3.4a1.5 1.5 0 0 0 1.6.3l2-.8a1.5 1.5 0 0 1 1.9.8l1.2 2.8a1.5 1.5 0 0 1-1.1 2C14.4 20.8 3.2 9.6 4.5 4.6a1.5 1.5 0 0 1 2-1.1z"/></svg>`,
};

function fieldRow(icon: string, label: string, value: string): string {
  return `<div class="row">
    <span class="ico">${icon}</span>
    <span class="label">${esc(label)}</span>
    <span class="sep">-</span>
    <span class="value">${esc(value)}</span>
  </div>`;
}

/** Same layout for on-screen preview and print — WYSIWYG. */
export function buildVoucherHtml(
  size: PrintSize,
  data: VoucherPrintData,
  mode: 'print' | 'preview' = 'print',
): string {
  const p = PAGE[size];
  const isPreview = mode === 'preview';
  /* Preview fills the iframe; print uses fixed paper inches. */
  const shell = isPreview
    ? `html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #fff;
    color: #111;
    font-family: 'Pyidaungsu', 'Myanmar Text', 'Noto Sans Myanmar', sans-serif;
  }
  .page {
    width: 100%;
    height: 100%;
    padding: 3.2%;
    box-sizing: border-box;
  }`
    : `html, body {
    margin: 0;
    padding: 0;
    width: ${p.width};
    height: ${p.height};
    overflow: hidden;
    background: #fff;
    color: #111;
    font-family: 'Pyidaungsu', 'Myanmar Text', 'Noto Sans Myanmar', sans-serif;
  }
  .page {
    width: ${p.width};
    height: ${p.height};
    padding: 0.14in;
    box-sizing: border-box;
  }`;

  return `<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8" />
<title>&nbsp;</title>
<style>
  @page {
    size: ${p.size};
    margin: 0;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  ${shell}
  .slip {
    width: 100%;
    height: 100%;
    border: 2px solid #111;
    padding: ${isPreview ? '4.5% 5%' : '0.16in 0.16in 0.14in'};
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .corner {
    position: absolute;
    width: 14px;
    height: 14px;
    border-color: #111;
    border-style: solid;
    opacity: 0.45;
    z-index: 2;
    pointer-events: none;
  }
  .corner.tl { top: 10px; left: 10px; border-width: 1.5px 0 0 1.5px; }
  .corner.tr { top: 10px; right: 10px; border-width: 1.5px 1.5px 0 0; }
  .corner.bl { bottom: 10px; left: 10px; border-width: 0 0 1.5px 1.5px; }
  .corner.br { bottom: 10px; right: 10px; border-width: 0 1.5px 1.5px 0; }
  .seal {
    position: absolute;
    right: 12px;
    bottom: 12px;
    opacity: 0.55;
    transform: rotate(-12deg);
    z-index: 0;
    pointer-events: none;
  }
  .body {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    flex: 1;
    min-height: 0;
    padding-bottom: 2px;
  }
  .head {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: end;
    gap: 4px;
    margin-bottom: 0;
  }
  .vno {
    justify-self: start;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.4px;
    white-space: nowrap;
    padding-bottom: 2px;
    font-family: 'IBM Plex Sans', 'Pyidaungsu', sans-serif;
  }
  .title {
    text-align: center;
    font-family: 'Times New Roman', 'Cormorant Garamond', serif;
    font-size: 24px;
    font-weight: 600;
    letter-spacing: 1px;
    line-height: 1;
  }
  .title-line {
    width: 40px;
    height: 2px;
    margin: 6px auto 0;
    background: linear-gradient(90deg, transparent, #111, transparent);
  }
  .time {
    justify-self: end;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    padding-bottom: 2px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .top {
    flex-shrink: 0;
  }
  .rule {
    height: 1px;
    background: linear-gradient(90deg, transparent, #111, transparent);
    opacity: 0.35;
    margin-top: 10px;
  }
  .fields {
    display: flex;
    flex-direction: column;
    gap: 14px;
    flex: 0 0 auto;
  }
  .row {
    display: grid;
    grid-template-columns: 16px 72px 10px minmax(0, 1fr);
    align-items: end;
    gap: 2px;
    font-size: 13px;
    line-height: 1.35;
  }
  .ico {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 3px;
  }
  .label { font-weight: 700; }
  .sep { text-align: center; }
  .value {
    font-weight: 500;
    border-bottom: 1px dotted #999;
    min-height: 16px;
    padding-bottom: 2px;
    word-break: break-word;
  }
  .weights-wrap {
    display: flex;
    justify-content: center;
    margin-top: 0;
  }
  .weights {
    width: 100%;
    max-width: 2.35in;
    border-collapse: collapse;
  }
  .weights th,
  .weights td {
    border: 2px solid #111;
    text-align: center;
    padding: 6px 4px;
  }
  .weights th {
    font-size: 12px;
    font-weight: 700;
    background: #f5f5f5;
  }
  .weights td {
    font-size: 17px;
    font-weight: 700;
    min-width: 0.65in;
  }
  .thanks {
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    margin-top: 0;
    padding: 0;
    letter-spacing: 0.3px;
    flex-shrink: 0;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="slip">
      <div class="corner tl"></div>
      <div class="corner tr"></div>
      <div class="corner bl"></div>
      <div class="corner br"></div>
      <div class="seal" aria-hidden="true">
        <svg width="42" height="42" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="#111" stroke-opacity="0.18" stroke-width="1.2"/>
          <circle cx="32" cy="32" r="22" stroke="#111" stroke-opacity="0.12" stroke-width="1"/>
          <path d="M32 14 L36 28 L50 28 L39 37 L43 51 L32 42 L21 51 L25 37 L14 28 L28 28 Z"
            fill="#111" fill-opacity="0.08" stroke="#111" stroke-opacity="0.2" stroke-width="0.8" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="body">
        <div class="top">
          <div class="head">
            <div class="vno">${esc(data.voucherNo)}</div>
            <div>
              <div class="title">Voucher</div>
              <div class="title-line"></div>
            </div>
            <div class="time">${ICO.clock}<span>${esc(data.time)}</span></div>
          </div>
          <div class="rule"></div>
        </div>
        <div class="fields">
          ${fieldRow(ICO.calendar, 'ရက်စွဲ', data.date)}
          ${fieldRow(ICO.user, 'အမည်', data.name)}
          ${fieldRow(ICO.id, 'မှတ်ပုံတင်', data.nrc)}
          ${fieldRow(ICO.pin, 'နေရပ်', data.address)}
          ${fieldRow(ICO.phone, 'ဖုန်းနံပါတ်', data.phone)}
        </div>
        <div class="weights-wrap">
          <table class="weights">
            <thead>
              <tr><th>ကျပ်</th><th>ပဲ</th><th>ရွေး</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>${esc(data.kyat)}</td>
                <td>${esc(data.pe)}</td>
                <td>${esc(data.yway)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="thanks">ကျေးဇူးတင်ပါသည်။</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Print only the voucher slip at the chosen page size (default 4in × 6in).
 * Opens a blank-titled print window so shop name never appears in headers.
 */
export function printVoucher(size: PrintSize = 'M', data?: VoucherPrintData): void {
  if (!data) return;

  const prevTitle = document.title;
  document.title = '\u00A0';

  const html = buildVoucherHtml(size, data);
  const p = PAGE[size];

  // Visible off-screen frame — WebView2 prints this document, not the app shell.
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', ' ');
  Object.assign(iframe.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: p.width,
    height: p.height,
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-1',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.title = prevTitle;
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();
  try {
    doc.title = '\u00A0';
  } catch {
    /* ignore */
  }

  const cleanup = () => {
    document.title = prevTitle;
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  const run = () => {
    try {
      win.focus();
      win.print();
    } finally {
      window.setTimeout(cleanup, 2000);
    }
  };

  // Wait for layout; fonts fall back to system Myanmar Text on Windows.
  window.setTimeout(run, 200);
}
