import { useEffect, useState } from 'react';
import { Dialog } from './Dialog';
import { createCustomer } from '../db/queries';
import { colors, radii } from '../styles/tokens';
import { useStore } from '../store';

export function CustomerDialog() {
  const open = useStore((s) => s.customerDialogOpen);
  const close = useStore((s) => s.closeCustomerDialog);
  const refresh = useStore((s) => s.refresh);
  const [nc, setNc] = useState({ name: '', phone: '', nrc: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNc({ name: '', phone: '', nrc: '', address: '' });
  }, [open]);

  const field = {
    height: 48,
    border: `1.5px solid ${colors.inputBorder}`,
    borderRadius: radii.input,
    padding: '0 14px',
    fontSize: 15,
    background: colors.white,
    width: '100%',
  } as const;

  const save = async () => {
    if (!nc.name.trim()) {
      window.alert('ဝယ်သူအမည် ထည့်ပါ');
      return;
    }
    if (!nc.phone.trim()) {
      window.alert('ဖုန်းနံပါတ် ထည့်ပါ');
      return;
    }
    if (!nc.address.trim()) {
      window.alert('နေရပ်လိပ်စာ ထည့်ပါ');
      return;
    }
    if (!nc.nrc.trim()) {
      window.alert('မှတ်ပုံတင် ထည့်ပါ');
      return;
    }
    setSaving(true);
    try {
      await createCustomer(
        nc.name.trim(),
        nc.phone.trim(),
        nc.address.trim(),
        nc.nrc.trim(),
      );
      await refresh();
      close();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      title="ဝယ်သူအသစ်"
      onClose={close}
      width={480}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            type="button"
            onClick={close}
            style={{
              height: 46,
              padding: '0 18px',
              border: `1.5px solid ${colors.inputBorder}`,
              borderRadius: 8,
              background: colors.white,
              color: colors.muted,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            ပိတ်မည်
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            style={{
              height: 46,
              padding: '0 22px',
              border: 'none',
              borderRadius: 8,
              background: colors.ink,
              color: colors.white,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            သိမ်းဆည်းမည်
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.muted }}>ဝယ်သူအမည်</span>
          <input
            autoFocus
            value={nc.name}
            onChange={(e) => setNc((s) => ({ ...s, name: e.target.value }))}
            placeholder="ဥပမာ — ဦးအောင်မြင့်"
            style={field}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
            }}
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.muted }}>ဖုန်းနံပါတ်</span>
          <input
            value={nc.phone}
            onChange={(e) => setNc((s) => ({ ...s, phone: e.target.value }))}
            placeholder="09-…"
            className="num"
            style={field}
            required
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.muted }}>
            မှတ်ပုံတင်နံပါတ်
          </span>
          <input
            value={nc.nrc}
            onChange={(e) => setNc((s) => ({ ...s, nrc: e.target.value }))}
            placeholder="ဥပမာ — 12/ABC(N)123456"
            className="num"
            style={field}
            required
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: colors.muted }}>နေရပ်လိပ်စာ</span>
          <input
            value={nc.address}
            onChange={(e) => setNc((s) => ({ ...s, address: e.target.value }))}
            placeholder="နေရပ်လိပ်စာ ထည့်ပါ"
            style={field}
            required
          />
        </label>
      </div>
    </Dialog>
  );
}
