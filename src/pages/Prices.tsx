import { Card } from '../components/Card';
import { PaginationBar, usePagination } from '../components/Pagination';
import { D, money } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function Prices() {
  const prices = useStore((s) => s.prices);
  const settings = useStore((s) => s.settings);
  const openPriceDialog = useStore((s) => s.openPriceDialog);
  const digits = settings.digits;

  const sorted = [...prices].sort((a, b) => {
    const ka = `${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}`;
    const kb = `${b.date}T${b.time.length === 5 ? b.time + ':00' : b.time}`;
    return ka < kb ? -1 : ka > kb ? 1 : a.id - b.id;
  });

  const priceRows = sorted
    .map((p, i) => {
      const prev = sorted[i - 1];
      const chBuy = prev ? p.buy - prev.buy : 0;
      const chSell = prev ? p.sell - prev.sell : 0;
      const fmtCh = (ch: number) =>
        ch === 0 ? '—' : `${ch > 0 ? '+' : '−'}${money(Math.abs(ch), digits)}`;
      return {
        key: p.id,
        date: D(p.date, digits),
        time: D(p.time.slice(0, 5), digits),
        buy: money(p.buy, digits),
        sell: money(p.sell, digits),
        chBuy: fmtCh(chBuy),
        chSell: fmtCh(chSell),
        chBuyPos: chBuy > 0,
        chBuyNeg: chBuy < 0,
        chSellPos: chSell > 0,
        chSellNeg: chSell < 0,
      };
    })
    .reverse();

  const page = usePagination(priceRows);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1160 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={openPriceDialog}
          style={{
            height: 44,
            padding: '0 20px',
            border: 'none',
            borderRadius: 8,
            background: colors.ink,
            color: colors.white,
            fontWeight: 700,
            fontSize: 15,
          }}
        >
          + စျေးနှုန်းပြင်ဆင်ရန်
        </button>
      </div>

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 16 }}>
          <thead>
            <tr style={{ color: colors.muted, textAlign: 'left', fontSize: 15 }}>
              <th style={{ padding: '16px 20px', fontWeight: 600 }}>ရက်စွဲ</th>
              <th style={{ padding: '16px 12px', fontWeight: 600 }}>အချိန်</th>
              <th style={{ padding: '16px 12px', fontWeight: 600, textAlign: 'right' }}>အဝယ်စျေး</th>
              <th style={{ padding: '16px 12px', fontWeight: 600, textAlign: 'right' }}>အရောင်းစျေး</th>
              <th style={{ padding: '16px 12px', fontWeight: 600, textAlign: 'right' }}>ဝယ် ပြောင်း</th>
              <th style={{ padding: '16px 20px', fontWeight: 600, textAlign: 'right' }}>ရောင်း ပြောင်း</th>
            </tr>
          </thead>
          <tbody>
            {priceRows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: colors.muted2 }}>
                  စျေးနှုန်း မှတ်တမ်း မရှိသေးပါ
                </td>
              </tr>
            )}
            {page.slice.map((p) => (
              <tr key={p.key}>
                <td style={{ padding: '13px 20px', borderTop: `1px solid ${colors.rowDivider}`, whiteSpace: 'nowrap' }}>
                  {p.date}
                </td>
                <td className="num" style={{ padding: '13px 12px', borderTop: `1px solid ${colors.rowDivider}`, whiteSpace: 'nowrap' }}>
                  {p.time}
                </td>
                <td className="num" style={{ padding: '13px 12px', borderTop: `1px solid ${colors.rowDivider}`, textAlign: 'right' }}>
                  {p.buy}
                </td>
                <td
                  className="num"
                  style={{
                    padding: '13px 12px',
                    borderTop: `1px solid ${colors.rowDivider}`,
                    textAlign: 'right',
                    fontWeight: 600,
                  }}
                >
                  {p.sell}
                </td>
                <td style={{ padding: '13px 12px', borderTop: `1px solid ${colors.rowDivider}`, textAlign: 'right' }}>
                  <span
                    className="num"
                    style={{
                      color: p.chBuyPos ? colors.sell : p.chBuyNeg ? colors.buy : colors.muted2,
                      fontWeight: 600,
                    }}
                  >
                    {p.chBuy}
                  </span>
                </td>
                <td style={{ padding: '13px 20px', borderTop: `1px solid ${colors.rowDivider}`, textAlign: 'right' }}>
                  <span
                    className="num"
                    style={{
                      color: p.chSellPos ? colors.sell : p.chSellNeg ? colors.buy : colors.muted2,
                      fontWeight: 600,
                    }}
                  >
                    {p.chSell}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <PaginationBar
          page={page.page}
          totalPages={page.totalPages}
          total={page.total}
          from={page.from}
          to={page.to}
          digits={digits}
          onPage={page.setPage}
        />
      </Card>
    </div>
  );
}
