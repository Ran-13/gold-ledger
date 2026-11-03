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
}

export interface Settings {
  opening_stock_yway: number;
  digits: 'latin' | 'myanmar';
  round_to: 1 | 100 | 1000;
  shop_name: string;
  shop_mark: string;
  shop_tagline: string;
}

/** Manual stock add (in) or remove (out) — not a buy/sell txn */
export type StockAdjKind = 'in' | 'out';

export interface StockAdjustment {
  id: number;
  date: string;
  time: string;
  kind: StockAdjKind;
  yway: number;
  note: string | null;
}

export interface SaveTxnInput {
  type: TxnType;
  customerId: number | null;
  newCustomer?: { name: string; phone: string; nrc: string; address: string };
  k: number;
  p: number;
  y: number;
  price: number;
  note: string;
  roundTo: 1 | 100 | 1000;
}
