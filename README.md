# ဦးသန့်စင် · အခေါက်ရွှေ စာရင်း (Gold Ledger)

Offline Windows desktop app for a gold shop that buys and sells **16 ပဲရည်** gold only. Built with Tauri 2 + React + TypeScript + SQLite.

## Download / ဒေါင်းလုဒ်လုပ်၍ တပ်ဆင်နည်း

### English
1. Open the [GitHub Releases](https://github.com/Ran-13/gold-ledger/releases) page.
2. Download **`Gold Ledger_1.0.0_x64-setup.exe`** (NSIS installer) — or the `.msi` if you prefer.
3. Run the installer. If WebView2 is missing, the embedded bootstrapper will install it.
4. Launch **Gold Ledger** from the Start Menu.

### မြန်မာ
1. [GitHub Releases](https://github.com/Ran-13/gold-ledger/releases) သို့ သွားပါ။
2. **`Gold Ledger_1.0.0_x64-setup.exe`** ကို ဒေါင်းလုဒ်လုပ်ပါ (သို့မဟုတ် `.msi`)။
3. Installer ကို ဖွင့်ပြီး တပ်ဆင်ပါ။ WebView2 မရှိရင် installer က အလိုလို ထည့်ပေးပါမည်။
4. Start Menu မှ **Gold Ledger** ကို ဖွင့်ပါ။

Database file location: `%APPDATA%\com.uthantsin.goldledger\gold-ledger.db`  
Backup / Restore: in-app **⚙ ဆက်တင်**.

## Develop
```bash
npm ci
npm test
npm run build
# Requires Rust + Tauri CLI:
npm run tauri dev
npm run tauri build
```

Seed demo data only when `SEED=1` (or `VITE_SEED=1`). Production builds start empty.

## Domain rules
- Weight stored as yway (ရွေး). 1 ကျပ်သား = 16 ပဲ = 128 ရွေး.
- `amount = round(yway/128 × price / R) × R` (R = 1 | 100 | 1000).
- No credit/debt. Sell uses today’s sell price; buy uses today’s buy price.
- Profit = yway/128 × (sale − that day’s buy). Stock = opening + Σbuy − Σsell.

Design reference: `design/HANDOFF.md` and `design/Gold Ledger v7.dc.html`.
