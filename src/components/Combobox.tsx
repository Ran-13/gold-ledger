import { useMemo, useState } from 'react';
import type { Customer } from '../db/types';
import { isNrcComplete, normalizeNrcKey } from '../lib/nrc';
import { D, DigitsMode } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { formInput } from './FormRow';
import { IconId, IconMapPin, IconPhone, IconUser } from './Icons';
import { NrcPicker } from './NrcPicker';

const labelStyle = {
  fontSize: 15,
  fontWeight: 700,
  color: colors.muted,
  letterSpacing: '0.01em',
  lineHeight: 1.45,
} as const;

const fieldH = 46;

export function CustomerCombobox({
  customers,
  query,
  customerId,
  newPhone,
  newNrc,
  newAddress,
  digits,
  onQuery,
  onSelect,
  onNewPhone,
  onNewNrc,
  onNewAddress,
}: {
  customers: Customer[];
  query: string;
  customerId: number | null;
  newPhone: string;
  newNrc: string;
  newAddress: string;
  digits: DigitsMode;
  onQuery: (q: string) => void;
  onSelect: (c: Customer) => void;
  onNewPhone: (p: string) => void;
  onNewNrc: (n: string) => void;
  onNewAddress: (a: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const ql = query.trim().toLowerCase();
  const sel = customers.find((c) => c.id === customerId) ?? null;
  const isNew = !!ql && !sel;

  const sug = useMemo(
    () =>
      customers
        .filter(
          (c) =>
            !ql ||
            c.name.toLowerCase().includes(ql) ||
            (c.phone || '').includes(ql) ||
            (c.nrc || '').toLowerCase().includes(ql) ||
            (c.address || '').toLowerCase().includes(ql),
        )
        .slice(0, 8),
    [customers, ql],
  );

  const nrcDup = useMemo(() => {
    if (!isNew || !isNrcComplete(newNrc)) return null;
    const key = normalizeNrcKey(newNrc);
    return customers.find((c) => normalizeNrcKey(c.nrc) === key) ?? null;
  }, [customers, isNew, newNrc]);

  const show = open && sug.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <IconUser size={15} />
          ဝယ်သူအမည်
        </span>
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={(e) => {
              onQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 140)}
            placeholder="အမည် ရိုက်ရှာပါ / အသစ်ရိုက်ထည့်ပါ"
            style={{ ...formInput, height: fieldH, fontSize: 18, fontWeight: 600 }}
          />
          {show && (
            <div
              style={{
                position: 'absolute',
                top: fieldH + 4,
                left: 0,
                right: 0,
                zIndex: 20,
                background: colors.white,
                border: `1.5px solid ${colors.cardBorder}`,
                borderRadius: radii.card,
                boxShadow: '0 10px 28px rgba(27,42,65,.12)',
                maxHeight: 300,
                overflow: 'auto',
                padding: 4,
              }}
            >
              {sug.map((c) => {
                const key = `c-${c.id}`;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelect(c);
                      setOpen(false);
                    }}
                    onMouseEnter={() => setHoverKey(key)}
                    onMouseLeave={() => setHoverKey(null)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      width: '100%',
                      padding: '12px 14px',
                      border: 'none',
                      borderRadius: radii.button,
                      background: hoverKey === key ? 'rgba(27,42,65,.06)' : 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: 17,
                      color: colors.ink,
                    }}
                  >
                    <span style={{ fontWeight: 700, lineHeight: 1.4 }}>{c.name}</span>
                    <span className="num" style={{ fontSize: 15, color: colors.muted2, lineHeight: 1.45 }}>
                      {[
                        c.phone ? D(c.phone, digits) : null,
                        c.nrc ? D(c.nrc, digits) : null,
                        c.address?.trim() || null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </label>

      {sel && (
        <div style={{ fontSize: 15, color: colors.muted, lineHeight: 1.5, fontWeight: 500 }}>
          {[
            sel.phone ? `ဖုန်း ${D(sel.phone, digits)}` : null,
            sel.nrc ? `မှတ်ပုံတင် ${D(sel.nrc, digits)}` : null,
            sel.address || null,
          ]
            .filter(Boolean)
            .join(' · ') || 'ဝယ်သူဟောင်း'}
        </div>
      )}

      {isNew && (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'nowrap',
              gap: 10,
              alignItems: 'end',
              minWidth: 0,
            }}
          >
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                flex: '0 1 140px',
                minWidth: 110,
              }}
            >
              <span style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconPhone size={15} />
                ဖုန်း
              </span>
              <input
                value={newPhone}
                onChange={(e) => onNewPhone(e.target.value)}
                placeholder="09-…"
                className="num"
                style={{ ...formInput, height: fieldH, fontSize: 17, fontWeight: 600 }}
                required
              />
            </label>
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                flex: '1 1 130px',
                minWidth: 110,
              }}
            >
              <span style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconMapPin size={15} />
                နေရပ်
              </span>
              <input
                value={newAddress}
                onChange={(e) => onNewAddress(e.target.value)}
                placeholder="လိပ်စာ"
                style={{ ...formInput, height: fieldH, fontSize: 17, fontWeight: 600 }}
                required
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '0 0 auto' }}>
              <span style={{ ...labelStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <IconId size={15} />
                မှတ်ပုံတင်
              </span>
              <NrcPicker value={newNrc} onChange={onNewNrc} digits={digits} height={fieldH} />
            </label>
          </div>
          {nrcDup && (
            <div style={{ fontSize: 14, color: '#b42318', lineHeight: 1.5, fontWeight: 600 }}>
              မှတ်ပုံတင်တူ ရှိပြီး —{' '}
              <button
                type="button"
                onClick={() => onSelect(nrcDup)}
                style={{
                  border: 'none',
                  background: 'none',
                  padding: 0,
                  color: colors.ink,
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {nrcDup.name}
              </button>{' '}
              ကို ရွေးပါ
            </div>
          )}
        </>
      )}
    </div>
  );
}
