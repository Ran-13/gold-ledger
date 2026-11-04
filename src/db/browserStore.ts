import { DEFAULT_AUTH_PASSWORD_HASH, DEFAULT_AUTH_USERNAME } from '../lib/auth'
import {
  assertCardStockEnough,
  buyCardAmountFixes,
  cardsTotalYway,
  cardTxnAmount,
  computeCardStock,
  DEFAULT_CARD_FEE,
  normalizeCardLines,
  type CardDenom,
} from '../lib/cards'
import {
  amount,
  assertStockEnough,
  assertStockNonNegative,
  isoDate,
  isoTime,
  stockFromParts,
  toYway,
} from '../lib/units'
import type {
  CardAdjustment,
  CardOpening,
  Customer,
  Price,
  SaveTxnInput,
  Settings,
  StockAdjKind,
  StockAdjustment,
  Txn,
  TxnCard,
  TxnChannel,
  TxnType,
} from './types'

const KEY = 'uthantsin-gold-browser-v1'

interface BrowserData {
  customers: Customer[]
  prices: Price[]
  txns: Txn[]
  stockAdjustments: StockAdjustment[]
  cardOpenings: CardOpening[]
  cardAdjustments: CardAdjustment[]
  txnCards: TxnCard[]
  settings: Record<string, string>
  nextCustomerId: number
  nextTxnId: number
  nextPriceId: number
  nextStockAdjId: number
  nextCardAdjId: number
  nextTxnCardId: number
}

function defaultCardOpenings(): CardOpening[] {
  return ['1p', '2p', '4p', '8p', '1k', '2k', '3k', '5k', '10k'].map((denom) => ({
    denom,
    qty: 0,
  }))
}

function empty(): BrowserData {
  return {
    customers: [],
    prices: [],
    txns: [],
    stockAdjustments: [],
    cardOpenings: defaultCardOpenings(),
    cardAdjustments: [],
    txnCards: [],
    settings: {
      opening_stock_yway: '0',
      digits: 'latin',
      shop_name: 'ဦးသန့်စင်',
      shop_mark: 'သ',
      shop_tagline: 'အခေါက်ရွှေ အရောင်းအဝယ်',
      card_fee: String(DEFAULT_CARD_FEE),
      print_size: 'M',
      auth_username: DEFAULT_AUTH_USERNAME,
      auth_password_hash: DEFAULT_AUTH_PASSWORD_HASH,
    },
    nextCustomerId: 1,
    nextTxnId: 1,
    nextPriceId: 1,
    nextStockAdjId: 1,
    nextCardAdjId: 1,
    nextTxnCardId: 1,
  }
}

function normalizePrices(d: BrowserData): void {
  if (!d.nextPriceId) d.nextPriceId = 1
  d.prices = (d.prices || []).map((p) => {
    const row = p as Price & { id?: number; time?: string }
    const id = row.id ?? d.nextPriceId++
    if (id >= d.nextPriceId) d.nextPriceId = id + 1
    return {
      id,
      date: row.date,
      time: row.time || '00:00:00',
      buy: row.buy,
      sell: row.sell,
    }
  })
}

function normalizeTxns(d: BrowserData): void {
  d.txns = (d.txns || []).map((t) => ({
    ...t,
    channel: (t.channel === 'card' ? 'card' : 'loose') as TxnChannel,
    card_fee: Number(t.card_fee ?? 0),
  }))
}

function ensureCardTables(d: BrowserData): void {
  if (!d.cardOpenings?.length) d.cardOpenings = defaultCardOpenings()
  if (!d.cardAdjustments) d.cardAdjustments = []
  if (!d.txnCards) d.txnCards = []
  if (!d.nextCardAdjId) d.nextCardAdjId = 1
  if (!d.nextTxnCardId) d.nextTxnCardId = 1
  if (d.settings.card_fee == null) d.settings.card_fee = String(DEFAULT_CARD_FEE)
  if (!d.settings.auth_username) d.settings.auth_username = DEFAULT_AUTH_USERNAME
  if (!d.settings.auth_password_hash) d.settings.auth_password_hash = DEFAULT_AUTH_PASSWORD_HASH
}

