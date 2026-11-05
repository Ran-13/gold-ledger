import {
  hasMyanmar,
  isZawgyiLikely,
  toUnicodeMy,
  uni2zg,
  zg2uni,
} from './myanmarText';

/** Non-text controls — number fields skip (caret fights on Windows). */
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

type FieldState = {
  /** Sticky Zawgyi typing session for this field. */
  zgMode: boolean;
  /** Source Zawgyi string while zgMode (keyboard strokes accumulate here). */
  rawZg: string;
  /** Last Unicode we wrote into the field. */
  lastUni: string;
};

const fieldState = new WeakMap<HTMLInputElement | HTMLTextAreaElement, FieldState>();

function shouldConvert(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el.disabled || el.readOnly) return false;
  if (el.dataset.noZg === '1' || el.dataset.noZg === 'true') return false;
  if (el.classList.contains('num')) return false;
  if (el instanceof HTMLInputElement) {
    const type = (el.type || 'text').toLowerCase();
    if (SKIP_TYPES.has(type)) return false;
    const mode = (el.inputMode || '').toLowerCase();
    if (mode === 'numeric' || mode === 'decimal' || mode === 'tel') return false;
  }
  return true;
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, 'value');
  desc?.set?.call(el, value);
}

function placeCaret(el: HTMLInputElement | HTMLTextAreaElement, pos: number): void {
  if (typeof el.setSelectionRange !== 'function') return;
  const p = Math.max(0, Math.min(pos, el.value.length));
  try {
    el.setSelectionRange(p, p);
  } catch {
    /* some input types reject selection */
  }
}

function getState(el: HTMLInputElement | HTMLTextAreaElement): FieldState {
  let st = fieldState.get(el);
  if (!st) {
    st = { zgMode: false, rawZg: '', lastUni: el.value };
    fieldState.set(el, st);
  }
  return st;
}

/**
 * Live Zawgyi keyboard → Unicode.
 * Keeps a raw Zawgyi buffer while typing so each keystroke doesn't
 * mix encodings (which breaks detectors / corrupts Unicode).
 */
function applyLiveConvert(el: HTMLInputElement | HTMLTextAreaElement): void {
  const val = el.value;
  const st = getState(el);

  if (!hasMyanmar(val)) {
    st.zgMode = false;
    st.rawZg = '';
    st.lastUni = val;
    return;
  }

  // Enter / stay in Zawgyi session
  if (!st.zgMode) {
    if (!isZawgyiLikely(val)) {
      st.lastUni = val;
      return;
    }
    st.zgMode = true;
    st.rawZg = val;
    const uni = zg2uni(st.rawZg);
    if (uni !== val) {
      setNativeValue(el, uni);
      placeCaret(el, uni.length);
    }
    st.lastUni = uni;
    return;
  }

  // --- zgMode: accumulate Zawgyi strokes against last Unicode snapshot ---

  // Typed / pasted at end (most common)
  if (val.startsWith(st.lastUni)) {
    const suffix = val.slice(st.lastUni.length);
    if (!suffix) {
      st.lastUni = val;
      return;
    }
    st.rawZg += suffix;
    const uni = zg2uni(st.rawZg);
    setNativeValue(el, uni);
    placeCaret(el, uni.length);
    st.lastUni = uni;
    return;
  }

  // Deleted from end
  if (st.lastUni.startsWith(val)) {
    // Shrink raw until converted length fits, then re-sync
    let guard = 0;
    while (
      st.rawZg.length > 0 &&
      zg2uni(st.rawZg) !== val &&
      zg2uni(st.rawZg).length > val.length &&
      guard++ < 400
    ) {
      st.rawZg = st.rawZg.slice(0, -1);
    }
    if (zg2uni(st.rawZg) !== val) {
      // Mid-string delete or mismatch — rebuild from Unicode display
      st.rawZg = uni2zg(val);
    }
    const uni = zg2uni(st.rawZg);
    if (uni !== el.value) {
      const caret = el.selectionStart ?? uni.length;
      setNativeValue(el, uni);
      placeCaret(el, Math.min(caret, uni.length));
    }
    st.lastUni = uni;
    return;
  }

  // Insert / edit in the middle, or select-replace
  if (isZawgyiLikely(val)) {
    st.rawZg = val;
  } else {
    // Treat as Unicode edit: rebuild Zawgyi mirror from current Unicode
    st.rawZg = uni2zg(val);
  }
  const uni = zg2uni(st.rawZg);
  const caret = el.selectionStart ?? uni.length;
  if (uni !== val) {
    setNativeValue(el, uni);
    placeCaret(el, Math.min(caret, uni.length));
  }
  st.lastUni = uni;
}

function onFocusIn(e: Event): void {
  const t = e.target;
  if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
  if (!shouldConvert(t)) return;
  const val = t.value;
  const zg = hasMyanmar(val) && isZawgyiLikely(val);
  fieldState.set(t, {
    zgMode: zg,
    rawZg: zg ? val : hasMyanmar(val) ? uni2zg(val) : '',
    lastUni: zg ? zg2uni(val) : val,
  });
  if (zg) {
    const uni = zg2uni(val);
    if (uni !== val) {
      setNativeValue(t, uni);
      // Let React pick this up
      t.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
}

function onFocusOut(e: Event): void {
  const t = e.target;
  if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
  if (!shouldConvert(t)) return;
  // Final safety convert (paste leftover / exited mid-syllable)
  const next = toUnicodeMy(t.value);
  if (next !== t.value) {
    setNativeValue(t, next);
    t.dispatchEvent(new Event('input', { bubbles: true }));
  }
  fieldState.delete(t);
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
    applyLiveConvert(t);
  };

  document.addEventListener('input', onInput, true);
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  return () => {
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('focusout', onFocusOut, true);
  };
}
