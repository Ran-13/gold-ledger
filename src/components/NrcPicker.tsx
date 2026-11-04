import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  DEFAULT_NRC,
  DEFAULT_NRC_STATE,
  DEFAULT_NRC_TYPE,
  NRC_STATES,
  NRC_TYPES,
  defaultTownshipForState,
  formatNrc,
  parseNrc,
  townshipsForState,
  type NrcTownship,
} from '../lib/nrc';
import { D, type DigitsMode } from '../lib/units';
import { colors, radii } from '../styles/tokens';

function townshipLabel(t: NrcTownship, dups: Set<string>): string {
  // Keep closed select looking like real NRC (short code only)
  if (dups.has(t.short.mm)) return `${t.short.mm} (${t.name.mm})`;
  return t.short.mm;
}

function applyDefaultParts(): {
  stateEn: string;
  townshipId: string;
  typeMm: string;
  township: NrcTownship | null;
} {
  const township = defaultTownshipForState(DEFAULT_NRC_STATE);
  return {
    stateEn: DEFAULT_NRC_STATE,
    townshipId: township?.id ?? '',
    typeMm: DEFAULT_NRC_TYPE,
    township,
  };
}

export function NrcPicker({
  value,
  onChange,
  digits = 'latin',
  height = 40,
  inputStyle,
}: {
  value: string;
  onChange: (nrc: string) => void;
  digits?: DigitsMode;
  height?: number;
  inputStyle?: CSSProperties;
}) {
  const initial = applyDefaultParts();
  const [stateEn, setStateEn] = useState(initial.stateEn);
  const [townshipId, setTownshipId] = useState(initial.townshipId);
  const [typeMm, setTypeMm] = useState(initial.typeMm);
  const [serial, setSerial] = useState('');
  const lastEmitted = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (value.trim()) return;
    if (lastEmitted.current === DEFAULT_NRC) return;
    const d = applyDefaultParts();
    setStateEn(d.stateEn);
    setTownshipId(d.townshipId);
    setTypeMm(d.typeMm);
    setSerial('');
    lastEmitted.current = DEFAULT_NRC;
    onChangeRef.current(DEFAULT_NRC);
  }, [value]);

  useEffect(() => {
    if (!value.trim()) return;
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    const p = parseNrc(value);
    if (!p) return;
    setStateEn(p.stateEn);
    setTownshipId(p.townshipId);
    setTypeMm(p.typeMm || DEFAULT_NRC_TYPE);
    setSerial(p.serial);
  }, [value]);

  const townships = useMemo(
    () => (stateEn ? townshipsForState(stateEn) : []),
    [stateEn],
  );

  const shortDups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of townships) {
      counts.set(t.short.mm, (counts.get(t.short.mm) ?? 0) + 1);
    }
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([k]) => k));
  }, [townships]);

  const selectedTownship = townships.find((t) => t.id === townshipId) ?? null;

  const emit = (
    nextState: string,
    nextTownship: NrcTownship | null,
    nextType: string,
    nextSerial: string,
  ) => {
    const next = formatNrc(
      nextState,
      nextTownship?.short.mm ?? '',
      nextType,
      nextSerial,
    );
    lastEmitted.current = next;
    onChange(next);
  };

  const h = height;
  const fontSize = h <= 42 ? 15 : 16;

  const shell: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'stretch',
    minWidth: 0,
    boxSizing: 'border-box',
    border: `1.5px solid ${colors.navyBorder}`,
    borderRadius: radii.input,
    background: colors.white,
    overflow: 'hidden',
    ...inputStyle,
    // Keep shell chrome; drop conflicting padding/height/width from dialogField
    padding: 0,
    width: 'fit-content',
    maxWidth: '100%',
    height: h,
  };

  const cell: CSSProperties = {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: colors.ink,
    fontSize,
    fontWeight: 700,
    fontFamily: 'inherit',
    lineHeight: 1.3,
    height: '100%',
    margin: 0,
    cursor: 'pointer',
  };

  const sep: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: '0 0 auto',
    padding: '0 2px',
    color: colors.muted2,
    fontSize: fontSize + 1,
    fontWeight: 600,
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const divider: CSSProperties = {
    width: 1,
    alignSelf: 'stretch',
    background: colors.rowDivider,
    flex: '0 0 auto',
  };

  return (
    <div style={shell} data-nrc-picker="">
      <select
        aria-label="ပြည်နယ်ကုဒ်"
        value={stateEn}
        onChange={(e) => {
          const next = e.target.value;
          const preferred = defaultTownshipForState(next);
          setStateEn(next);
          setTownshipId(preferred?.id ?? '');
          emit(next, preferred, typeMm, serial);
        }}
        style={{
          ...cell,
          flex: '0 0 44px',
          padding: '0 4px 0 8px',
          textAlign: 'center',
          textAlignLast: 'center',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%236B7486' d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 5px center',
          paddingRight: 16,
        }}
      >
        <option value="">—</option>
        {NRC_STATES.map((s) => (
          <option key={s.id} value={s.number.en}>
            {D(s.number.en, digits)}
          </option>
        ))}
      </select>

      <span style={sep}>/</span>

      <select
        aria-label="မြို့နယ်"
        value={townshipId}
        disabled={!stateEn}
        onChange={(e) => {
          const id = e.target.value;
          setTownshipId(id);
          const t = townships.find((x) => x.id === id) ?? null;
          emit(stateEn, t, typeMm, serial);
        }}
        style={{
          ...cell,
          flex: '1 1 64px',
          minWidth: 0,
          maxWidth: 88,
          padding: '0 16px 0 4px',
          color: stateEn ? colors.ink : colors.muted2,
          cursor: stateEn ? 'pointer' : 'not-allowed',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%236B7486' d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 5px center',
        }}
      >
        <option value="">—</option>
        {townships.map((t) => (
          <option key={t.id} value={t.id}>
            {townshipLabel(t, shortDups)}
          </option>
        ))}
      </select>

      <span style={sep}>(</span>

      <select
        aria-label="အမျိုးအစား"
        value={typeMm}
        onChange={(e) => {
          const next = e.target.value;
          setTypeMm(next);
          emit(stateEn, selectedTownship, next, serial);
        }}
        style={{
          ...cell,
          flex: '0 0 58px',
          padding: '0 14px 0 2px',
          textAlign: 'center',
          textAlignLast: 'center',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%236B7486' d='M1 1l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 4px center',
        }}
      >
        {NRC_TYPES.map((t) => (
          <option key={t.id} value={t.name.mm}>
            {t.name.mm}
          </option>
        ))}
      </select>

      <span style={sep}>)</span>

      <div style={divider} />

      <input
        aria-label="နံပါတ်"
        className="num"
        inputMode="numeric"
        maxLength={6}
        placeholder={D('000000', digits)}
        value={D(serial, digits)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d၀-၉]/g, '');
          const latin = raw
            .split('')
            .map((ch) => {
              const i = '၀၁၂၃၄၅၆၇၈၉'.indexOf(ch);
              return i >= 0 ? String(i) : ch;
            })
            .join('')
            .replace(/\D/g, '')
            .slice(0, 6);
          setSerial(latin);
          emit(stateEn, selectedTownship, typeMm, latin);
        }}
        style={{
          ...cell,
          flex: '1 1 72px',
          minWidth: 72,
          maxWidth: 96,
          cursor: 'text',
          letterSpacing: '0.1em',
          textAlign: 'center',
          padding: '0 6px',
          fontVariantNumeric: 'tabular-nums',
        }}
      />
    </div>
  );
}
