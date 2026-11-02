export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface Price {
  date: string;
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
}
