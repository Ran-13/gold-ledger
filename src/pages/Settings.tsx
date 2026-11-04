import { useCallback, useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { PageTitle, clearOutlineBtn, clearPrimaryBtn } from '../components/ClearUI';
import { Segmented } from '../components/Segmented';
import { isTauri } from '../db/env';
import { closeDb, getDbPath, reopenDb, setSetting } from '../db/queries';
import {
  fetchBackupStatus,
  restoreFromBackupFile,
  runAutoBackup,
  type BackupStatus,
} from '../lib/autoBackup';
import { keepNumInput, money, N } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function Settings() {
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const refreshSettings = useStore((s) => s.refreshSettings);
  const digits = settings.digits;

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [shopName, setShopName] = useState(settings.shop_name);
  const [shopMark, setShopMark] = useState(settings.shop_mark);
  const [shopTagline, setShopTagline] = useState(settings.shop_tagline);
  const [cardFee, setCardFee] = useState(String(settings.card_fee));
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [restorePick, setRestorePick] = useState('');

  const reloadBackupStatus = useCallback(async () => {
    const st = await fetchBackupStatus();
    setBackupStatus(st);
    if (st?.lastTxn?.path) setRestorePick(st.lastTxn.path);
    else if (st?.recent?.[0]?.path) setRestorePick(st.recent[0].path);
  }, []);

  const restoreFromAuto = async (srcPath: string) => {
    if (!isTauri()) {
      setMsg('Desktop app (.exe) မှာသာ ပြန်ထည့်နိုင်သည်');
      return;
    }
    if (!srcPath) {
      setMsg('ပြန်ယူမည့် အရံဖိုင် မရှိသေးပါ — အရောင်း/အဝယ် တစ်ခု သိမ်းပြီးမှ ရပါမည်');
      return;
    }
    if (
      !window.confirm(
        'လက်ရှိဒေတာကို အရံနဲ့ အစားထိုးမည်။\nအစကနေ နောက်ဆုံးသိမ်းထားသည့် စာရင်းအထိ ပြန်ရမည်။\nလက်ရှိအခြေအနေကိုလည်း အရံအဖြစ် သိမ်းထားပါမည်။\nဆက်လုပ်မလား?',
      )
    ) {
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      await closeDb();
      await restoreFromBackupFile(srcPath);
      await reopenDb();
      await refresh();
      await refreshSettings();
      await reloadBackupStatus();
      setMsg('ဒေတာ ပြန်ရပြီးပါပြီ — အစကနေ နောက်ဆုံးအရံအထိ');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      try {
        await reopenDb();
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setShopName(settings.shop_name);
    setShopMark(settings.shop_mark);
    setShopTagline(settings.shop_tagline);
    setCardFee(String(settings.card_fee));
  }, [settings.shop_name, settings.shop_mark, settings.shop_tagline, settings.card_fee]);

  useEffect(() => {
    void reloadBackupStatus();
  }, [reloadBackupStatus]);

  const saveDigits = async (digitsMode: 'latin' | 'myanmar') => {
    await setSetting('digits', digitsMode);
    await refreshSettings();
  };

  const saveShop = async () => {
    await setSetting('shop_name', shopName.trim() || 'ဦးသန့်စင်');
    await setSetting('shop_mark', shopMark.trim() || 'သ');
    await setSetting('shop_tagline', shopTagline.trim() || 'အခေါက်ရွှေ အရောင်းအဝယ်');
    await refreshSettings();
    setMsg('ဆိုင်အမှတ်တံဆိပ် သိမ်းပြီးပါပြီ');
  };

  const saveCardFee = async () => {
    const fee = Math.max(0, Math.round(N(cardFee)) || 0);
    await setSetting('card_fee', String(fee));
    await refreshSettings();
    setMsg(`ကဒ်ဖိုး သိမ်းပြီး · ${money(fee, digits)}`);
  };

  const backup = async () => {
    if (!isTauri()) {
      setMsg('Backup သည် Desktop app (.exe) ထဲမှာသာ ရပါသည်');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const dest = await save({
        title: 'ဒေတာအရံသိမ်းမည်',
        defaultPath: `gold-ledger-backup-${new Date().toISOString().slice(0, 10)}.db`,
        filters: [{ name: 'SQLite', extensions: ['db'] }],
      });
      if (!dest) return;
      await invoke('backup_database', { dest });
      await reloadBackupStatus();
      setMsg('အရံသိမ်းပြီးပါပြီ');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!isTauri()) {
      setMsg('Restore သည် Desktop app (.exe) ထဲမှာသာ ရပါသည်');
      return;
    }
    if (!window.confirm('လက်ရှိဒေတာကို အစားထိုးမှာ သေချာပါသလား?')) return;
    setBusy(true);
    setMsg('');
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const src = await open({
        title: 'ဒေတာပြန်ထည့်မည်',
        multiple: false,
        filters: [{ name: 'SQLite', extensions: ['db'] }],
      });
      if (!src || Array.isArray(src)) return;
      await closeDb();
      await invoke('restore_database', { src });
      await reopenDb();
      await refresh();
      await refreshSettings();
      setMsg('ပြန်ထည့်ပြီးပါပြီ');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
      try {
        await reopenDb();
      } catch {
        /* ignore */
      }
    } finally {
      setBusy(false);
    }
  };

  const field = {
    height: 44,
    border: `1px solid ${colors.cardBorder}`,
    borderRadius: 8,
    padding: '0 12px',
    fontSize: 17,
    lineHeight: 1.5,
    background: colors.white,
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>
      <PageTitle>ဆက်တင်</PageTitle>

      <Card padding="20px 22px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.45 }}>ဆိုင်အမည်</div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: colors.muted }}>တံဆိပ်</span>
              <input
                value={shopMark}
                onChange={(e) => setShopMark(e.target.value.slice(0, 2))}
                placeholder="သ"
                style={{ ...field, textAlign: 'center', fontWeight: 700, fontSize: 22 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: colors.muted }}>ဆိုင်အမည်</span>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="ဦးသန့်စင်"
                style={field}
              />
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: colors.muted }}>စာတန်း</span>
            <input
              value={shopTagline}
              onChange={(e) => setShopTagline(e.target.value)}
              placeholder="အခေါက်ရွှေ အရောင်းအဝယ်"
              style={field}
            />
          </label>
          <button
            type="button"
            onClick={() => void saveShop()}
            style={{ ...clearPrimaryBtn, alignSelf: 'flex-start', height: 44 }}
          >
            သိမ်းဆည်းမည်
          </button>
        </div>
      </Card>

      <Card padding="20px 22px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>ဂဏန်းပုံစံ</div>
          <div style={{ fontSize: 15, color: colors.muted2, lineHeight: 1.5 }}>
            စာမျက်နှာများပေါ်တွင် ပြမည့် ဂဏန်းပုံစံ
          </div>
          <Segmented
            options={[
              { value: 'latin', label: '0–9' },
              { value: 'myanmar', label: '၀–၉' },
            ]}
            value={settings.digits}
            onChange={(v) => void saveDigits(v)}
          />
        </div>
      </Card>

      <Card padding="20px 22px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>ကဒ်တစ်ခုဖိုး</div>
          <div style={{ fontSize: 15, color: colors.muted2, lineHeight: 1.5 }}>
            ကဒ်ရောင်း/ဝယ်တိုင်း ထည့်သည့် ကဒ်ဖိုး (ကျပ်)
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              inputMode="numeric"
              className="num"
              value={cardFee}
              onChange={(e) => setCardFee(keepNumInput(e.target.value))}
              style={{
                height: 44,
                width: 160,
                border: `1px solid ${colors.cardBorder}`,
                borderRadius: 8,
                padding: '0 12px',
                fontSize: 20,
                fontWeight: 700,
                textAlign: 'right',
              }}
            />
            <button type="button" onClick={() => void saveCardFee()} style={{ ...clearPrimaryBtn, height: 44 }}>
              သိမ်းမည်
            </button>
          </div>
        </div>
      </Card>

      <Card padding="20px 22px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>အလိုအလျောက် အရံသိမ်း / ပြန်ယူ</div>
          <div style={{ fontSize: 15, color: colors.muted2, lineHeight: 1.55 }}>
            ဒေတာပြောင်းတိုင်း (ဝယ်သူ · ဘောင်ချာ · လက်ကျန် · စျေး) အရံယူသည်။ ပြန်ယူရင် DB အပြည့် —
            ဝယ်သူ၊ ဘောင်ချာ၊ လက်ကျန်၊ စျေး အကုန် ပြန်ရမည်။ စာရင်းအရံ{' '}
            {digits === 'myanmar' ? '၁၀၀' : '100'} · နေ့စဉ် {digits === 'myanmar' ? '၉၀' : '90'} ·
            အပတ်စဉ် {digits === 'myanmar' ? '၅၂' : '52'} ထိန်းထားသည်။
          </div>
          {backupStatus && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px 14px',
                borderRadius: 8,
                border: `1px solid ${colors.cardBorder}`,
                background: '#FAFBFC',
                fontSize: 15,
                lineHeight: 1.5,
              }}
            >
              <div>
                <span style={{ color: colors.muted, fontWeight: 600 }}>ဖိုလ်ဒါ · </span>
                <span style={{ wordBreak: 'break-all' }}>{backupStatus.backupsDir}</span>
              </div>
              <div>
                <span style={{ color: colors.muted, fontWeight: 600 }}>နောက်ဆုံး သိမ်း (စာရင်း) · </span>
                {backupStatus.lastTxn
                  ? `${backupStatus.lastTxn.createdAt} · ${backupStatus.lastTxn.fileName}`
                  : '—'}
              </div>
              <div>
                <span style={{ color: colors.muted, fontWeight: 600 }}>နေ့စဉ် · </span>
                {backupStatus.lastDaily
                  ? `${backupStatus.lastDaily.createdAt} · ${backupStatus.lastDaily.fileName}`
                  : '—'}
              </div>
              <div style={{ color: colors.muted2, fontSize: 14 }}>
                စာရင်းအရံ {backupStatus.txnCount} ဖိုင် · နေ့စဉ် {backupStatus.dailyCount} ဖိုင်
              </div>
            </div>
          )}

          {isTauri() && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.45 }}>ဒေတာ ပြန်ယူမည်</div>
              <div style={{ fontSize: 14, color: colors.muted2, lineHeight: 1.5 }}>
                နောက်ဆုံးအရံမှ ပြန်ယူရင် ဝယ်သူ · ဘောင်ချာ · လက်ကျန် · စျေး အစကနေ ထိုအချိန်အထိ
                အကုန် ပြန်ရမည်။
              </div>
              <select
                value={restorePick}
                onChange={(e) => setRestorePick(e.target.value)}
                disabled={busy || !(backupStatus?.recent.length)}
                style={{
                  height: 44,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: 8,
                  padding: '0 12px',
                  fontSize: 15,
                  fontWeight: 600,
                  background: colors.white,
                  maxWidth: '100%',
                }}
              >
                {(backupStatus?.recent ?? []).length === 0 && (
                  <option value="">အရံ မရှိသေးပါ</option>
                )}
                {(backupStatus?.recent ?? []).map((b) => (
                  <option key={b.path} value={b.path}>
                    {b.kind === 'txn'
                      ? 'စာရင်း'
                      : b.kind === 'daily'
                        ? 'နေ့စဉ်'
                        : b.kind === 'weekly'
                          ? 'အပတ်စဉ်'
                          : 'ပြန်ယူမတိုင်မီ'}{' '}
                    · {b.createdAt} · {b.fileName}
                  </option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={busy || !backupStatus?.lastTxn}
                  onClick={() =>
                    void restoreFromAuto(backupStatus?.lastTxn?.path || restorePick)
                  }
                  style={{
                    ...clearPrimaryBtn,
                    height: 46,
                    fontSize: 16,
                    opacity: busy || !backupStatus?.lastTxn ? 0.55 : 1,
                  }}
                >
                  နောက်ဆုံးအရံက ပြန်ယူမည်
                </button>
                <button
                  type="button"
                  disabled={busy || !restorePick}
                  onClick={() => void restoreFromAuto(restorePick)}
                  style={{
                    ...clearOutlineBtn,
                    height: 46,
                    fontSize: 16,
                    opacity: busy || !restorePick ? 0.55 : 1,
                  }}
                >
                  ရွေးထားသည်ကို ပြန်ယူမည်
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    void (async () => {
                      setBusy(true);
                      setMsg('');
                      try {
                    await runAutoBackup('daily');
                    await runAutoBackup('weekly');
                    await runAutoBackup('txn');
                    await reloadBackupStatus();
                    setMsg('အလိုအလျောက် အရံ ခုတင် သိမ်းပြီးပါပြီ');
                      } catch (e) {
                        setMsg(e instanceof Error ? e.message : String(e));
                      } finally {
                        setBusy(false);
                      }
                    })();
                  }}
                  style={{ ...clearOutlineBtn, height: 46, opacity: busy ? 0.6 : 1 }}
                >
                  ခုတင် အရံသိမ်းမည်
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card padding="20px 22px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>ဒေတာ အရံ / ပြန်ထည့် (ကိုယ်တိုင်)</div>
          <div style={{ fontSize: 14, color: colors.muted2, wordBreak: 'break-all', lineHeight: 1.5 }}>
            DB · {getDbPath() || '—'}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void backup()}
              style={{ ...clearPrimaryBtn, height: 44, opacity: busy ? 0.6 : 1 }}
            >
              ဖိုင်အဖြစ် ထုတ်မည်
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void restore()}
              style={{ ...clearOutlineBtn, height: 44, opacity: busy ? 0.6 : 1 }}
            >
              ပြန်ထည့်မည်
            </button>
          </div>
          {msg && (
            <div style={{ fontSize: 16, color: msg.includes('ပြီး') ? colors.sell : colors.buy }}>{msg}</div>
          )}
        </div>
      </Card>
    </div>
  );
}
