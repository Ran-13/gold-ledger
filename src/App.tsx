import { colors, radii } from './styles/tokens';
import { LoginScreen } from './components/LoginScreen';
import { Nav } from './components/Nav';
import { PriceStrip } from './components/PriceStrip';
import { CardAdjustDialog } from './components/CardAdjustDialog';
import { EntryDialog } from './components/EntryDialog';
import { CustomerDialog } from './components/CustomerDialog';
import { PriceDialog } from './components/PriceDialog';
import { StockAdjustDialog } from './components/StockAdjustDialog';
import { useStore } from './store';
import { Dashboard } from './pages/Dashboard';
import { Ledger } from './pages/Ledger';
import { VoucherDialog } from './components/VoucherDialog';
import { Reports } from './pages/Reports';
import { Customers } from './pages/Customers';
import { Stock } from './pages/Stock';
import { Prices } from './pages/Prices';
import { Settings } from './pages/Settings';
import { useAppShortcuts } from './hooks/useAppShortcuts';

export default function App() {
  const ready = useStore((s) => s.ready);
  const authenticated = useStore((s) => s.authenticated);
  const screen = useStore((s) => s.screen);
  const error = useStore((s) => s.error);
  useAppShortcuts();

  if (!ready) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.ink,
          fontSize: 19,
        }}
      >
        ခဏစောင့်ပါ…
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen />;
  }

  return (
    <div
      data-app="1"
      style={{
        display: 'flex',
        height: '100vh',
        minWidth: 1100,
        background: colors.white,
      }}
    >
      <Nav />
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr)',
          minHeight: 0,
          background: colors.white,
        }}
      >
        <PriceStrip />
        <main
          data-main="1"
          style={{
            overflow: 'auto',
            padding: '20px 24px 36px',
            minHeight: 0,
            background: colors.white,
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: radii.sm,
                background: colors.white,
                border: `1.5px solid ${colors.buy}`,
                color: colors.buy,
                fontSize: 17,
              }}
            >
              {error}
            </div>
          )}
          {screen === 'dash' && <Dashboard />}
          {screen === 'ledger' && <Ledger />}
          {screen === 'reports' && <Reports />}
          {screen === 'customers' && <Customers />}
          {screen === 'stock' && <Stock />}
          {screen === 'prices' && <Prices />}
          {screen === 'settings' && <Settings />}
        </main>
      </div>
      <EntryDialog />
      <VoucherDialog />
      <CustomerDialog />
      <PriceDialog />
      <StockAdjustDialog />
      <CardAdjustDialog />
    </div>
  );
}
