import { useEffect, useState } from 'react';
import { Dialog, dialogBtnGhost, dialogBtnPrimary, dialogField, dialogLabel } from './Dialog';
import { IconId, IconMapPin, IconPhone, IconSave, IconUser } from './Icons';
import { KbdHint } from './KbdHint';
import { createCustomer, updateCustomer } from '../db/queries';
import { DEFAULT_NRC, isNrcComplete, parseNrc } from '../lib/nrc';
import { useStore } from '../store';
import { NrcPicker } from './NrcPicker';

export function CustomerDialog() {
  const open = useStore((s) => s.customerDialogOpen);
  const close = useStore((s) => s.closeCustomerDialog);
  const editingId = useStore((s) => s.editingCustomerId);
  const refresh = useStore((s) => s.refresh);
  const digits = useStore((s) => s.settings.digits);
  const [nc, setNc] = useState({ name: '', phone: '', nrc: DEFAULT_NRC, address: '' });
  const [saving, setSaving] = useState(false);
  const editing = editingId != null;

  useEffect(() => {
    if (!open) {
      setNc({ name: '', phone: '', nrc: DEFAULT_NRC, address: '' });
      return;
    }
    if (editingId != null) {
      const c = useStore.getState().customers.find((x) => x.id === editingId);
      if (c) {
        const raw = c.nrc?.trim() || '';
        setNc({
          name: c.name,
          phone: c.phone || '',
          nrc: parseNrc(raw) ? raw : DEFAULT_NRC,
          address: c.address || '',
        });
        return;
      }
    }
    setNc({ name: '', phone: '', nrc: DEFAULT_NRC, address: '' });
  }, [open, editingId]);

  const save = async () => {
    if (saving) return;
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
      if (editingId != null) {
        await updateCustomer(
          editingId,
          nc.name.trim(),
          nc.phone.trim(),
          nc.address.trim(),
          nc.nrc.trim(),
        );
      } else {
        await createCustomer(
          nc.name.trim(),
          nc.phone.trim(),
          nc.address.trim(),
          nc.nrc.trim(),
        );
      }
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
      title={editing ? 'ဝယ်သူပြင်ဆင်ရန်' : 'ဝယ်သူအသစ်'}
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
            style={{
              ...dialogBtnPrimary,
              opacity: saving ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <IconSave size={16} />
            သိမ်းမည်
            <KbdHint onDark>↵</KbdHint>
          </button>
        </div>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 8 }}
      >
        <button type="submit" tabIndex={-1} style={{ display: 'none' }} aria-hidden />
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ ...dialogLabel, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconUser size={15} />
            ဝယ်သူအမည်
          </span>
          <input
            autoFocus
            value={nc.name}
            onChange={(e) => setNc((s) => ({ ...s, name: e.target.value }))}
            placeholder="ဥပမာ — ဦးအောင်မြင့်"
            style={dialogField}
          />
        </label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end', minWidth: 0 }}>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flex: '0 1 160px',
              minWidth: 120,
            }}
          >
            <span style={{ ...dialogLabel, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconPhone size={15} />
              ဖုန်း
            </span>
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
              flex: '1 1 160px',
              minWidth: 0,
            }}
          >
            <span style={{ ...dialogLabel, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <IconMapPin size={15} />
              နေရပ်
            </span>
            <input
              value={nc.address}
              onChange={(e) => setNc((s) => ({ ...s, address: e.target.value }))}
              placeholder="လိပ်စာ"
              style={dialogField}
              required
            />
          </label>
        </div>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          <span style={{ ...dialogLabel, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <IconId size={15} />
            မှတ်ပုံတင်
          </span>
          <NrcPicker
            key={open ? String(editingId ?? 'new') : 'closed'}
            value={nc.nrc}
            onChange={(nrc) => setNc((s) => ({ ...s, nrc }))}
            digits={digits}
            height={48}
            inputStyle={dialogField}
          />
        </label>
      </form>
    </Dialog>
  );
}