/** One-time: buy+card amounts become gold + fee. Returns true if applied. */
function migrateBuyCardFeeAdd(d: BrowserData): boolean {
  if (d.settings.buy_card_fee_add === '1') return false
  const fixes = buyCardAmountFixes(d.txns, d.txnCards)
  if (fixes.length) {
    const byId = new Map(fixes.map((f) => [f.id, f.amount]))
    d.txns = d.txns.map((t) => (byId.has(t.id) ? { ...t, amount: byId.get(t.id)! } : t))
  }
  d.settings.buy_card_fee_add = '1'
  return true
}

let data: BrowserData | null = null

function load(): BrowserData {
  if (data) return data
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      data = JSON.parse(raw) as BrowserData
      if (!data.stockAdjustments) data.stockAdjustments = []
      if (!data.nextStockAdjId) data.nextStockAdjId = 1
      ensureCardTables(data)
      normalizePrices(data)
      normalizeTxns(data)
      if (migrateBuyCardFeeAdd(data)) persist()
      return data
    }
  } catch {
    /* ignore */
  }
  data = empty()
  persist()
  return data
}

function persist(): void {
  if (!data) return
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

function looseTxns(d: BrowserData): Txn[] {
  return d.txns.filter((t) => t.channel !== 'card')
}

function cardStock(d: BrowserData): Record<CardDenom, number> {
  const typeById = new Map(d.txns.map((t) => [t.id, t.type]))
  return computeCardStock({
    openings: d.cardOpenings,
    adjustments: d.cardAdjustments,
    txnCards: d.txnCards.map((c) => ({
      type: typeById.get(c.txn_id) ?? 'sell',
      denom: c.denom,
      qty: c.qty,
    })),
  })
}

export function browserGetDbPath(): string {
  return 'localStorage:' + KEY
}

export async function browserInit(): Promise<void> {
  load()
}

export async function browserClose(): Promise<void> {
  persist()
}

export async function browserReopen(): Promise<void> {
  data = null
  await browserInit()
}

export async function browserGetSettings(): Promise<Settings> {
  const d = load()
  const fee = Number(d.settings.card_fee ?? DEFAULT_CARD_FEE)
  const printSize = d.settings.print_size
  return {
    opening_stock_yway: Number(d.settings.opening_stock_yway ?? 0),
    digits: d.settings.digits === 'myanmar' ? 'myanmar' : 'latin',
    shop_name: d.settings.shop_name?.trim() || 'ဦးသန့်စင်',
    shop_mark: d.settings.shop_mark?.trim() || 'သ',
    shop_tagline: d.settings.shop_tagline?.trim() || 'အခေါက်ရွှေ အရောင်းအဝယ်',
    card_fee: Number.isFinite(fee) && fee >= 0 ? Math.round(fee) : DEFAULT_CARD_FEE,
    print_size: printSize === 'S' || printSize === 'M' || printSize === 'L' ? printSize : 'M',
    auth_username: d.settings.auth_username?.trim() || DEFAULT_AUTH_USERNAME,
    auth_password_hash: d.settings.auth_password_hash?.trim() || DEFAULT_AUTH_PASSWORD_HASH,
  }
}

export async function browserSetSetting(key: string, value: string): Promise<void> {
  const d = load()
  if (key === 'opening_stock_yway') {
    const settings = await browserGetSettings()
    assertStockNonNegative(
      stockFromParts(Number(value), looseTxns(d), d.stockAdjustments),
      settings.digits,
      'အစလက်ကျန် လျှော့လို့ မရပါ · လက်ကျန် အနှုတ် ဖြစ်မည်'
    )
  }
  d.settings[key] = value
  persist()
}

export async function browserListCustomers(): Promise<Customer[]> {
  return [...load().customers]
    .map((c) => ({ ...c, nrc: c.nrc ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

export async function browserCreateCustomer(
  name: string,
  phone = '',
  address = '',
  nrc = ''
): Promise<number> {
  const d = load()
  const id = d.nextCustomerId++
  d.customers.push({
    id,
    name: name.trim(),
    phone: phone.trim(),
    nrc: nrc.trim(),
    address: address.trim(),
    created_at: new Date().toISOString(),
  })
  persist()
  return id
}

export async function browserListPrices(): Promise<Price[]> {
  return [...load().prices].sort((a, b) => {
    const ka = `${a.date}T${a.time.length === 5 ? a.time + ':00' : a.time}`
    const kb = `${b.date}T${b.time.length === 5 ? b.time + ':00' : b.time}`
    return ka < kb ? -1 : ka > kb ? 1 : a.id - b.id
  })
}

export async function browserUpsertPrice(date: string, buy: number, sell: number): Promise<void> {
  const d = load()
  const list = await browserListPrices()
  const latest = list[list.length - 1]
  if (latest && latest.buy === buy && latest.sell === sell) return
  const now = new Date()
  d.prices.push({
    id: d.nextPriceId++,
    date: date || isoDate(now),
    time: isoTime(now),
    buy,
    sell,
  })
  persist()
}

export async function browserListTxns(): Promise<Txn[]> {
  return [...load().txns].sort((a, b) => b.voucher_no - a.voucher_no)
}

export async function browserListTxnsAsc(): Promise<Txn[]> {
  return [...load().txns].sort((a, b) =>
    a.date + a.time + String(a.voucher_no).padStart(8, '0') <
    b.date + b.time + String(b.voucher_no).padStart(8, '0')
      ? -1
      : 1
  )
}

export async function browserGetTxn(id: number): Promise<Txn | null> {
  return load().txns.find((t) => t.id === id) ?? null
}

export async function browserSaveTxn(input: SaveTxnInput): Promise<number> {
  const d = load()
  const settings = await browserGetSettings()
  const channel: TxnChannel = input.channel === 'card' ? 'card' : 'loose'
  const feePerCard =
    input.cardFee != null && Number.isFinite(input.cardFee)
      ? Math.max(0, Math.round(input.cardFee))
      : settings.card_fee

  let yway: number
  let lines: Array<{ denom: CardDenom; qty: number }> = []
  let amt: number
  let cardFeeStored = 0

  if (channel === 'card') {
    lines = normalizeCardLines(input.cards ?? [])
    if (!lines.length) throw new Error('ကဒ် အရေအတွက် ထည့်ပါ')
    yway = cardsTotalYway(lines)
    const parts = cardTxnAmount(input.type, yway, input.price, lines, feePerCard)
    amt = parts.total
    cardFeeStored = feePerCard
    if (input.type === 'sell') {
      assertCardStockEnough(cardStock(d), lines, settings.digits)
    }
  } else {
    yway = Math.round(toYway(input.k, input.p, input.y) * 1000) / 1000
    if (yway <= 0) throw new Error('ရွှေချိန် ထည့်ပါ')
    amt = amount(yway, input.price)
    if (input.type === 'sell') {
      const avail = stockFromParts(settings.opening_stock_yway, looseTxns(d), d.stockAdjustments)
      assertStockEnough(avail, yway, settings.digits)
    }
  }

  const now = new Date()
  let customerId = input.customerId
  if (input.newCustomer) {
    if (!input.newCustomer.name.trim()) throw new Error('ဝယ်သူအမည် ထည့်ပါ')
    const id = d.nextCustomerId++
    d.customers.push({
      id,
      name: input.newCustomer.name.trim(),
      phone: input.newCustomer.phone.trim(),
      nrc: input.newCustomer.nrc.trim(),
      address: input.newCustomer.address.trim(),
      created_at: now.toISOString(),
    })
    customerId = id
  } else if (customerId == null) {
    throw new Error('ဝယ်သူ ရွေးပါ သို့မဟုတ် အသစ်ထည့်ပါ')
  }
  const voucher_no = d.txns.reduce((m, t) => Math.max(m, t.voucher_no), 0) + 1
  const id = d.nextTxnId++
  d.txns.push({
    id,
    voucher_no,
    date: isoDate(now),
    time: isoTime(now),
    type: input.type,
    customer_id: customerId,
    yway,
    price: input.price,
    amount: amt,
    note: input.note || null,
    channel,
    card_fee: cardFeeStored,
  })
  if (channel === 'card') {
    for (const line of lines) {
      d.txnCards.push({
        id: d.nextTxnCardId++,
        txn_id: id,
        denom: line.denom,
        qty: line.qty,
      })
    }
  }
  persist()
  return id
}

export async function browserDeleteTxn(id: number): Promise<void> {
  const d = load()
  const txn = d.txns.find((t) => t.id === id)
  if (!txn) return
  const settings = await browserGetSettings()
  if (txn.channel === 'card' && txn.type === 'buy') {
    const lines = d.txnCards.filter((c) => c.txn_id === id)
    assertCardStockEnough(cardStock(d), normalizeCardLines(lines), settings.digits)
  } else if (txn.channel !== 'card' && txn.type === 'buy') {
    const avail = stockFromParts(settings.opening_stock_yway, looseTxns(d), d.stockAdjustments)
    assertStockEnough(avail, txn.yway, settings.digits)
  }
  d.txnCards = d.txnCards.filter((c) => c.txn_id !== id)
  d.txns = d.txns.filter((t) => t.id !== id)
  persist()
}

export async function browserSumsByType(): Promise<{ buyYway: number; sellYway: number }> {
  let buyYway = 0
  let sellYway = 0
  for (const t of load().txns) {
    if (t.type === 'buy') buyYway += t.yway
    else sellYway += t.yway
  }
  return { buyYway, sellYway }
}

export async function browserListStockAdjustments(): Promise<StockAdjustment[]> {
  return [...load().stockAdjustments].sort((a, b) => {
    const ka = `${a.date}T${a.time}`
    const kb = `${b.date}T${b.time}`
    return ka < kb ? -1 : ka > kb ? 1 : a.id - b.id
  })
}

export async function browserCreateStockAdjustment(
  kind: StockAdjKind,
  yway: number,
  note = ''
): Promise<number> {
  if (yway <= 0) throw new Error('ရွှေချိန် ထည့်ပါ')
  const d = load()
  if (kind === 'out') {
    const settings = await browserGetSettings()
    const avail = stockFromParts(settings.opening_stock_yway, looseTxns(d), d.stockAdjustments)
    assertStockEnough(avail, yway, settings.digits)
  }
  const now = new Date()
  const id = d.nextStockAdjId++
  d.stockAdjustments.push({
    id,
    date: isoDate(now),
    time: isoTime(now),
    kind,
    yway,
    note: note.trim() || null,
  })
  persist()
  return id
}

export async function browserDeleteStockAdjustment(id: number): Promise<void> {
  const d = load()
  const adj = d.stockAdjustments.find((a) => a.id === id)
  if (adj?.kind === 'in') {
    const settings = await browserGetSettings()
    const avail = stockFromParts(settings.opening_stock_yway, looseTxns(d), d.stockAdjustments)
    assertStockEnough(avail, adj.yway, settings.digits)
  }
  d.stockAdjustments = d.stockAdjustments.filter((a) => a.id !== id)
  persist()
}

export async function browserListCardOpenings(): Promise<CardOpening[]> {
  return [...load().cardOpenings]
}

export async function browserSetCardOpening(denom: string, qty: number): Promise<void> {
  const d = load()
  const row = d.cardOpenings.find((o) => o.denom === denom)
  if (row) row.qty = qty
  else d.cardOpenings.push({ denom, qty })
  persist()
}

export async function browserListCardAdjustments(): Promise<CardAdjustment[]> {
  return [...load().cardAdjustments].sort((a, b) => {
    const ka = `${a.date}T${a.time}`
    const kb = `${b.date}T${b.time}`
    return ka < kb ? -1 : ka > kb ? 1 : a.id - b.id
  })
}

export async function browserCreateCardAdjustment(
  kind: StockAdjKind,
  denom: string,
  qty: number,
  note = ''
): Promise<number> {
  if (qty <= 0) throw new Error('ကဒ် အရေအတွက် ထည့်ပါ')
  const d = load()
  if (kind === 'out') {
    const settings = await browserGetSettings()
    assertCardStockEnough(cardStock(d), normalizeCardLines([{ denom, qty }]), settings.digits)
  }
  const now = new Date()
  const id = d.nextCardAdjId++
  d.cardAdjustments.push({
    id,
    date: isoDate(now),
    time: isoTime(now),
    kind,
    denom,
    qty,
    note: note.trim() || null,
  })
  persist()
  return id
}

export async function browserDeleteCardAdjustment(id: number): Promise<void> {
  const d = load()
  const adj = d.cardAdjustments.find((a) => a.id === id)
  if (adj?.kind === 'in') {
    const settings = await browserGetSettings()
    assertCardStockEnough(
      cardStock(d),
      normalizeCardLines([{ denom: adj.denom, qty: adj.qty }]),
      settings.digits
    )
  }
  d.cardAdjustments = d.cardAdjustments.filter((a) => a.id !== id)
  persist()
}

export async function browserListTxnCards(txnId: number): Promise<TxnCard[]> {
  return load().txnCards.filter((c) => c.txn_id === txnId)
}

export async function browserListAllTxnCards(): Promise<TxnCard[]> {
  return [...load().txnCards]
}

export type { TxnType }
