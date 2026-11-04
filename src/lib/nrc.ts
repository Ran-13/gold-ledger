import raw from './nrc-data.json';

export type NrcState = {
  id: string;
  code: string;
  number: { en: string; mm: string };
  name: { en: string; mm: string };
};

export type NrcTownship = {
  id: string;
  code: string;
  short: { en: string; mm: string };
  name: { en: string; mm: string };
  stateId: string;
  stateCode: string;
};

export type NrcType = {
  id: string;
  name: { en: string; mm: string };
};

const data = raw as {
  nrcStates: NrcState[];
  nrcTownships: NrcTownship[];
  nrcTypes: NrcType[];
};

/** States 1–14 only (exclude Nay Pyi Taw 9*) */
export const NRC_STATES = data.nrcStates
  .filter((s) => /^\d{1,2}$/.test(s.number.en))
  .sort((a, b) => Number(a.number.en) - Number(b.number.en));

export const NRC_TYPES = data.nrcTypes;

export const NRC_TOWNSHIPS = data.nrcTownships;

/** Default for this shop — မန္တလေး / သာစည် */
export const DEFAULT_NRC_STATE = '9';
export const DEFAULT_NRC_TOWNSHIP_SHORT = 'သစန';
export const DEFAULT_NRC_TYPE = 'နိုင်';
/** Prefix without serial — `9/သစန(နိုင်)` */
export const DEFAULT_NRC = `${DEFAULT_NRC_STATE}/${DEFAULT_NRC_TOWNSHIP_SHORT}(${DEFAULT_NRC_TYPE})`;

/** သာစည်နှင့် အနီးတဝိုက် — state 9 စာရင်းထိပ် */
const STATE9_NEAR_THAZI: string[] = [
  'သစန', // သာစည်
  'မထလ', // မိတ္ထီလာ
  'ဝတန', // ဝမ်းတွင်း
  'မလန', // မလှိုင်
  'ပဘန', // ပျော်ဘွယ်
  'ကဆန', // ကျောက်ဆည်
  'တသန', // တောင်သာ
  'နထက', // နွားထိုးကြီး
  'မခန', // မြင်းခြံ
  'ရမသ', // ရမည်းသင်း
  'စကတ', // စဉ့်ကိုင်
  'တတဥ', // တံတားဦး
  'မသန', // မြစ်သား
  'ငဇန', // ငါန်းဇွန်
];

function nearThaziRank(shortMm: string): number {
  const i = STATE9_NEAR_THAZI.indexOf(shortMm);
  return i >= 0 ? i : STATE9_NEAR_THAZI.length;
}

export function townshipsForState(stateCode: string): NrcTownship[] {
  const list = NRC_TOWNSHIPS.filter((t) => t.stateCode === stateCode);
  if (stateCode === DEFAULT_NRC_STATE) {
    return list.sort((a, b) => {
      const ra = nearThaziRank(a.short.mm);
      const rb = nearThaziRank(b.short.mm);
      if (ra !== rb) return ra - rb;
      return a.short.mm.localeCompare(b.short.mm, 'my');
    });
  }
  return list.sort((a, b) => a.short.mm.localeCompare(b.short.mm, 'my'));
}

export function defaultTownshipForState(stateCode: string): NrcTownship | null {
  const list = townshipsForState(stateCode);
  if (stateCode === DEFAULT_NRC_STATE) {
    return list.find((t) => t.short.mm === DEFAULT_NRC_TOWNSHIP_SHORT) ?? list[0] ?? null;
  }
  return null;
}

export function formatNrc(
  stateEn: string,
  townshipShortMm: string,
  typeMm: string,
  serial: string,
): string {
  const digits = serial.replace(/\D/g, '').slice(0, 6);
  if (!stateEn || !townshipShortMm || !typeMm) return '';
  if (!digits) return `${stateEn}/${townshipShortMm}(${typeMm})`;
  return `${stateEn}/${townshipShortMm}(${typeMm})${digits}`;
}

export type NrcParts = {
  stateEn: string;
  townshipId: string;
  townshipShortMm: string;
  typeMm: string;
  serial: string;
};

const NRC_RE = /^(\d{1,2})\/([^(]+)\(([^)]+)\)(\d{0,6})$/;

export function parseNrc(value: string): NrcParts | null {
  const m = String(value || '')
    .trim()
    .replace(/\s/g, '')
    .match(NRC_RE);
  if (!m) return null;
  const stateEn = m[1]!;
  const townshipShortMm = m[2]!;
  const typeMm = m[3]!;
  const serial = m[4] || '';
  const list = townshipsForState(stateEn);
  const match =
    list.find((t) => t.short.mm === townshipShortMm) ??
    list.find((t) => t.short.mm.replace(/\s/g, '') === townshipShortMm);
  return {
    stateEn,
    townshipId: match?.id ?? '',
    townshipShortMm,
    typeMm,
    serial,
  };
}

export function isNrcComplete(value: string): boolean {
  const p = parseNrc(value);
  return !!p && p.serial.length === 6 && !!p.townshipShortMm && !!p.typeMm;
}

/** Normalize for uniqueness compare */
export function normalizeNrcKey(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .replace(/\s/g, '');
}
