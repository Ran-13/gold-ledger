/** Custom events so dialogs can react without a shared print callback. */
export const PRINT_VOUCHER_EVENT = 'gl:print-voucher';
export const SAVE_PRINT_ENTRY_EVENT = 'gl:save-print-entry';

/** True when the user is typing in a field — skip letter shortcuts. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined') return false;
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));
}

export function isMod(e: { ctrlKey: boolean; metaKey: boolean }): boolean {
  return e.ctrlKey || e.metaKey;
}

export function modLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? '⌘' : 'Ctrl';
}
