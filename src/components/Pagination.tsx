import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { IconChevronLeft, IconChevronRight } from './Icons';
import { D, DigitsMode } from '../lib/units';
import { colors, radii } from '../styles/tokens';

export const PAGE_SIZE = 25;

export function usePagination<T>(
  items: T[],
  opts?: { pageSize?: number; resetKey?: string | number },
) {
  const pageSize = opts?.pageSize ?? PAGE_SIZE;
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [opts?.resetKey, pageSize]);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = useMemo(
    () => items.slice(start, start + pageSize),
    [items, start, pageSize],
  );
  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + pageSize, total);

  return {
    page: safePage,
    setPage,
    pageSize,
    total,
    totalPages,
    slice,
    from,
    to,
  };
}

export function PaginationBar({
  page,
  totalPages,
  total,
  from,
  to,
  digits = 'latin',
  pageSize = PAGE_SIZE,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  digits?: DigitsMode;
  pageSize?: number;
  onPage: (p: number) => void;
}) {
  if (total <= 0) return null;

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        padding: '12px 20px',
        borderTop: `1px solid ${colors.rowDivider}`,
        background: colors.white,
      }}
    >
      <div className="num" style={{ fontSize: 17, color: colors.muted, fontWeight: 500 }}>
        {D(from, digits)}–{D(to, digits)} / {D(total, digits)}
        <span style={{ margin: '0 8px', color: colors.cardBorder }}>·</span>
        တစ်မျက်နှာ {D(pageSize, digits)} စောင်
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PageBtn
          disabled={!hasPrev}
          onClick={() => onPage(page - 1)}
          tone="ghost"
          ariaLabel="ရှေ့စာမျက်နှာ"
        >
          <IconChevronLeft size={16} />
          ရှေ့
        </PageBtn>
        <span
          className="num"
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: colors.ink,
            minWidth: 72,
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          {D(page, digits)} / {D(totalPages, digits)}
        </span>
        <PageBtn
          disabled={!hasNext}
          onClick={() => onPage(page + 1)}
          tone={hasNext ? 'primary' : 'ghost'}
          ariaLabel="နောက်စာမျက်နှာ"
        >
          နောက်
          <IconChevronRight size={16} />
        </PageBtn>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  disabled,
  onClick,
  tone,
  ariaLabel,
}: {
  children: ReactNode;
  disabled: boolean;
  onClick: () => void;
  tone: 'primary' | 'ghost';
  ariaLabel: string;
}) {
  const primary = tone === 'primary' && !disabled;
  const style: CSSProperties = {
    height: 44,
    minWidth: 96,
    padding: '0 16px',
    border: primary ? 'none' : `1.5px solid ${colors.ink}`,
    borderRadius: radii.button,
    background: primary ? colors.ink : colors.white,
    color: primary ? colors.white : disabled ? colors.muted2 : colors.ink,
    fontSize: 17,
    fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.4 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    lineHeight: 1.3,
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={ariaLabel} style={style}>
      {children}
    </button>
  );
}
