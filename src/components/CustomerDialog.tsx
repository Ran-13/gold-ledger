import { useEffect, useState } from 'react';
import { Dialog, dialogBtnGhost, dialogBtnPrimary, dialogField, dialogLabel } from './Dialog';
import { createCustomer } from '../db/queries';
import { DEFAULT_NRC, isNrcComplete } from '../lib/nrc';
import { useStore } from '../store';
import { NrcPicker } from './NrcPicker';

export function CustomerDialog() {
  const open = useStore((s) => s.customerDialogOpen);
  const close = useStore((s) => s.closeCustomerDialog);
  const refresh = useStore((s) => s.refresh);
  const digits = useStore((s) => s.settings.digits);
  const [nc, setNc] = useState({ name: '', phone: '', nrc: DEFAULT_NRC, address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNc({ name: '', phone: '', nrc: DEFAULT_NRC, address: '' });
  }, [open]);

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
    if (!isNrcComplete(nc.nrc)) {
      window.alert('မှတ်ပုံတင် ပြည့်စုံရွေးပါ (နံပါတ် ၆ လုံး)');
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
      width={560}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={close} style={dialogBtnGhost}>
            ပိတ်မည်
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            style={{ ...dialogBtnPrimary, opacity: saving ? 0.7 : 1 }}
          >
            သိမ်းဆည်းမည်
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={dialogLabel}>ဝယ်သူအမည်</span>
          <input
            autoFocus
            value={nc.name}
            onChange={(e) => setNc((s) => ({ ...s, name: e.target.value }))}
            placeholder="ဥပမာ — ဦးအောင်မြင့်"
            style={dialogField}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
            }}
          />
        </label>
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 12, alignItems: 'end', minWidth: 0 }}>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flex: '0 1 140px',
              minWidth: 110,
            }}
          >
            <span style={dialogLabel}>ဖုန်း</span>
            <input
              value={nc.phone}
              onChange={(e) => setNc((s) => ({ ...s, phone: e.target.value }))}
              placeholder="09-…"
              className="num"
              style={dialogField}
              required
            />
          </label>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flex: '1 1 140px',
              minWidth: 120,
            }}
          >
            <span style={dialogLabel}>နေရပ်</span>
            <input
              value={nc.address}
              onChange={(e) => setNc((s) => ({ ...s, address: e.target.value }))}
              placeholder="လိပ်စာ"
              style={dialogField}
              required
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: '0 0 auto' }}>
            <span style={dialogLabel}>မှတ်ပုံတင်</span>
            <NrcPicker
              value={nc.nrc}
              onChange={(nrc) => setNc((s) => ({ ...s, nrc }))}
              digits={digits}
              height={48}
              inputStyle={dialogField}
            />
          </label>
        </div>
      </div>
    </Dialog>
  );
}
