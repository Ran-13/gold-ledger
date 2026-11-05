import { create } from 'zustand';

type AlertMode = 'alert' | 'confirm';

type AlertState = {
  open: boolean;
  mode: AlertMode;
  title: string;
  message: string;
  resolve: ((ok: boolean) => void) | null;
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  close: (ok: boolean) => void;
};

export const useAlertStore = create<AlertState>((set, get) => ({
  open: false,
  mode: 'alert',
  title: 'အသိပေးချက်',
  message: '',
  resolve: null,

  showAlert: (message, title = 'အသိပေးချက်') =>
    new Promise<void>((resolve) => {
      const prev = get().resolve;
      if (prev) prev(false);
      set({
        open: true,
        mode: 'alert',
        title,
        message,
        resolve: () => resolve(),
      });
    }),

  showConfirm: (message, title = 'အတည်ပြုရန်') =>
    new Promise<boolean>((resolve) => {
      const prev = get().resolve;
      if (prev) prev(false);
      set({
        open: true,
        mode: 'confirm',
        title,
        message,
        resolve,
      });
    }),

  close: (ok) => {
    const { resolve } = get();
    set({ open: false, message: '', resolve: null });
    resolve?.(ok);
  },
}));

/** Drop-in for `window.alert` */
export function appAlert(message: string, title?: string): Promise<void> {
  return useAlertStore.getState().showAlert(message, title);
}

/** Drop-in for `window.confirm` */
export function appConfirm(message: string, title?: string): Promise<boolean> {
  return useAlertStore.getState().showConfirm(message, title);
}
