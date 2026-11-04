import { isTauri } from '../db/env';

export type AutoBackupKind = 'txn' | 'daily' | 'weekly';

export type BackupResult = {
  path: string;
  kind: string;
  fileName: string;
  createdAt: string;
  skipped: boolean;
};

export type BackupStatus = {
  backupsDir: string;
  lastTxn: BackupResult | null;
  lastDaily: BackupResult | null;
  txnCount: number;
  dailyCount: number;
  recent: BackupResult[];
};

export async function restoreFromBackupFile(srcPath: string): Promise<void> {
  if (!isTauri()) throw new Error('Desktop app မှာသာ ပြန်ထည့်နိုင်သည်');
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('restore_database', { src: srcPath });
}

let txnBusy = false;
let dailyBusy = false;
let weeklyBusy = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Fire-and-forget / awaitable; never throws to caller. */
export async function runAutoBackup(kind: AutoBackupKind): Promise<BackupResult | null> {
  if (!isTauri()) return null;
  if (kind === 'txn' && txnBusy) return null;
  if (kind === 'daily' && dailyBusy) return null;
  if (kind === 'weekly' && weeklyBusy) return null;
  if (kind === 'txn') txnBusy = true;
  else if (kind === 'daily') dailyBusy = true;
  else weeklyBusy = true;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<BackupResult>('auto_backup_database', { kind });
  } catch (e) {
    console.warn('[auto-backup]', kind, e);
    return null;
  } finally {
    if (kind === 'txn') txnBusy = false;
    else if (kind === 'daily') dailyBusy = false;
    else weeklyBusy = false;
  }
}

/**
 * After durable writes — debounced so rapid edits = one snapshot.
 * Full DB file (customers, vouchers, stock, prices, settings).
 */
export function scheduleDbBackup(): void {
  if (!isTauri()) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void runAutoBackup('txn');
  }, 1800);
}

/** @deprecated use scheduleDbBackup */
export function scheduleTxnBackup(): void {
  scheduleDbBackup();
}

/** Daily + weekly snapshots (idempotent on Rust side). */
export function scheduleDailyBackup(): void {
  void (async () => {
    await runAutoBackup('daily');
    await runAutoBackup('weekly');
  })();
}

export async function fetchBackupStatus(): Promise<BackupStatus | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<BackupStatus>('get_auto_backup_status');
  } catch {
    return null;
  }
}
