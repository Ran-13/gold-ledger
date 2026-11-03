import { useMemo, useState } from 'react';
import type { Customer } from '../db/types';
import { D, DigitsMode } from '../lib/units';
import { colors } from '../styles/tokens';
import { FormRow, formInput } from './FormRow';

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
  const [hoverId, setHoverId] = useState<number | null>(null);
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

  const show = open && (sug.length > 0 || isNew);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <FormRow label="ဝယ်သူအမည်" labelWidth={108}>
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              const m = customers.find(
                (c) => c.name.trim().toLowerCase() === v.trim().toLowerCase(),
              );
              onQuery(v);
              if (m) onSelect(m);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            placeholder="အမည် ရိုက်ရှာပါ"
            style={formInput}
          />
          {show && (
            <div
              style={{
                position: 'absolute',
                top: 44,
                left: 0,
                right: 0,
                zIndex: 20,
                background: colors.white,
                border: `1.5px solid ${colors.cardBorder}`,
                borderRadius: 8,
                boxShadow: '0 10px 28px rgba(27,42,65,.12)',
                maxHeight: 240,
                overflow: 'auto',
                padding: 4,
              }}
            >
              {sug.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelect(c);
                    setOpen(false);
                  }}
                  onMouseEnter={() => setHoverId(c.id)}
                  onMouseLeave={() => setHoverId(null)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    borderRadius: 6,
                    background: hoverId === c.id ? 'rgba(27,42,65,.06)' : 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 15,
                    color: colors.ink,
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                  <span className="num" style={{ fontSize: 12, color: colors.muted2 }}>
                    {[c.phone, c.nrc].filter(Boolean).map((x) => D(x!, digits)).join(' · ') || '—'}
                  </span>
                </button>
              ))}
              {isNew && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderTop: sug.length ? `1px solid ${colors.rowDivider}` : 'none',
                    color: colors.ink,
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  + “{query.trim()}” ဝယ်သူအသစ်
                </div>
              )}
            </div>
          )}
        </div>
      </FormRow>

      {/* Existing customer — one compact line */}
      {sel && !isNew && (
        <div style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, paddingLeft: 2 }}>
          {[
            sel.phone ? `ဖုန်း ${D(sel.phone, digits)}` : null,
            sel.nrc ? `မှတ်ပုံတင် ${D(sel.nrc, digits)}` : null,
            sel.address || null,
          ]
            .filter(Boolean)
            .join(' · ') || 'ဝယ်သူဟောင်း'}
        </div>
      )}

      {/* New customer — only fields needed */}
      {isNew && (
        <>
          <FormRow label="ဖုန်းနံပါတ်" labelWidth={108}>
            <input
              value={newPhone}
              onChange={(e) => onNewPhone(e.target.value)}
              placeholder="09-…"
              className="num"
              style={formInput}
              required
            />
          </FormRow>
          <FormRow label="နေရပ်လိပ်စာ" labelWidth={108}>
            <input
              value={newAddress}
              onChange={(e) => onNewAddress(e.target.value)}
              placeholder="နေရပ်လိပ်စာ ထည့်ပါ"
              style={formInput}
              required
            />
          </FormRow>
          <FormRow label="မှတ်ပုံတင်" labelWidth={108}>
            <input
              value={newNrc}
              onChange={(e) => onNewNrc(e.target.value)}
              placeholder="ဥပမာ — 12/ABC(N)123456"
              className="num"
              style={formInput}
              required
            />
          </FormRow>
        </>
      )}
    </div>
  );
}
