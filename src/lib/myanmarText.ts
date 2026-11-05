import './bufferPolyfill';
import myanmarTools from 'myanmar-tools';

const { ZawgyiDetector, ZawgyiConverter } = myanmarTools;

const detector = new ZawgyiDetector();
const converter = new ZawgyiConverter();

/** Myanmar (and extended) code points that Zawgyi also occupies. */
const MYANMAR_RE = /[\u1000-\u109F\uAA60-\uAA7F\uA9E0-\uA9FF]/;

/**
 * If text is Zawgyi (or Zawgyi-majority), convert to Unicode.
 * Leaves Unicode / Latin / digits unchanged.
 */
export function toUnicodeMy(text: string): string {
  if (!text || !MYANMAR_RE.test(text)) return text;
  const p = detector.getZawgyiProbability(text);
  if (!(p >= 0.5)) return text;
  return converter.zawgyiToUnicode(text);
}
