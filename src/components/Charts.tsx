import type { CSSProperties } from 'react';
import { colors } from '../styles/tokens';

export interface ChartCol {
  label: string;
  slabel: string;
  title: string;
  up: CSSProperties;
  down: CSSProperties;
  upTxt: string;
  downTxt: string;
  showTxt: boolean;
  p: CSSProperties;
  pTxt: string;
  pTitle: string;
}

export function DivergingBars({
  cols,
  useShortLabel,
}: {
  cols: ChartCol[];
  useShortLabel?: boolean;
}) {
  const txt: CSSProperties = {
    fontSize: 12,
    lineHeight: 1.5,
    color: colors.muted,
    whiteSpace: 'nowrap',
    display: cols[0]?.showTxt ? 'block' : 'none',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, height: 140 }}>
        {cols.map((c, i) => (
          <div
            key={i}
            title={c.title}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <span style={txt}>{c.upTxt}</span>
            <div style={c.up} />
          </div>
        ))}
      </div>
      <div style={{ height: 2, background: colors.ink }} />
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 4, height: 140 }}>
        {cols.map((c, i) => (
          <div
            key={i}
            title={c.title}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <div style={c.down} />
            <span style={txt}>{c.downTxt}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, fontSize: 13, color: colors.muted2 }}>
        {cols.map((c, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'visible',
            }}
          >
            {useShortLabel ? c.slabel : c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StockLine({
  line,
  area,
  start,
  end,
  chg,
  chgPositive,
  first,
  last,
}: {
  line: string;
  area: string;
  start: string;
  end: string;
  chg: string;
  chgPositive: boolean;
  first: string;
  last: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>လက်ကျန်ရွှေ အပြောင်းအလဲ</div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: chgPositive ? colors.sell : colors.buy,
          }}
        >
          {chg}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: colors.muted }}>
        <span>အစ {start}</span>
        <span>
          အဆုံး <b style={{ color: colors.ink }}>{end}</b>
        </span>
      </div>
      <svg viewBox="0 0 1000 160" preserveAspectRatio="none" style={{ width: '100%', height: 160, display: 'block' }}>
        <polygon points={area} fill={colors.goldLight} />
        <polyline
          points={line}
          fill="none"
          stroke={colors.gold}
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: colors.muted2 }}>
        <span>{first}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}

export function ProfitBars({
  cols,
  profitTotal,
  useShortLabel,
}: {
  cols: ChartCol[];
  profitTotal: string;
  useShortLabel?: boolean;
}) {
  const txt: CSSProperties = {
    fontSize: 12,
    lineHeight: 1.5,
    color: colors.muted,
    whiteSpace: 'nowrap',
    display: cols[0]?.showTxt ? 'block' : 'none',
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>
          အမြတ် <span style={{ fontSize: 14, fontWeight: 400, color: colors.muted2 }}>(သိန်း)</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: colors.sell }}>{profitTotal}</div>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 4,
          height: 180,
          borderBottom: `2px solid ${colors.ink}`,
        }}
      >
        {cols.map((c, i) => (
          <div
            key={i}
            title={c.pTitle}
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <span style={txt}>{c.pTxt}</span>
            <div style={c.p} />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 4, fontSize: 13, color: colors.muted2 }}>
        {cols.map((c, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0, textAlign: 'center', whiteSpace: 'nowrap' }}>
            {useShortLabel ? c.slabel : c.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleBars14({
  bars,
}: {
  bars: { label: string; title: string; sellH: number; buyH: number }[];
}) {
  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          height: 220,
          borderBottom: `1px solid ${colors.borderSoft}`,
        }}
      >
        {bars.map((b, i) => (
          <div
            key={i}
            title={b.title}
            style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 3, height: '100%' }}
          >
            <div
              style={{
                flex: 1,
                height: `${b.sellH}%`,
                minHeight: b.sellH ? 3 : 0,
                background: colors.gold,
                borderRadius: '4px 4px 0 0',
              }}
            />
            <div
              style={{
                flex: 1,
                height: `${b.buyH}%`,
                minHeight: b.buyH ? 3 : 0,
                background: colors.buyBarSoft,
                borderRadius: '4px 4px 0 0',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 12, color: colors.muted2, marginTop: -10 }}>
        {bars.map((b, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            {b.label}
          </div>
        ))}
      </div>
    </>
  );
}
