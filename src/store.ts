import { create } from 'zustand';
import type {
  CardAdjustment,
  CardOpening,
  Customer,
  Price,
  Settings,
  StockAdjustment,
  Txn,
  TxnCard,
} from './db/types';
import * as db from './db/queries';
import { scheduleDailyBackup } from './lib/autoBackup';
import { DEFAULT_CARD_FEE, type CardDenom } from './lib/cards';
import { isoDate } from './lib/units';

export type Screen =
  | 'dash'
  | 'entry'
  | 'ledger'
  | 'voucher'
  | 'reports'
  | 'customers'
  | 'stock'
  | 'prices'
  | 'settings';

export type RepMode = 'day' | 'month' | 'year';
export type RepMetric = 'w' | 'm';
export type RangeKey = '7' | '30' | '90' | 'all';

interface LedgerFilter {
  type: 'all' | 'sell' | 'buy';
  channel: 'all' | 'card' | 'loose';
  q: string;
  from: string;
  to: string;
}

interface AppState {
  ready: boolean;
  screen: Screen;
  customers: Customer[];
  prices: Price[];
  txns: Txn[];
  stockAdjustments: StockAdjustment[];
  cardOpenings: CardOpening[];
  cardAdjustments: CardAdjustment[];
  txnCards: TxnCard[];
  settings: Settings;
  voucherId: number | null;
  flt: LedgerFilter;
  range: RangeKey;
  repMode: RepMode;
  repMetric: RepMetric;
  repMonth: string;
  repYear: number;
  error: string | null;
  entryDialogOpen: boolean;
  customerDialogOpen: boolean;
  priceDialogOpen: boolean;
  openingStockDialogOpen: boolean;
  stockAdjustDialogOpen: boolean;
  stockAdjustKind: 'in' | 'out';
  cardOpeningDialogOpen: boolean;
  cardAdjustDialogOpen: boolean;
  cardAdjustKind: 'in' | 'out';
  cardAdjustDenom: CardDenom | null;
  /** After save → open voucher and print once */
  printAfterOpen: boolean;
  voucherDialogOpen: boolean;

  setScreen: (s: Screen) => void;
  setVoucherId: (id: number | null) => void;
  setPrintAfterOpen: (v: boolean) => void;
  openVoucher: (id: number, opts?: { print?: boolean }) => void;
  closeVoucherDialog: () => void;
  setFlt: (partial: Partial<LedgerFilter>) => void;
  clearFlt: () => void;
  setRange: (r: RangeKey) => void;
  setRepMode: (m: RepMode) => void;
  setRepMetric: (m: RepMetric) => void;
  setRepMonth: (ym: string) => void;
  setRepYear: (y: number) => void;
  openEntryDialog: () => void;
  closeEntryDialog: () => void;
  openCustomerDialog: () => void;
  closeCustomerDialog: () => void;
  openPriceDialog: () => void;
  closePriceDialog: () => void;
  openOpeningStockDialog: () => void;
  closeOpeningStockDialog: () => void;
  openStockAdjustDialog: (kind: 'in' | 'out') => void;
  closeStockAdjustDialog: () => void;
  openCardOpeningDialog: () => void;
  closeCardOpeningDialog: () => void;
  openCardAdjustDialog: (kind: 'in' | 'out', denom: CardDenom) => void;
  closeCardAdjustDialog: () => void;
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshSettings: () => Promise<void>;
}

const today = isoDate();

