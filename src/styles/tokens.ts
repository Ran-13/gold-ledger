export const colors = {
  ink: '#1B2A41',
  navyBorder: '#34486B',
  navyInput: '#24365A',
  /** Light text on navy — white, not grey */
  mutedOnNavy: '#FFFFFF',
  gold: '#D9A93A',
  goldHover: '#E6BA55',
  goldNav: '#E0AA3E',
  goldOnNavy: '#F0C35A',
  goldDark: '#9A6B12',
  goldLight: '#FFFFFF',
  goldWash: '#FFFFFF',
  white: '#FFFFFF',
  /** Body / label text — black only (no grey fonts) */
  muted: '#1B2A41',
  muted2: '#1B2A41',
  cardBorder: '#D0D5DC',
  rowDivider: '#E8EBEF',
  inputBorder: '#D5DAE1',
  segmentTrack: '#EEF0F3',
  buyBar: '#9AA6B8',
  buyBarSoft: '#C9CFDA',
  sell: '#1F7A4D',
  sellPillBg: '#E2F0E8',
  buy: '#B23A2A',
  buyPillBg: '#F8E4E0',
  voucherGold: '#C99A35',
  voucherMuted: '#1B2A41',
  voucherLine: '#DCCDAE',
  voucherDash: '#C9B790',
  voucherSig: '#1B2A41',
  softRow: '#FFFFFF',
  softBg: '#FFFFFF',
  borderSoft: '#D0D5DC',
} as const;

export const fonts = {
  latin: "'IBM Plex Sans', sans-serif",
  myanmar: "'Pyidaungsu', sans-serif",
  both: "'Pyidaungsu', 'IBM Plex Sans', sans-serif",
} as const;

export const radii = {
  input: 8,
  button: 8,
  card: 12,
  segment: 8,
} as const;

/** Sidebar brand row + top price strip — keep aligned */
export const TOP_BAR_HEIGHT = 88;

/** Thin black card edge — no heavy shadow */
export const cardShadow = 'none';

export const MONTHS_MY = [
  'ဇန်နဝါရီ',
  'ဖေဖော်ဝါရီ',
  'မတ်',
  'ဧပြီ',
  'မေ',
  'ဇွန်',
  'ဇူလိုင်',
  'ဩဂုတ်',
  'စက်တင်ဘာ',
  'အောက်တိုဘာ',
  'နိုဝင်ဘာ',
  'ဒီဇင်ဘာ',
] as const;
