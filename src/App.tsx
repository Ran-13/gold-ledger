import { colors } from './styles/tokens';
import { Nav } from './components/Nav';
import { PageHeader } from './components/PageHeader';
import { useStore } from './store';
import { Dashboard } from './pages/Dashboard';
import { Entry } from './pages/Entry';
import { Ledger } from './pages/Ledger';
import { Voucher } from './pages/Voucher';
import { Reports } from './pages/Reports';
import { Calculator } from './pages/Calculator';
import { Customers } from './pages/Customers';
import { Stock } from './pages/Stock';
import { Prices } from './pages/Prices';
import { Settings } from './pages/Settings';

export default function App() {
  const ready = useStore((s) => s.ready);
  const screen = useStore((s) => s.screen);
  const error = useStore((s) => s.error);

  if (!ready) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.muted,
          fontSize: 17,
        }}
      >
        ခဏစောင့်ပါ…
      </div>
    );
  }

  return (
    <div
      data-app="1"
      style={{
        display: 'grid',
        gridTemplateRows: '72px minmax(0, 1fr)',
        height: '100vh',
        minWidth: 1280,
      }}
    >
      <Nav />
      <div style={{ display: 'grid', gridTemplateRows: 'auto minmax(0, 1fr)', minHeight: 0 }}>
        <PageHeader />
        <main
          data-main="1"
          style={{
            overflow: 'auto',
            padding: '32px 48px 64px',
            minHeight: 0,
            background: colors.white,
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: 20,
                padding: '12px 16px',
                borderRadius: 8,
                background: colors.buyPillBg,
                color: colors.buy,
                fontSize: 15,
              }}
            >
              {error}
            </div>
          )}
          {screen === 'dash' && <Dashboard />}
          {screen === 'entry' && <Entry />}
          {screen === 'ledger' && <Ledger />}
          {screen === 'voucher' && <Voucher />}
          {screen === 'reports' && <Reports />}
          {screen === 'calc' && <Calculator />}
          {screen === 'customers' && <Customers />}
          {screen === 'stock' && <Stock />}
          {screen === 'prices' && <Prices />}
          {screen === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}
