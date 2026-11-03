import { IconEdit, IconPlus, IconPrice } from './Icons';
import { dateTimeKey, isoDate, money } from '../lib/units';
import { TOP_BAR_HEIGHT, colors } from '../styles/tokens';
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
      <PriceBox label="အဝယ်စျေး" value={money(cur.buy, digits)} />
      <PriceBox label="အရောင်းစျေး" value={money(cur.sell, digits)} />

      <div style={{ flex: 1 }} />

      <button
        type="button"
        onClick={openPriceDialog}
        style={{
          height: 38,
          padding: '0 14px',
          border: `1.5px solid ${colors.inputBorder}`,
          borderRadius: 8,
          background: colors.white,
          color: colors.ink,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <IconEdit size={15} />
        စျေးနှုန်းပြင်ဆင်ရန်
      </button>

      <button
        type="button"
        onClick={openEntryDialog}
        style={{
          height: 38,
          padding: '0 16px',
          border: 'none',
          borderRadius: 8,
          background: colors.ink,
          color: colors.white,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <IconPlus size={16} />
        စာရင်းသွင်းခြင်း
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
        padding: '6px 14px',
        background: colors.white,
        border: `1.5px solid ${colors.cardBorder}`,
        borderRadius: 6,
        minWidth: 150,
      }}
    >
      <IconPrice size={14} style={{ color: colors.muted }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>{label}</span>
      <span
        className="num"
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: colors.ink,
          lineHeight: 1.2,
        }}
      >
        {value}
      </span>
    </div>
  );
}
