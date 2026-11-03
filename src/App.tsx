import { colors } from './styles/tokens';
import { Nav } from './components/Nav';
import { PriceStrip } from './components/PriceStrip';
import { EntryDialog } from './components/EntryDialog';
import { CustomerDialog } from './components/CustomerDialog';
import { PriceDialog } from './components/PriceDialog';
import { OpeningDialog } from './components/OpeningDialog';
import { StockAdjustDialog } from './components/StockAdjustDialog';
import { useStore } from './store';
import { Dashboard } from './pages/Dashboard';
import { Ledger } from './pages/Ledger';
import { Voucher } from './pages/Voucher';
import { Reports } from './pages/Reports';
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
            padding: '20px 24px 48px',
            minHeight: 0,
            background: colors.white,
          }}
        >
          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '12px 16px',
                borderRadius: 8,
                background: colors.white,
                border: `1.5px solid ${colors.buy}`,
                color: colors.buy,
                fontSize: 15,
              }}
            >
              {error}
            </div>
          )}
          {screen === 'dash' && <Dashboard />}
          {screen === 'ledger' && <Ledger />}
          {screen === 'voucher' && <Voucher />}
          {screen === 'reports' && <Reports />}
          {screen === 'customers' && <Customers />}
          {screen === 'stock' && <Stock />}
          {screen === 'prices' && <Prices />}
          {screen === 'settings' && <Settings />}
        </main>
      </div>
      <EntryDialog />
      <CustomerDialog />
      <PriceDialog />
      <OpeningDialog />
      <StockAdjustDialog />
    </div>
  );
}
