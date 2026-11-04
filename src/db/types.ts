export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  nrc: string | null;
  address: string | null;
  created_at: string;
}

export interface Price {
  id: number;
  date: string;
  time: string;
  buy: number;
  sell: number;
}

export type TxnType = 'sell' | 'buy';
export type TxnChannel = 'card' | 'loose';

export interface Txn {
  id: number;
  voucher_no: number;
  date: string;
  time: string;
  type: TxnType;
  customer_id: number | null;
  yway: number;
  price: number;
  amount: number;
  note: string | null;
  channel: TxnChannel;
  /** Per-card fee rate used at transaction time (card channel only). */
  card_fee: number;
}

export type PrintSize = 'S' | 'M' | 'L';

export interface Settings {
  opening_stock_yway: number;
  digits: 'latin' | 'myanmar';
  shop_name: string;
  shop_mark: string;
  shop_tagline: string;
  card_fee: number;
  /** Voucher print slip size — S smaller, M default (A4/4), L larger */
  print_size: PrintSize;
  auth_username: string;
  /** SHA-256 hex of password */
  auth_password_hash: string;
}

/** Manual stock add (in) or remove (out) — not a buy/sell txn (loose gold) */
export type StockAdjKind = 'in' | 'out';

export interface StockAdjustment {
  id: number;
  date: string;
  time: string;
  kind: StockAdjKind;
  yway: number;
  note: string | null;
}

export interface CardOpening {
  denom: string;
  qty: number;
}

export interface CardAdjustment {
  id: number;
  date: string;
  time: string;
  kind: StockAdjKind;
  denom: string;
  qty: number;
  note: string | null;
}

export interface TxnCard {
  id: number;
  txn_id: number;
  denom: string;
  qty: number;
}

export interface SaveTxnInput {
  type: TxnType;
  channel?: TxnChannel;
  customerId: number | null;
  newCustomer?: { name: string; phone: string; nrc: string; address: string };
  /** Loose mode units */
  k: number;
  p: number;
  y: number;
  price: number;
  note: string;
  /** Card mode lines — required when channel === 'card' */
  cards?: Array<{ denom: string; qty: number }>;
  /** Fee per card at save time (defaults to settings) */
  cardFee?: number;
}
