import { create } from 'zustand';
import type { Customer, Price, Settings, StockAdjustment, Txn } from './db/types';
import * as db from './db/queries';
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
  /** After save → open voucher and print once */
  printAfterOpen: boolean;

  setScreen: (s: Screen) => void;
  setVoucherId: (id: number | null) => void;
  setPrintAfterOpen: (v: boolean) => void;
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
  settings: {
    opening_stock_yway: 0,
    digits: 'latin',
    round_to: 100,
    shop_name: 'ဦးသန့်စင်',
    shop_mark: 'သ',
    shop_tagline: 'အခေါက်ရွှေ အရောင်းအဝယ်',
  },
  voucherId: null,
  flt: { type: 'all', q: '', from: '', to: '' },
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
  printAfterOpen: false,

  setScreen: (screen) => {
    if (screen === 'entry') {
      set({ entryDialogOpen: true });
      return;
    }
    set({ screen });
  },
  setVoucherId: (voucherId) => set({ voucherId }),
  setPrintAfterOpen: (printAfterOpen) => set({ printAfterOpen }),
  setFlt: (partial) => set({ flt: { ...get().flt, ...partial } }),
  clearFlt: () => set({ flt: { type: 'all', q: '', from: '', to: '' } }),
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

  bootstrap: async () => {
    try {
      await get().refresh();
      set({ ready: true, error: null });
    } catch (e) {
      set({
        ready: true,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },

  refresh: async () => {
    const [customers, prices, txns, stockAdjustments, settings] = await Promise.all([
      db.listCustomers(),
      db.listPrices(),
      db.listTxns(),
      db.listStockAdjustments(),
      db.getSettings(),
    ]);
    set({ customers, prices, txns, stockAdjustments, settings });
  },

  refreshSettings: async () => {
    const settings = await db.getSettings();
    set({ settings });
  },
}));

export const NAV: { key: Screen; label: string; title: string }[] = [
  { key: 'dash', label: 'ပင်မ', title: 'ပင်မ' },
  { key: 'ledger', label: 'မှတ်တမ်း', title: 'အရောင်းအဝယ်မှတ်တမ်း' },
  { key: 'voucher', label: 'ဘောင်ချာစာရင်း', title: 'ဘောင်ချာစာရင်း' },
  { key: 'reports', label: 'စာရင်းစစ်ခြင်း', title: 'စာရင်းစစ်ခြင်း' },
  { key: 'customers', label: 'ဝယ်သူ', title: 'ဝယ်သူများ' },
  { key: 'stock', label: 'လက်ကျန်စီမံ', title: 'လက်ကျန် စီမံခြင်း' },
  { key: 'prices', label: 'စျေးနှုန်း', title: 'စျေးနှုန်းပြင်ဆင်ရန်' },
];
