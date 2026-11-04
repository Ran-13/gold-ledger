import type { PrintSize } from '../db/types';

export type { PrintSize };

/**
 * Page size for each option.
 * ပုံမှန် (M) = shop slip 4in × 6in (width × height).
 */
const PAGE: Record<PrintSize, { size: string; width: string; height: string; pad: string }> = {
  S: { size: '3.5in 5in', width: '3.5in', height: '5in', pad: '8px 10px 10px' },
  M: { size: '4in 6in', width: '4in', height: '6in', pad: '10px 12px 12px' },
  L: { size: '5in 7in', width: '5in', height: '7in', pad: '12px 14px 14px' },
};

export const PRINT_SIZE_OPTIONS: { value: PrintSize; label: string }[] = [
  { value: 'S', label: 'သေး' },
  { value: 'M', label: 'ပုံမှန်' },
  { value: 'L', label: 'ကြီး' },
];

function pickPrintRoot(): HTMLElement | null {
  const dialogRoot = document.querySelector(
    '[role="dialog"][aria-label="ဘောင်ချာ"] [data-print-root]',
  ) as HTMLElement | null;
  if (dialogRoot) return dialogRoot;
  return document.querySelector('[data-print-root]') as HTMLElement | null;
}

function printCss(size: PrintSize): string {
  const p = PAGE[size];
  return `
    @page {
      size: ${p.size};
      margin: 0;
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      width: ${p.width};
      height: ${p.height};
      overflow: hidden !important;
      font-family: 'Pyidaungsu', 'IBM Plex Sans', sans-serif;
      color: #111;
    }
    [data-print-root] {
      width: ${p.width} !important;
      height: ${p.height} !important;
      max-width: ${p.width} !important;
      max-height: ${p.height} !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      box-shadow: none !important;
      border: 1px solid #111 !important;
      background: #fff !important;
    }
    [data-print-root] > div {
      width: calc(100% - 10px) !important;
      height: calc(100% - 10px) !important;
      max-width: none !important;
      max-height: none !important;
      min-height: 0 !important;
      margin: 5px !important;
      padding: ${p.pad} !important;
      overflow: hidden !important;
      border: 1px solid #111 !important;
      background: #fff !important;
      position: relative !important;
    }
  `;
}

function fitSlipContent(doc: Document): void {
  const shell = doc.querySelector('[data-print-root] > div') as HTMLElement | null;
  if (!shell) return;
  const content = Array.from(shell.children).find((el) => {
    const s = (el as HTMLElement).style;
    return s.position === 'relative' && (s.zIndex === '1' || getComputedStyle(el).zIndex === '1');
  }) as HTMLElement | undefined;
  const target = content ?? shell;
  const availH = shell.clientHeight;
  const availW = shell.clientWidth;
  const needH = target.scrollHeight;
  const needW = target.scrollWidth;
  if (availH <= 0 || availW <= 0) return;
  const scale = Math.min(1, availH / needH, availW / needW);
  if (scale < 0.999) {
    target.style.transformOrigin = 'top center';
    target.style.transform = `scale(${scale})`;
    target.style.width = '100%';
  }
}

/**
 * Print only the voucher slip at the chosen page size (default 4in × 6in).
 * Uses a dedicated iframe so ledger/lists never appear in the printout.
 */
export function printVoucher(size: PrintSize = 'M'): void {
  const root = pickPrintRoot();
  if (!root) return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'voucher-print');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  const fontLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map((n) => n.outerHTML)
    .join('\n');
  const fontFaces = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || [])
          .filter((r) => r instanceof CSSFontFaceRule)
          .map((r) => r.cssText)
          .join('\n');
      } catch {
        return '';
      }
    })
    .filter(Boolean)
    .join('\n');

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="my">
<head>
<meta charset="utf-8" />
<title> </title>
${fontLinks}
<style>
${fontFaces}
${printCss(size)}
</style>
</head>
<body>
${root.outerHTML}
</body>
</html>`);
  doc.close();

  // Size the iframe so layout metrics match the slip (0×0 would break fit)
  const p = PAGE[size];
  iframe.style.width = p.width;
  iframe.style.height = p.height;

  const cleanup = () => {
    try {
      iframe.remove();
    } catch {
      /* ignore */
    }
  };

  const run = () => {
    fitSlipContent(doc);
    try {
      win.focus();
      win.print();
    } finally {
      window.setTimeout(cleanup, 1500);
    }
  };

  window.setTimeout(run, 280);
}
