import { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { isTauri } from '../db/env';
import { closeDb, getDbPath, reopenDb, setSetting } from '../db/queries';
import { W } from '../lib/units';
import { colors } from '../styles/tokens';
import { useStore } from '../store';
import type { RoundTo } from '../lib/units';

export function Settings() {
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const refreshSettings = useStore((s) => s.refreshSettings);
  const setScreen = useStore((s) => s.setScreen);
  const openOpeningStockDialog = useStore((s) => s.openOpeningStockDialog);
  const digits = settings.digits;

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [shopName, setShopName] = useState(settings.shop_name);
  const [shopMark, setShopMark] = useState(settings.shop_mark);
  const [shopTagline, setShopTagline] = useState(settings.shop_tagline);

  useEffect(() => {
    setShopName(settings.shop_name);
    setShopMark(settings.shop_mark);
    setShopTagline(settings.shop_tagline);
  }, [settings.shop_name, settings.shop_mark, settings.shop_tagline]);

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

  const saveRound = async (round: RoundTo) => {
    await setSetting('round_to', String(round));
    await refreshSettings();
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
    height: 46,
    border: `1.5px solid ${colors.inputBorder}`,
    borderRadius: 8,
    padding: '0 14px',
    fontSize: 15,
    background: colors.white,
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
            ဆိုင် အမှတ်တံဆိပ်
          </div>
          <div style={{ fontSize: 14, color: colors.muted, lineHeight: 1.5 }}>
            ဘောင်ချာနှင့် ဘေးဘားတွင် ပြမည့် ဆိုင်အမည် / တံဆိပ်
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>တံဆိပ်</span>
              <input
                value={shopMark}
                onChange={(e) => setShopMark(e.target.value.slice(0, 2))}
                placeholder="သ"
                style={{ ...field, textAlign: 'center', fontWeight: 700, fontSize: 20 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>ဆိုင်အမည်</span>
              <input
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="ဦးသန့်စင်"
                style={field}
              />
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.muted }}>စာတန်း</span>
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
            style={{
              alignSelf: 'flex-start',
              height: 44,
              padding: '0 18px',
              border: 'none',
              borderRadius: 8,
              background: colors.ink,
              color: colors.white,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            သိမ်းဆည်းမည်
          </button>
        </div>
      </Card>

      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
            ပြသမှု
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>ဂဏန်းများ</span>
            <Segmented
              options={[
                { value: 'latin', label: '0–9 (Latin)' },
                { value: 'myanmar', label: '၀–၉ (Myanmar)' },
              ]}
              value={settings.digits}
              onChange={(v) => void saveDigits(v)}
            />
          </div>
        </div>
      </Card>

      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
            တွက်ချက်မှု
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>ကျသင့်ငွေ ပိတ်ချိန်</span>
            <Segmented
              options={[
                { value: '1', label: '၁ ကျပ်' },
                { value: '100', label: '၁၀၀ ကျပ်' },
                { value: '1000', label: '၁၀၀၀ ကျပ်' },
              ]}
              value={String(settings.round_to)}
              onChange={(v) => void saveRound(Number(v) as RoundTo)}
            />
          </div>
        </div>
      </Card>

      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
            လက်ကျန် စီမံခြင်း
          </div>
          <div style={{ fontSize: 15, color: colors.muted, lineHeight: 1.55 }}>
            အစလက်ကျန် ယခု —{' '}
            <b className="num" style={{ color: colors.ink }}>
              {W(settings.opening_stock_yway, digits)}
            </b>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={openOpeningStockDialog}
              style={{
                height: 44,
                padding: '0 18px',
                border: 'none',
                borderRadius: 8,
                background: colors.ink,
                color: colors.white,
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              အစလက်ကျန် ပြင်မည်
            </button>
            <button
              type="button"
              onClick={() => setScreen('stock')}
              style={{
                height: 44,
                padding: '0 18px',
                border: `1.5px solid ${colors.ink}`,
                borderRadius: 8,
                background: colors.white,
                color: colors.ink,
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              လက်ကျန်စာမျက်နှာသို့ →
            </button>
          </div>
        </div>
      </Card>

      <Card padding="28px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
            ဒေတာ
          </div>
          <div style={{ fontSize: 14, color: colors.muted2, wordBreak: 'break-all' }}>{getDbPath() || '—'}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={busy}
              onClick={() => void backup()}
              style={{
                height: 48,
                padding: '0 22px',
                border: 'none',
                borderRadius: 8,
                background: colors.ink,
                color: colors.white,
                fontWeight: 700,
                fontSize: 16,
              }}
            >
              ဒေတာအရံသိမ်းမည်
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void restore()}
              style={{
                height: 48,
                padding: '0 22px',
                border: `1.5px solid ${colors.ink}`,
                borderRadius: 8,
                background: 'none',
                color: colors.ink,
                fontWeight: 600,
                fontSize: 16,
              }}
            >
              ဒေတာပြန်ထည့်မည်
            </button>
          </div>
          {msg && (
            <div style={{ fontSize: 15, color: msg.includes('ပြီး') ? colors.sell : colors.buy }}>{msg}</div>
          )}
        </div>
      </Card>
    </div>
  );
}
