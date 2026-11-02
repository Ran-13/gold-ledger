import { useMemo, useState } from 'react';
import type { Customer } from '../db/types';
import { D, DigitsMode } from '../lib/units';
import { colors, radii } from '../styles/tokens';

export function CustomerCombobox({
  customers,
  query,
  customerId,
  newPhone,
  digits,
  onQuery,
  onSelect,
  onNewPhone,
}: {
  customers: Customer[];
  query: string;
  customerId: number | null;
  newPhone: string;
  digits: DigitsMode;
  onQuery: (q: string) => void;
  onSelect: (c: Customer) => void;
  onNewPhone: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
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
            (c.phone || '').includes(ql),
        )
        .slice(0, 8),
    [customers, ql],
  );

  const show = open && (sug.length > 0 || isNew);

  let status = 'အမည်မထည့်ရင် ဖောက်သည်အထွေထွေ';
  let statusColor: string = colors.muted2;
  let statusWeight: number = 400;
  if (sel) {
    status = 'ဖောက်သည်ဟောင်း';
    statusColor = colors.muted;
  } else if (isNew) {
    status = 'ဖောက်သည်အသစ် · သိမ်းတဲ့အခါ ဖောက်သည်စာရင်းထဲ အလိုလို ထည့်ပါမယ်';
    statusColor = colors.sell;
    statusWeight = 600;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ fontSize: 16, fontWeight: 600 }}>ဖောက်သည်</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 12 }}>
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
            placeholder="အမည် ရိုက်ရှာပါ / အသစ်ရိုက်ထည့်ပါ"
            style={{
              height: 56,
              width: '100%',
              boxSizing: 'border-box',
              border: `1px solid ${colors.inputBorder}`,
              borderRadius: radii.input,
              padding: '0 16px',
              background: '#fff',
              fontSize: 16,
            }}
          />
          {show && (
            <div
              style={{
                position: 'absolute',
                top: 62,
                left: 0,
                right: 0,
                zIndex: 20,
                background: colors.white,
                border: `1.5px solid ${colors.cardBorder}`,
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(27,42,65,.14)',
                maxHeight: 300,
                overflow: 'auto',
                padding: 6,
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
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    width: '100%',
                    padding: '12px 14px',
                    border: 'none',
                    borderRadius: 6,
                    background: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 16,
                    color: colors.ink,
                  }}
                >
                  <span>{c.name}</span>
                  <span style={{ color: colors.muted2, fontSize: 15 }}>
                    {D(c.phone || '', digits)}
                  </span>
                </button>
              ))}
              {isNew && (
                <div
                  style={{
                    padding: '12px 14px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    color: colors.sell,
                    fontWeight: 600,
                    fontSize: 16,
                  }}
                >
                  + “{query.trim()}” ကို ဖောက်သည်အသစ်အဖြစ် ထည့်မည်
                </div>
              )}
            </div>
          )}
        </div>
        {isNew ? (
          <input
            value={newPhone}
            onChange={(e) => onNewPhone(e.target.value)}
            placeholder="ဖုန်းနံပါတ် (မထည့်လည်းရ)"
            style={{
              height: 56,
              width: '100%',
              boxSizing: 'border-box',
              border: `1.5px solid ${colors.sell}`,
              borderRadius: radii.input,
              padding: '0 16px',
              background: '#fff',
              fontSize: 16,
            }}
          />
        ) : (
          <div
            style={{
              height: 56,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              borderRadius: radii.input,
              background: colors.softBg,
              color: colors.muted,
              fontSize: 16,
            }}
          >
            {sel ? D(sel.phone || '—', digits) : 'ဖုန်း —'}
          </div>
        )}
      </div>
      <div style={{ fontSize: 15, color: statusColor, fontWeight: statusWeight }}>{status}</div>
    </div>
  );
}
