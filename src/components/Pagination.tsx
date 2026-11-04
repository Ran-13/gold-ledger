import { useEffect, useMemo, useState } from 'react';
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
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  digits?: DigitsMode;
  onPage: (p: number) => void;
}) {
  if (total <= 0) return null;

  const btn = (label: string, next: number, disabled: boolean) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPage(next)}
      style={{
        height: 40,
        minWidth: 40,
        padding: '0 14px',
        border: `1px solid ${colors.cardBorder}`,
        borderRadius: radii.sm,
        background: colors.white,
        color: disabled ? colors.muted2 : colors.ink,
        fontSize: 17,
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {label}
    </button>
  );

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
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {btn('‹', page - 1, page <= 1)}
        <span className="num" style={{ fontSize: 17, fontWeight: 600, color: colors.ink, minWidth: 64, textAlign: 'center' }}>
          {D(page, digits)} / {D(totalPages, digits)}
        </span>
        {btn('›', page + 1, page >= totalPages)}
      </div>
    </div>
  );
}
