import { useEffect } from 'react';
import {
  PRINT_VOUCHER_EVENT,
  SAVE_PRINT_ENTRY_EVENT,
  isMod,
  isTypingTarget,
} from '../lib/shortcuts';
import { useStore } from '../store';

/**
 * App-wide shop shortcuts:
 * N — open အရောင်း/အဝယ် (not while typing, not while a dialog is open)
 * P — open ရွှေစျေးပြင်ရန်
 * Ctrl/Cmd+P — print open voucher, or save+print from the entry dialog
 * Esc — already handled per dialog
 */
export function useAppShortcuts() {
  const authenticated = useStore((s) => s.authenticated);
  const openEntryDialog = useStore((s) => s.openEntryDialog);
  const openPriceDialog = useStore((s) => s.openPriceDialog);
  const entryDialogOpen = useStore((s) => s.entryDialogOpen);
  const voucherDialogOpen = useStore((s) => s.voucherDialogOpen);

  useEffect(() => {
    if (!authenticated) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;

      if (isMod(e) && e.code === 'KeyP') {
        e.preventDefault();
        if (voucherDialogOpen) {
          window.dispatchEvent(new Event(PRINT_VOUCHER_EVENT));
        } else if (entryDialogOpen) {
          window.dispatchEvent(new Event(SAVE_PRINT_ENTRY_EVENT));
        }
        return;
      }

      if (isTypingTarget(e.target) || e.altKey || isMod(e)) return;
      if (document.querySelector('[role="dialog"]')) return;

      if (e.code === 'KeyN') {
        e.preventDefault();
        openEntryDialog();
        return;
      }

      if (e.code === 'KeyP') {
        e.preventDefault();
        openPriceDialog();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    authenticated,
    openEntryDialog,
    openPriceDialog,
    entryDialogOpen,
    voucherDialogOpen,
  ]);
}
