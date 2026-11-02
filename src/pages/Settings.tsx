import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { Card } from '../components/Card';
import { Segmented } from '../components/Segmented';
import { closeDb, getDbPath, reopenDb, setSetting } from '../db/queries';
import { YWAY_PER_KYAT } from '../lib/units';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';
import type { RoundTo } from '../lib/units';

export function Settings() {
  const settings = useStore((s) => s.settings);
  const refresh = useStore((s) => s.refresh);
  const refreshSettings = useStore((s) => s.refreshSettings);

  const [openK, setOpenK] = useState(
    String(Math.round((settings.opening_stock_yway / YWAY_PER_KYAT) * 1000) / 1000),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const saveDigits = async (digits: 'latin' | 'myanmar') => {
    await setSetting('digits', digits);
    await refreshSettings();
  };

  const saveRound = async (round: RoundTo) => {
    await setSetting('round_to', String(round));
    await refreshSettings();
  };

  const saveOpening = async () => {
    const v = +openK || 0;
    await setSetting('opening_stock_yway', String(v * YWAY_PER_KYAT));
    await refreshSettings();
  };

  const backup = async () => {
    setBusy(true);
    setMsg('');
    try {
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
    if (!window.confirm('လက်ရှိဒေတာကို အစားထိုးမှာ သေချာပါသလား?')) return;
    setBusy(true);
    setMsg('');
    try {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontFamily: "'Noto Sans Myanmar', sans-serif", fontSize: 19, fontWeight: 700 }}>
            အစလက်ကျန်
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="number"
              min={0}
              step="any"
              value={openK}
              onChange={(e) => setOpenK(e.target.value)}
              style={{
                width: 140,
                height: 48,
                border: `1px solid ${colors.inputBorder}`,
                borderRadius: radii.input,
                padding: '0 14px',
                fontSize: 18,
                fontWeight: 600,
              }}
            />
            <span style={{ fontSize: 15, color: colors.muted }}>ကျပ်သား (အခေါက်)</span>
            <button
              type="button"
              onClick={() => void saveOpening()}
              style={{
                height: 48,
                padding: '0 20px',
                border: 'none',
                borderRadius: 8,
                background: colors.gold,
                color: colors.ink,
                fontWeight: 700,
                fontSize: 15,
              }}
            >
              သိမ်းမည်
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
                color: colors.goldOnNavy,
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
