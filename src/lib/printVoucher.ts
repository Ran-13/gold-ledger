import type { PrintSize } from '../db/types';

export type { PrintSize };

/**
 * Page size for each option.
 * ပုံမှန် (M) = shop slip 4in × 6in (width × height).
 */
const PAGE: Record<PrintSize, { size: string; width: string; height: string }> = {
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

function buildHtml(size: PrintSize, data: VoucherPrintData): string {
  const p = PAGE[size];
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
  html, body {
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
    padding: 0.12in;
  }
  .slip {
    width: 100%;
    height: 100%;
    border: 1.5px solid #111;
    padding: 0.14in 0.16in 0.12in;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .head {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: end;
    gap: 4px;
    margin-bottom: 8px;
  }
  .title {
    text-align: center;
    font-family: 'Times New Roman', 'Cormorant Garamond', serif;
    font-size: 26px;
    font-weight: 600;
    letter-spacing: 1px;
    line-height: 1;
  }
  .title-line {
    width: 40px;
    height: 2px;
    margin: 6px auto 0;
    background: #111;
  }
  .time {
    justify-self: end;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    padding-bottom: 2px;
  }
  .rule {
    height: 1px;
    background: #111;
    opacity: 0.35;
    margin-bottom: 10px;
  }
  .fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1 1 auto;
    min-height: 0;
  }
  .row {
    display: grid;
    grid-template-columns: 78px 10px minmax(0, 1fr);
    align-items: end;
    gap: 2px;
    font-size: 14px;
    line-height: 1.35;
  }
  .label { font-weight: 700; }
  .sep { text-align: center; }
  .value {
    font-weight: 500;
    border-bottom: 1px dotted #999;
    min-height: 18px;
    padding-bottom: 2px;
    word-break: break-word;
  }
  .weights {
    margin: 10px auto 0;
    width: 100%;
    max-width: 2.4in;
    border-collapse: collapse;
  }
  .weights th,
  .weights td {
    border: 1.5px solid #111;
    text-align: center;
    padding: 6px 4px;
  }
  .weights th {
    font-size: 13px;
    font-weight: 700;
    background: #f5f5f5;
  }
  .weights td {
    font-size: 18px;
    font-weight: 700;
    min-width: 0.7in;
  }
  .thanks {
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    margin-top: 12px;
    letter-spacing: 0.3px;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="slip">
      <div class="head">
        <div></div>
        <div>
          <div class="title">Voucher</div>
          <div class="title-line"></div>
        </div>
        <div class="time">${esc(data.time)}</div>
      </div>
      <div class="rule"></div>
      <div class="fields">
        <div class="row"><span class="label">ရက်စွဲ</span><span class="sep">-</span><span class="value">${esc(data.date)}</span></div>
        <div class="row"><span class="label">အမည်</span><span class="sep">-</span><span class="value">${esc(data.name)}</span></div>
        <div class="row"><span class="label">မှတ်ပုံတင်</span><span class="sep">-</span><span class="value">${esc(data.nrc)}</span></div>
        <div class="row"><span class="label">နေရပ်</span><span class="sep">-</span><span class="value">${esc(data.address)}</span></div>
        <div class="row"><span class="label">ဖုန်းနံပါတ်</span><span class="sep">-</span><span class="value">${esc(data.phone)}</span></div>
      </div>
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
      <div class="thanks">ကျေးဇူးတင်ပါသည်။</div>
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

  const html = buildHtml(size, data);
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
