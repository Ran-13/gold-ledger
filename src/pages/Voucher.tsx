import { useEffect, useMemo, useState } from 'react'
import { Card } from '../components/Card'
import { CellPrimary, tableTh, ty } from '../components/ClearUI'
import { IconPrint, IconSearch } from '../components/Icons'
import { PaginationBar, usePagination } from '../components/Pagination'
import { VoucherSlipPreview } from '../components/VoucherSlipPreview'
import { customerName } from '../lib/format'
import { dashPrint, printVoucher, type VoucherPrintData } from '../lib/printVoucher'
import { D, W, formatDate, formatTimeAmPm, fromYway, voucherNo } from '../lib/units'
import { useStore } from '../store'
import { colors, radii } from '../styles/tokens'

export function Voucher() {
  const txns = useStore((s) => s.txns)
  const customers = useStore((s) => s.customers)
  const settings = useStore((s) => s.settings)
  const voucherId = useStore((s) => s.voucherId)
  const setVoucherId = useStore((s) => s.setVoucherId)
  const printAfterOpen = useStore((s) => s.printAfterOpen)
  const setPrintAfterOpen = useStore((s) => s.setPrintAfterOpen)
  const digits = settings.digits
  const printSize = settings.print_size

  const [q, setQ] = useState('')

  const custMap = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers])
  const desc = useMemo(() => [...txns].sort((a, b) => b.voucher_no - a.voucher_no), [txns])

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase()
    if (!ql) return desc
    return desc.filter((t) => {
      const name = customerName(t.customer_id, custMap).toLowerCase()
      const no = String(t.voucher_no)
      return name.includes(ql) || no.includes(ql) || voucherNo(t.voucher_no, digits).includes(ql)
    })
  }, [desc, q, custMap, digits])

  const page = usePagination(filtered, { resetKey: q })

  const vt = txns.find((t) => t.id === voucherId) ?? filtered[0] ?? desc[0] ?? null
  const vc = vt ? custMap.get(vt.customer_id ?? -1) : null

  const printData: VoucherPrintData | null = useMemo(() => {
    if (!vt) return null
    const parts = fromYway(vt.yway)
    return {
      voucherNo: voucherNo(vt.voucher_no),
      date: formatDate(vt.date, 'latin'),
      time: formatTimeAmPm(vt.time, digits),
      name: customerName(vt.customer_id, custMap),
      nrc: dashPrint(vc?.nrc),
      address: vc?.address?.trim() || '—',
      phone: dashPrint(vc?.phone),
      kyat: parts.k ? D(Math.abs(parts.k), digits) : '—',
      pe: parts.p ? D(parts.p, digits) : '—',
      yway: parts.y ? D(parts.y, digits) : '—',
    }
  }, [vt, digits, custMap, vc])

  // Save → print: wait for paint; clear flag only when actually printing
  // (clearing early breaks React Strict Mode remount / cancels the dialog)
  useEffect(() => {
    if (!printAfterOpen || !printData) return
    let alive = true
    const t = window.setTimeout(() => {
      if (!alive) return
      setPrintAfterOpen(false)
      printVoucher(printSize, printData)
    }, 450)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [printAfterOpen, printData, setPrintAfterOpen, printSize])

  if (!vt || !printData) {
    return (
      <Card padding="48px 32px">
        <div style={{ textAlign: 'center', color: colors.muted, fontSize: 18, lineHeight: 1.6 }}>
          ဘောင်ချာ မရှိသေးပါ
          <div style={{ fontSize: 16, color: colors.muted2, marginTop: 8 }}>
            အရောင်း/အဝယ်မှ သိမ်းမည်ကိုနှိပ်ရင် ဒီမှာ ပေါ်ပါမယ်
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div
      data-print-page="1"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1.15fr) minmax(380px, 0.85fr)',
        gap: 24,
        alignItems: 'start',
        width: '100%',
        minHeight: 'calc(100vh - 140px)',
      }}
    >
      {/* List — ~half page, columns fully visible */}
      <div data-noprint="1" style={{ minWidth: 0, height: '100%' }}>
        <Card
          padding={0}
          style={{
            overflow: 'hidden',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 'calc(100vh - 160px)',
          }}
        >
          <div
            style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${colors.cardBorder}` }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 14,
              }}
            >
              <div style={ty.section}>ဘောင်ချာစာရင်း</div>
              <div style={{ fontSize: 17, color: colors.muted, fontWeight: 700, lineHeight: 1.4 }}>
                {D(filtered.length, digits)} စောင်
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: colors.muted,
                  display: 'flex',
                }}
              >
                <IconSearch size={17} />
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="အမှတ် / အမည် ရှာရန်"
                style={{
                  width: '100%',
                  height: 48,
                  boxSizing: 'border-box',
                  border: `1.5px solid ${colors.inputBorder}`,
                  borderRadius: radii.input,
                  padding: '0 14px 0 42px',
                  fontSize: 18,
                  lineHeight: 1.5,
                  background: colors.white,
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: 640,
                borderCollapse: 'collapse',
                tableLayout: 'fixed',
              }}
            >
              <colgroup>
                <col style={{ width: '14%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '24%' }} />
              </colgroup>
              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <tr>
                  <th style={{ ...tableTh, paddingLeft: 16, background: '#F7F8FA' }}>အမှတ်</th>
                  <th style={{ ...tableTh, background: '#F7F8FA' }}>အမျိုးအစား</th>
                  <th style={{ ...tableTh, background: '#F7F8FA' }}>အမည်</th>
                  <th style={{ ...tableTh, background: '#F7F8FA' }}>ရက်စွဲ</th>
                  <th style={{ ...tableTh, textAlign: 'right', paddingRight: 16, background: '#F7F8FA' }}>
                    ရွှေချိန်
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        padding: 48,
                        textAlign: 'center',
                        color: colors.muted2,
                        fontSize: 18,
                        lineHeight: 1.6,
                      }}
                    >
                      မတွေ့ပါ
                    </td>
                  </tr>
                )}
                {page.slice.map((t) => {
                  const on = t.id === vt.id
                  const sell = t.type === 'sell'
                  const rowBorder = on ? 'none' : `1px solid ${colors.rowDivider}`
                  return (
                    <tr
                      key={t.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setVoucherId(t.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setVoucherId(t.id)
                      }}
                      style={{
                        cursor: 'pointer',
                        background: on ? colors.ink : colors.white,
                        color: on ? colors.white : colors.ink,
                      }}
                    >
                      <td
                        style={{
                          padding: '18px 12px 18px 16px',
                          borderTop: rowBorder,
                          whiteSpace: 'nowrap',
                          verticalAlign: 'middle',
                        }}
                      >
                        <CellPrimary
                          className="num"
                          style={{ color: on ? colors.white : colors.ink }}
                        >
                          {voucherNo(t.voucher_no, digits)}
                        </CellPrimary>
                      </td>
                      <td style={{ padding: '18px 12px', borderTop: rowBorder, verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: 17,
                            fontWeight: 700,
                            lineHeight: 1.3,
                            padding: '5px 9px',
                            borderRadius: radii.pill,
                            border: on
                              ? '1.5px solid rgba(255,255,255,.4)'
                              : `1.5px solid ${sell ? colors.sell : colors.buy}`,
                            color: on ? colors.white : sell ? colors.sell : colors.buy,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {sell ? 'အရောင်း' : 'အဝယ်'}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '18px 12px',
                          borderTop: rowBorder,
                          verticalAlign: 'middle',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={customerName(t.customer_id, custMap)}
                      >
                        <CellPrimary style={{ color: on ? colors.white : colors.ink }}>
                          {customerName(t.customer_id, custMap)}
                        </CellPrimary>
                      </td>
                      <td
                        className="num"
                        style={{
                          padding: '18px 12px',
                          borderTop: rowBorder,
                          verticalAlign: 'middle',
                          fontSize: 17,
                          lineHeight: 1.4,
                          color: on ? 'rgba(255,255,255,.78)' : colors.muted2,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatDate(t.date, digits)}
                      </td>
                      <td
                        className="num"
                        style={{
                          padding: '18px 16px 18px 12px',
                          borderTop: rowBorder,
                          verticalAlign: 'middle',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: 20,
                          lineHeight: 1.35,
                          whiteSpace: 'nowrap',
                          color: on ? colors.white : colors.ink,
                        }}
                      >
                        {W(t.yway, digits)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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

      {/* Preview — other half */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          alignItems: 'center',
          minWidth: 0,
        }}
      >
        <div
          data-noprint="1"
          style={{
            display: 'flex',
            width: '100%',
            maxWidth: 440,
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div style={ty.primary}>{voucherNo(vt.voucher_no, digits)}</div>
            <div style={{ ...ty.meta, color: colors.muted }}>
              {vt.type === 'sell' ? 'အရောင်း' : 'အဝယ်'}
              {vt.channel === 'card' ? ' · အကယ်ဒမီအခေါက်ရွှေ' : ' · မီးလင်းဖြတ်စ'} ·{' '}
              {W(vt.yway, digits)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => printVoucher(printSize, printData)}
            style={{
              height: 42,
              padding: '0 18px',
              border: 'none',
              borderRadius: radii.button,
              background: colors.ink,
              color: colors.white,
              fontSize: 16,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <IconPrint size={16} />
            ပရင့်ထုတ်မည်
          </button>
        </div>

        <VoucherSlipPreview data={printData} size={printSize} maxWidth={440} />
      </div>
    </div>
  )
}
