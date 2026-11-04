import { useState, type CSSProperties, type FormEvent } from 'react';
import { clearPrimaryBtn } from './ClearUI';
import { colors } from '../styles/tokens';
import { useStore } from '../store';

export function LoginScreen() {
  const login = useStore((s) => s.login);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const ok = await login(username, password);
      if (!ok) setError('အသုံးပြုသူအမည် သို့ စကားဝှက် မှားနေသည်');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        minWidth: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.white,
        padding: 24,
      }}
    >
      <form
        onSubmit={(e) => void onSubmit(e)}
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '28px 28px 24px',
          border: `1px solid ${colors.cardBorder}`,
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(15,23,36,.08)',
          background: colors.white,
        }}
      >
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.3,
            color: colors.ink,
            textAlign: 'center',
            width: '100%',
          }}
        >
          ဝင်ရောက်ရန်
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', textAlign: 'left' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: colors.ink }}>အသုံးပြုသူအမည်</span>
          <input
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={field}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', textAlign: 'left' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: colors.ink }}>စကားဝှက်</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={field}
          />
        </label>

        {error && (
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: colors.buy,
              lineHeight: 1.4,
              width: '100%',
              textAlign: 'left',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          style={{
            ...clearPrimaryBtn,
            height: 48,
            fontSize: 17,
            opacity: busy ? 0.65 : 1,
            marginTop: 4,
            width: '100%',
            justifyContent: 'center',
          }}
        >
          {busy ? 'စစ်ဆေးနေ…' : 'ဝင်မည်'}
        </button>
      </form>
    </div>
  );
}

const field: CSSProperties = {
  height: 46,
  border: `1px solid ${colors.cardBorder}`,
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 17,
  lineHeight: 1.5,
  background: colors.white,
  color: colors.ink,
  width: '100%',
  boxSizing: 'border-box',
  textAlign: 'left',
};
