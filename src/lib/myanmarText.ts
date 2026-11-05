import './bufferPolyfill';
import myanmarTools from 'myanmar-tools';

const { ZawgyiDetector, ZawgyiConverter } = myanmarTools;

const detector = new ZawgyiDetector();
const converter = new ZawgyiConverter();

/** Myanmar (and extended) code points that Zawgyi also occupies. */
export const MYANMAR_RE = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;

/**
 * Code points / ranges that strongly indicate Zawgyi (rare or unused in correct Unicode).
 * @see https://github.com/google/myanmar-tools
 */
const ZAWGYI_HINT_RE =
  /[\u1033\u1034\u105A\u1060-\u1090\u1092-\u1097]|\u1031[\u1000-\u1021]|\u108F/;

export function hasMyanmar(text: string): boolean {
  return MYANMAR_RE.test(text);
}

export function zawgyiProbability(text: string): number {
  if (!text || !hasMyanmar(text)) return 0;
  const p = detector.getZawgyiProbability(text);
  return Number.isFinite(p) ? p : 0;
}

/**
 * True when text is likely Zawgyi (keyboard / paste).
 * Hint patterns catch early Zawgyi vowel-before-consonant keystrokes;
 * probability ≥ 0.5 avoids flipping plain Unicode consonants into zg-mode.
 */
export function isZawgyiLikely(text: string): boolean {
  if (!text || !hasMyanmar(text)) return false;
  if (ZAWGYI_HINT_RE.test(text)) return true;
  return zawgyiProbability(text) >= 0.5;
}

export function zg2uni(text: string): string {
  if (!text) return text;
  return converter.zawgyiToUnicode(text);
}

export function uni2zg(text: string): string {
  if (!text) return text;
  return converter.unicodeToZawgyi(text);
}

/**
 * One-shot convert if Zawgyi-like. Safe for paste / blur.
 * Does not use sticky session state.
 */
export function toUnicodeMy(text: string): string {
  if (!text || !hasMyanmar(text)) return text;
  if (!isZawgyiLikely(text)) return text;
  return zg2uni(text);
}