export const useStore = create<AppState>((set, get) => ({
  ready: false,
  screen: 'dash',
  customers: [],
  prices: [],
  txns: [],
  stockAdjustments: [],
  cardOpenings: [],
  cardAdjustments: [],
  txnCards: [],
  settings: {
    opening_stock_yway: 0,
    digits: 'latin',
    shop_name: 'ဦးသန့်စင်',
    shop_mark: 'သ',
    shop_tagline: 'အခေါက်ရွှေ အရောင်းအဝယ်',
    card_fee: DEFAULT_CARD_FEE,
  },
  voucherId: null,
  flt: { type: 'all', channel: 'all', q: '', from: today, to: today },
  range: '30',
  repMode: 'day',
  repMetric: 'w',
  repMonth: today.slice(0, 7),
  repYear: new Date().getFullYear(),
  error: null,
  entryDialogOpen: false,
  customerDialogOpen: false,
  priceDialogOpen: false,
  openingStockDialogOpen: false,
  stockAdjustDialogOpen: false,
  stockAdjustKind: 'in',
  cardOpeningDialogOpen: false,
  cardAdjustDialogOpen: false,
  cardAdjustKind: 'in',
  cardAdjustDenom: null,
  printAfterOpen: false,
  voucherDialogOpen: false,

  setScreen: (screen) => {
    if (screen === 'entry') {
      set({ entryDialogOpen: true });
      return;
    }
    // ဘောင်ချာ = မှတ်တမ်း ထဲက dialog — separate screen မလို
    if (screen === 'voucher') {
      set({ voucherDialogOpen: true, screen: get().screen === 'voucher' ? 'ledger' : get().screen });
      return;
    }
    set({ screen });
  },
  setVoucherId: (voucherId) => set({ voucherId }),
  setPrintAfterOpen: (printAfterOpen) => set({ printAfterOpen }),
  openVoucher: (id, opts) =>
    set({
      voucherId: id,
      voucherDialogOpen: true,
      printAfterOpen: !!opts?.print,
    }),
  closeVoucherDialog: () => set({ voucherDialogOpen: false, printAfterOpen: false }),
  setFlt: (partial) => set({ flt: { ...get().flt, ...partial } }),
  clearFlt: () => {
    const d = isoDate();
    set({ flt: { type: 'all', channel: 'all', q: '', from: d, to: d } });
  },
  setRange: (range) => set({ range }),
  setRepMode: (repMode) => set({ repMode }),
  setRepMetric: (repMetric) => set({ repMetric }),
  setRepMonth: (repMonth) => set({ repMonth }),
  setRepYear: (repYear) => set({ repYear }),
  openEntryDialog: () => set({ entryDialogOpen: true }),
  closeEntryDialog: () => set({ entryDialogOpen: false }),
  openCustomerDialog: () => set({ customerDialogOpen: true }),
  closeCustomerDialog: () => set({ customerDialogOpen: false }),
  openPriceDialog: () => set({ priceDialogOpen: true }),
  closePriceDialog: () => set({ priceDialogOpen: false }),
  openOpeningStockDialog: () => set({ openingStockDialogOpen: true }),
  closeOpeningStockDialog: () => set({ openingStockDialogOpen: false }),
  openStockAdjustDialog: (kind) => set({ stockAdjustDialogOpen: true, stockAdjustKind: kind }),
  closeStockAdjustDialog: () => set({ stockAdjustDialogOpen: false }),
  openCardOpeningDialog: () => set({ cardOpeningDialogOpen: true }),
  closeCardOpeningDialog: () => set({ cardOpeningDialogOpen: false }),
  openCardAdjustDialog: (kind, denom) =>
    set({ cardAdjustDialogOpen: true, cardAdjustKind: kind, cardAdjustDenom: denom }),
  closeCardAdjustDialog: () => set({ cardAdjustDialogOpen: false }),

  bootstrap: async () => {
    try {
      await get().refresh();
      set({ ready: true, error: null });
      // Daily snapshot once per calendar day (idempotent)
      scheduleDailyBackup();
    } catch (e) {
      set({
        ready: true,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  refresh: async () => {
    const [
      customers,
      prices,
      txns,
      stockAdjustments,
      settings,
      cardOpenings,
      cardAdjustments,
      txnCards,
    ] = await Promise.all([
      db.listCustomers(),
      db.listPrices(),
      db.listTxns(),
      db.listStockAdjustments(),
      db.getSettings(),
      db.listCardOpenings(),
      db.listCardAdjustments(),
      db.listAllTxnCards(),
    ]);
    set({
      customers,
      prices,
      txns,
      stockAdjustments,
      settings,
      cardOpenings,
      cardAdjustments,
      txnCards,
    });
  },

  refreshSettings: async () => {
    const settings = await db.getSettings();
    set({ settings });
  },
}));

export const NAV: { key: Screen; label: string; title: string }[] = [
  { key: 'dash', label: 'ပင်မ', title: 'ပင်မ' },
  { key: 'ledger', label: 'မှတ်တမ်း', title: 'မှတ်တမ်း' },
  { key: 'reports', label: 'စာရင်းအင်း', title: 'စာရင်းအင်း' },
  { key: 'customers', label: 'ဝယ်သူ', title: 'ဝယ်သူများ' },
  { key: 'stock', label: 'လက်ကျန်', title: 'လက်ကျန်' },
  { key: 'prices', label: 'စျေးနှုန်း', title: 'စျေးနှုန်း' },
];
