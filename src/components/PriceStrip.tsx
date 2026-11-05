import { IconEdit, IconPlus, IconPrice } from './Icons';
import { KbdHint } from './KbdHint';
import { dateTimeKey, isoDate, money } from '../lib/units';
import { TOP_BAR_HEIGHT, colors, radii } from '../styles/tokens';
import { useStore } from '../store';

/** Top price bar — buy / sell only */
export function PriceStrip() {
  const prices = useStore((s) => s.prices);
  const digits = useStore((s) => s.settings.digits);
  const openPriceDialog = useStore((s) => s.openPriceDialog);
  const openEntryDialog = useStore((s) => s.openEntryDialog);
  const sorted = [...prices].sort((a, b) =>
    dateTimeKey(a.date, a.time) < dateTimeKey(b.date, b.time) ? -1 : 1,
  );
  const cur = sorted[sorted.length - 1] ?? { buy: 0, sell: 0, date: isoDate(), time: '00:00:00', id: 0 };

  return (
    <div
      data-noprint="1"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        height: TOP_BAR_HEIGHT,
        boxSizing: 'border-box',
        padding: '0 20px',
        background: colors.white,
        borderBottom: `1px solid ${colors.cardBorder}`,
        flexWrap: 'nowrap',
        flexShrink: 0,
      }}
    >
      <PriceBox label="အရောင်းစျေး" value={cur.sell > 0 ? money(cur.sell, digits) : '—'} />
      <PriceBox label="အဝယ်စျေး" value={cur.buy > 0 ? money(cur.buy, digits) : '—'} />

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={openPriceDialog}
        style={{
          height: 48,
          padding: '0 16px',
          border: `1.5px solid ${colors.cardBorder}`,
          borderRadius: radii.button,
          background: colors.white,
          color: colors.ink,
          fontSize: 17,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          lineHeight: 1.4,
        }}
      >
        <IconEdit size={16} />
        ရွှေစျေးပြင်ရန်
        <KbdHint>P</KbdHint>
      </button>

      <button
        type="button"
        onClick={openEntryDialog}
        style={{
          height: 48,
          padding: '0 18px',
          border: 'none',
          borderRadius: radii.button,
          background: colors.ink,
          color: colors.white,
          fontSize: 17,
          fontWeight: 700,
          lineHeight: 1.4,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <IconPlus size={17} />
        အရောင်း/အဝယ်
        <KbdHint onDark>N</KbdHint>
      </button>
    </div>
  );
}

function PriceBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        background: colors.white,
        border: 'none',
        boxShadow: 'none',
        borderRadius: radii.button,
        minWidth: 168,
      }}
    >
      <IconPrice size={15} style={{ color: colors.muted }} />
      <span style={{ fontSize: 17, fontWeight: 700, color: colors.muted, lineHeight: 1.4 }}>{label}</span>
      <span
        className="num"
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: colors.ink,
          lineHeight: 1.4,
          letterSpacing: '-0.01em',
        }}
      >
        {value}
      </span>
    </div>
  );
}
