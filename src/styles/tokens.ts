export const colors = {
  ink: '#0F1A2B',
  navyBorder: '#243552',
  navyInput: '#1A2B48',
  /** Light text on navy — white, not grey */
  mutedOnNavy: '#FFFFFF',
  gold: '#C9921E',
  goldHover: '#D9A93A',
  goldNav: '#D4A020',
  goldOnNavy: '#F0C35A',
  goldDark: '#7A5208',
  goldLight: '#FFFFFF',
  goldWash: '#FFFFFF',
  white: '#FFFFFF',
  /** Body / label text — near-black for contrast */
  muted: '#0F1A2B',
  muted2: '#1B2A41',
  /** Borders — soft cool grey (clean on white, not muddy) */
  cardBorder: '#D2D7DE',
  rowDivider: '#E8EBEF',
  inputBorder: '#9AA3B0',
  segmentTrack: '#EEF0F3',
  buyBar: '#9AA6B8',
  buyBarSoft: '#C9CFDA',
  sell: '#0F6B3C',
  sellPillBg: '#D5EDE0',
  buy: '#9E2A1C',
  buyPillBg: '#F5D8D2',
  voucherGold: '#C99A35',
  voucherMuted: '#0F1A2B',
  voucherLine: '#DCCDAE',
  voucherDash: '#C9B790',
  voucherSig: '#0F1A2B',
  softRow: '#FFFFFF',
  softBg: '#FFFFFF',
  borderSoft: '#D2D7DE',
} as const;

export const fonts = {
  latin: "'IBM Plex Sans', sans-serif",
  myanmar: "'Pyidaungsu', sans-serif",
  both: "'Pyidaungsu', 'IBM Plex Sans', sans-serif",
} as const;

/**
 * Radius scale — softer controls/buttons/inputs site-wide
 */
export const radii = {
  /** Badges / pills / table chips */
  xs: 6,
  /** Compact row buttons, filter chips */
  sm: 10,
  /** Inputs, primary buttons, segmented */
  md: 12,
  /** Cards, stat strips, panels */
  lg: 12,
  /** Dialogs / large sheets */
  xl: 16,
  // Semantic aliases used across the app
  pill: 8,
  input: 10,
  button: 12,
  segment: 12,
  card: 12,
  dialog: 16,
} as const;

/** Sidebar brand row + top price strip — keep aligned */
export const TOP_BAR_HEIGHT = 88;

/** Thin card edge — no heavy shadow */
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
