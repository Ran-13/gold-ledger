import { create } from 'zustand';
import type { Customer, Price, Settings, Txn } from './db/types';
import * as db from './db/queries';
import { isoDate } from './lib/units';

export type Screen =
  | 'dash'
  | 'entry'
  | 'ledger'
  | 'voucher'
  | 'reports'
  | 'calc'
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
  settings: Settings;
  voucherId: number | null;
  flt: LedgerFilter;
  range: RangeKey;
  repMode: RepMode;
  repMetric: RepMetric;
  repMonth: string;
  repYear: number;
  error: string | null;

  setScreen: (s: Screen) => void;
  setVoucherId: (id: number | null) => void;
  setFlt: (partial: Partial<LedgerFilter>) => void;
  clearFlt: () => void;
  setRange: (r: RangeKey) => void;
  setRepMode: (m: RepMode) => void;
  setRepMetric: (m: RepMetric) => void;
  setRepMonth: (ym: string) => void;
  setRepYear: (y: number) => void;
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
  settings: { opening_stock_yway: 0, digits: 'latin', round_to: 100 },
  voucherId: null,
  flt: { type: 'all', q: '', from: '', to: '' },
  range: '30',
  repMode: 'day',
  repMetric: 'w',
  repMonth: today.slice(0, 7),
  repYear: new Date().getFullYear(),
  error: null,

  setScreen: (screen) => set({ screen }),
  setVoucherId: (voucherId) => set({ voucherId }),
  setFlt: (partial) => set({ flt: { ...get().flt, ...partial } }),
  clearFlt: () => set({ flt: { type: 'all', q: '', from: '', to: '' } }),
  setRange: (range) => set({ range }),
  setRepMode: (repMode) => set({ repMode }),
  setRepMetric: (repMetric) => set({ repMetric }),
  setRepMonth: (repMonth) => set({ repMonth }),
  setRepYear: (repYear) => set({ repYear }),

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
    const [customers, prices, txns, settings] = await Promise.all([
      db.listCustomers(),
      db.listPrices(),
      db.listTxns(),
      db.getSettings(),
    ]);
    set({ customers, prices, txns, settings });
  },

  refreshSettings: async () => {
    const settings = await db.getSettings();
    set({ settings });
  },
}));

export const NAV: { key: Screen; label: string; title: string }[] = [
  { key: 'dash', label: 'ပင်မ', title: 'ခြုံငုံကြည့်' },
  { key: 'entry', label: 'စာရင်းသွင်း', title: 'စာရင်းသွင်း' },
  { key: 'ledger', label: 'မှတ်တမ်း', title: 'အရောင်းအဝယ်မှတ်တမ်း' },
  { key: 'voucher', label: 'ဘောင်ချာ', title: 'ဘောင်ချာ' },
  { key: 'reports', label: 'အစီရင်ခံ', title: 'အစီရင်ခံစာ' },
  { key: 'calc', label: 'တွက်စက်', title: 'ရွှေတွက်စက်' },
  { key: 'customers', label: 'ဖောက်သည်', title: 'ဖောက်သည်များ' },
  { key: 'stock', label: 'လက်ကျန်', title: 'လက်ကျန်ရွှေ' },
  { key: 'prices', label: 'ပေါက်ဈေး', title: 'ပေါက်ဈေး သတ်မှတ်' },
];
