import { Card } from '../components/Card';
import { MiniFact, StatStrip, clearPrimaryBtn, tableTd, tableTh } from '../components/ClearUI';
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

  const latest = sorted[sorted.length - 1];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 1160 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={openPriceDialog} style={clearPrimaryBtn}>
          + စျေးနှုန်းအသစ်
        </button>
      </div>

      {latest ? (
        <StatStrip>
          <MiniFact
            label="ယခု အဝယ်စျေး"
            value={money(latest.buy, digits)}
            tone="buy"
            sub={`${D(latest.date, digits)} · ${D(latest.time.slice(0, 5), digits)}`}
          />
          <MiniFact
            label="ယခု အရောင်းစျေး"
            value={money(latest.sell, digits)}
            tone="sell"
            sub={`${D(latest.date, digits)} · ${D(latest.time.slice(0, 5), digits)}`}
          />
        </StatStrip>
      ) : null}

      <Card padding={0} style={{ overflow: 'hidden' }}>
        <div
          style={{
            padding: '13px 16px',
            borderBottom: `1px solid ${colors.rowDivider}`,
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          မှတ်တမ်း
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...tableTh, paddingLeft: 16 }}>ရက်စွဲ</th>
              <th style={tableTh}>အချိန်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>အဝယ်</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>အရောင်း</th>
              <th style={{ ...tableTh, textAlign: 'right' }}>ဝယ် ±</th>
              <th style={{ ...tableTh, paddingRight: 16, textAlign: 'right' }}>ရောင်း ±</th>
            </tr>
          </thead>
          <tbody>
            {priceRows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ ...tableTd, padding: 36, textAlign: 'center', color: colors.muted2, borderBottom: 'none' }}
                >
                  စျေးနှုန်း မှတ်တမ်း မရှိသေးပါ
                </td>
              </tr>
            )}
            {page.slice.map((p) => (
              <tr key={p.key}>
                <td style={{ ...tableTd, paddingLeft: 16, whiteSpace: 'nowrap' }}>{p.date}</td>
                <td className="num" style={{ ...tableTd, whiteSpace: 'nowrap' }}>
                  {p.time}
                </td>
                <td className="num" style={{ ...tableTd, textAlign: 'right' }}>
                  {p.buy}
                </td>
                <td className="num" style={{ ...tableTd, textAlign: 'right', fontWeight: 600 }}>
                  {p.sell}
                </td>
                <td style={{ ...tableTd, textAlign: 'right' }}>
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
                <td style={{ ...tableTd, paddingRight: 16, textAlign: 'right' }}>
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
