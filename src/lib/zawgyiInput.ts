import { toUnicodeMy } from './myanmarText';

/** Non-text controls only — password / tel / number / email all convert too. */
const SKIP_TYPES = new Set([
  'date',
  'datetime-local',
  'time',
  'month',
  'week',
  'checkbox',
  'radio',
  'file',
  'color',
  'range',
  'hidden',
  'button',
  'submit',
  'reset',
  'image',
]);

function shouldConvert(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el.disabled || el.readOnly) return false;
  if (el.dataset.noZg === '1' || el.dataset.noZg === 'true') return false;
  // Number fields: skip — converter fights caret/delete on Windows.
  if (el.classList.contains('num')) return false;
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase();
    if (SKIP_TYPES.has(type)) return false;
    const mode = (el.inputMode || '').toLowerCase();
    if (mode === 'numeric' || mode === 'decimal' || mode === 'tel') return false;
  }
  return true;
}

function applyUnicode(el: HTMLInputElement | HTMLTextAreaElement): void {
  const before = el.value;
  const next = toUnicodeMy(before);
  if (next === before) return;

  const start = el.selectionStart;
  const end = el.selectionEnd;
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, next);

  if (start != null && end != null && typeof el.setSelectionRange === 'function') {
    // Typing is usually at the end; clamp if Zawgyi→Unicode changed length.
    const ns = Math.min(start, next.length);
    const ne = Math.min(end, next.length);
    try {
      el.setSelectionRange(ns, ne);
    } catch {
      /* some input types reject selection */
    }
  }
}

/**
 * Capture-phase listener so React controlled inputs receive Unicode
 * (Zawgyi keyboard / paste → Unicode on screen and in state).
 */
export function installZawgyiToUnicodeInputs(): () => void {
  const onInput = (e: Event) => {
    if (e instanceof InputEvent && e.isComposing) return;
    const t = e.target;
    if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
    if (!shouldConvert(t)) return;
    applyUnicode(t);
  };

  document.addEventListener('input', onInput, true);
  return () => document.removeEventListener('input', onInput, true);
}
