# Handoff: ဦးသန့်စင် · အခေါက်ရွှေ စာရင်း (Gold Ledger) — Desktop App

## Overview
Offline desktop app for a single gold shop that buys and sells **16 ပဲရည် (pure) gold only**. It records sales and purchases, prints vouchers, tracks stock in ကျပ် · ပဲ · ရွေး, keeps a customer list, sets the daily buy/sell price, and shows daily / monthly / yearly reports with charts.

**Target stack (decided):** Tauri 2 + React 18 + TypeScript + Vite, SQLite via `tauri-plugin-sql` (or `rusqlite` commands). Windows first, macOS second. No network required.

## About the Design Files
`Gold Ledger v7.dc.html` is a **design reference built in HTML**: a working prototype that shows the intended look and behavior. It is not production code. Recreate it as React + TypeScript components. Open the file in a browser to click through every screen. Its logic class (bottom `<script>`) is the reference for every calculation. The prototype stores data in `localStorage` key `uthantsin-gold-v1`. Replace that with SQLite.

## Fidelity
**High-fidelity.** Match the colors, type, spacing and copy exactly. All UI text is Burmese and must stay verbatim.

## Domain rules (critical)
- Units: **1 ကျပ်သား = 16 ပဲ, 1 ပဲ = 8 ရွေး → 1 ကျပ်သား = 128 ရွေး.** Store weight as **yway (ရွေး), REAL**. Fractional ရွေး are allowed (e.g. 0.25).
- Quality is always 16 ပဲရည်. There is no quality field in the UI and no gram units anywhere.
- Weight is the **primary** figure everywhere: large and bold. Money is secondary: smaller and grey `#5A6478`.
- Weight display `W(y)`: show only the non-zero parts → `"15 ကျပ်"`, `"2 ပဲ 3 ရွေး"`, `"1 ကျပ် 4 ပဲ 0.5 ရွေး"`; all zero → `"0"`. Negative values get the prefix `"− "`.
- Price is per 1 ကျပ်သား. **amount = round(yway / 128 × price / R) × R**, where R = rounding (setting: 1 / 100 / 1000, default 100).
- **No credit/debt system.** Every transaction is paid in full. There are no paid, due or balance fields.
- Sell uses today's **ရောင်းဈေး**; buy uses today's **ဝယ်ဈေး**.
- Stock = opening + Σ buy yway − Σ sell yway.
- Profit for a sale = yway/128 × (sale price − that day's ဝယ်ဈေး). Period profit = sum over the sales in the period.
- Voucher number `#0001`, auto-increment.
- Setting: show digits as Latin or Myanmar (၀–၉).

## SQLite schema
```sql
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT, address TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE prices (date TEXT PRIMARY KEY, buy INTEGER NOT NULL, sell INTEGER NOT NULL);          -- one row per day, upsert
CREATE TABLE txns (id INTEGER PRIMARY KEY, voucher_no INTEGER UNIQUE NOT NULL, date TEXT NOT NULL, time TEXT NOT NULL,
  type TEXT CHECK(type IN ('sell','buy')) NOT NULL, customer_id INTEGER REFERENCES customers(id),
  yway REAL NOT NULL, price INTEGER NOT NULL, amount INTEGER NOT NULL, note TEXT);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);  -- opening_stock_yway, digits, round_to
CREATE INDEX txns_date ON txns(date);
```
Add a **Backup / Restore** action that copies the `.db` file.

## Layout shell
- Min window: 1280×800.
- **Top nav (72px, bg `#1B2A41`):**
  - Logo: 38px circle `#E0AA3E` containing "သ", followed by "ဦးသန့်စင်" in 19px/700, white.
  - Tabs (16px): inactive `#B9C3D3`; active white, 600, 3px bottom border `#E0AA3E`.
  - Tab labels: ပင်မ · စာရင်းသွင်း · မှတ်တမ်း · ဘောင်ချာ · အစီရင်ခံ · တွက်စက် · ဖောက်သည် · လက်ကျန် · ပေါက်ဈေး
  - Right side: "+ စာရင်းအသစ်" button, 44px high, bg `#D9A93A`, text `#1B2A41`, 700.
- **Page header** (margin 0 48px, padding 28 0 18, 2px bottom border `#1B2A41`):
  - Left: title 28px/700.
  - Right: ဝယ် {price} · ရောင်း {price, `#9A6B12`} · date.
- **Main area:** padding 32px 48px, page bg `#FFFFFF`.

## Screens
1. **ပင်မ (Dashboard)**
   - Row 1 (1.7fr / 1fr): a navy price card showing ဝယ်ဈေး / ရောင်းဈေး (46px, gold `#F0C35A` for sell) with a "ဈေးပြင်မည်" button; and a white stock card (stock weight 26px/700, "ကြည့်ရန် →").
   - Row 2: two cards, ယနေ့ ရောင်းရွှေ and ယနေ့ ဝယ်ရွှေ (weight 26px/700; the line below shows "{amount} ကျပ် · {n} စောင်").
   - Row 3: a 14-day bar chart by weight (sell `#D9A93A`, buy `#C9CFDA`), and နောက်ဆုံးစာရင်း showing the last 5 (pill · customer + amount below · weight right, 17px/700).
2. **စာရင်းသွင်း (Entry).** Left column, then a sticky navy summary card on the right (min 360px).
   - Type: two 76px buttons, ရောင်း / ဝယ်. Active: navy bg, gold text, 2px `#D9A93A` border.
   - **Customer combobox:**
     - Typing filters by name or phone (max 8 results).
     - Clicking a result selects that customer; their phone shows in a grey box next to the field.
     - An unknown name shows `+ "name" ကို ဖောက်သည်အသစ်အဖြစ် ထည့်မည်` and a phone input (green border).
     - On save, the new customer is created automatically. An empty name means "ဖောက်သည်အထွေထွေ".
   - Weight: three 64px inputs, ကျပ် / ပဲ / ရွေး (24px/600). Below them: "= W(total)".
   - **ယနေ့ဈေး:**
     - Two boxes side by side, ဝယ်ဈေး and ရောင်းဈေး, prefilled with today's price.
     - The box matching the type gets a 2px `#D9A93A` border, bg `#FFFBF0`, and the tag "ဒီစာရင်းအတွက်".
     - Editing a box upserts today's row in `prices` immediately.
     - If today has no price row, show a red warning: "ယနေ့ဈေး မသတ်မှတ်ရသေး · {date} ဈေးကို ပြထားသည်".
   - မှတ်ချက် (note) input.
   - Summary card:
     - အလေးချိန် (32px/700 gold), then ဈေး, then ကျသင့်ငွေ (18px).
     - Button "သိမ်းပြီး ဘောင်ချာထုတ်မည်" (58px, gold). It saves and opens the voucher.
     - Button "ရှင်းမည်".
3. **မှတ်တမ်း (Ledger)**
   - Filters: segment (အားလုံး / ရောင်း / ဝယ်), search, date from–to, ရှင်းမည်, count.
   - Two total cards: weight large and coloured (sell `#1F7A4D`, buy `#B23A2A`), amount small.
   - Table columns: ဘောင်ချာ (no + date), အမျိုး pill, ဖောက်သည်, အလေးချိန် (18px/700), ငွေ (grey), and actions [ဘောင်ချာ] [ဖျက်] (confirm before delete).
4. **ဘောင်ချာ (Voucher)**
   - Left: a 280px list of the last 60 vouchers.
   - Right: a printable 600px paper.
     - Double gold border `#C99A35`; header "ဦးသန့်စင်" / "အခေါက်ရွှေ အရောင်းအဝယ်".
     - Title: အရောင်းဘောင်ချာ or အဝယ်ဘောင်ချာ.
     - Fields: no, date and time, name, phone.
     - Item row: "အခေါက်ရွှေ / ၁၆ ပဲရည်", weight, amount.
     - Footer: ပေါက်ဈေး / ကျပ်သား, စုစုပေါင်း (32px), and two signature lines.
   - "ပရင့်ထုတ်မည်" calls `window.print()`. The print CSS hides everything except the paper. Consider A5 size.
5. **အစီရင်ခံစာ (Reports)** — segment: နေ့စဉ် / လချုပ် / နှစ်ချုပ်.
   - **နေ့စဉ်:**
     - Range: ၇ / ၃၀ / ၉၀ ရက် / အားလုံး.
     - Cards: ရောင်းရွှေ, ဝယ်ရွှေ, ခန့်မှန်းအမြတ်.
     - Charts, then a per-day table and the top 5 customers.
   - **လချုပ်:**
     - ‹ month › selector and a print button.
     - Four cards: ရောင်း, ဝယ်, ရွှေ အသားတင် (ဝယ် − ရောင်း), အမြတ်.
     - Charts, then side-by-side ရောင်းရသည့်စာရင်း and ဝယ်ရသည့်စာရင်း tables, each with a total row (bg `#FBF3E0`).
   - **နှစ်ချုပ်:**
     - ‹ year › selector, four cards, charts.
     - 12-month table; clicking a row opens that month.
   - **Charts (all three modes):**
     - (a) **Diverging bars:** sell above a 2px navy axis (`#D9A93A`), buy below (`#9AA6B8`). Each half is 140px. Toggle: အလေးချိန် (ကျပ်သား) or ငွေ (သိန်း = 100,000). Value labels show when there are 16 bars or fewer. Tooltip on hover.
     - (b) **လက်ကျန်ရွှေ အပြောင်းအလဲ:** a stock-balance line (gold stroke, `#FBF3E0` area), with start / end / change.
     - (c) **အမြတ်:** bars in သိန်း (green when positive, red when negative), with a total.
     - Bucketing: up to 45 days → daily bars; up to 120 days → weekly; more → monthly. The month view is daily; the year view is monthly.
     - Half-width charts use month numbers (၁–၁၂) as labels.
6. **တွက်စက် (Calculator):** ကျပ် / ပဲ / ရွေး plus a price (default: today's sell) → the value, shown in a navy result box (32px gold).
7. **ဖောက်သည်များ (Customers)**
   - Table: name + phone, count, ရောင်း / ဝယ် weights, and [မှတ်တမ်း], which opens the Ledger filtered by that name.
   - A navy "ဖောက်သည်အသစ်" form: name, phone, address.
8. **လက်ကျန်ရွှေ (Stock)**
   - Current stock and value at today's buy price.
   - Editable opening stock (in ကျပ်သား).
   - Totals for in (ဝယ်) and out (ရောင်း).
   - Movement table: voucher, type, in, out, running balance.
9. **ပေါက်ဈေး (Prices):** a navy form to set today's buy and sell (34px inputs, showing the spread) and a history table with the daily change (green / red).

## Design tokens
- **Ink / navy:** `#1B2A41`. Navy panel borders `#34486B`; navy inputs `#24365A`; muted text on navy `#B9C3D3`.
- **Gold:** buttons and sell bars `#D9A93A` (hover `#E6BA55`); nav `#E0AA3E`; gold text on navy `#F0C35A`; dark gold text `#9A6B12`; light gold `#FBF3E0` / `#FFFBF0`.
- **Neutrals:**
  - Background `#FFFFFF`; muted text `#5A6478`, `#6B7486`.
  - Card border 1.5px `#C3CAD5` + shadow `0 2px 6px rgba(27,42,65,.08)`, radius 12.
  - Row divider `#EEF0F3`; input border `#D5DAE1`; segment track `#EEF0F3`; buy bars `#9AA6B8` / `#C9CFDA`.
- **Status:** sell / positive `#1F7A4D` (pill bg `#E2F0E8`); buy / negative `#B23A2A` (pill bg `#F8E4E0`).
- **Type:**
  - Fonts: `IBM Plex Sans` for numbers and Latin; `Noto Sans Myanmar` for Burmese. Bundle both locally because the app is offline.
  - Body 17px, line-height 1.7. Labels 15–16px; titles 19px/700; page title 28px/700.
  - Myanmar glyphs need line-height of at least 1.6.
- **Radius:** inputs 6, buttons 8, cards 12. Segment buttons are 38px high (6px radius).
- **Spacing:** grid gaps 20–24px; card padding 24–34px.

## State / modules
- Suggested modules: `db.ts` (queries), `units.ts` (W(), toYway(k,p,y), amount()), `reports.ts` (bucketing, profit, stock series), and one React page per screen.
- Use Zustand or React Context for the current screen, the filters and the report mode, month and year.

## Files
- `Gold Ledger v7.dc.html` — the full interactive reference. It includes all of the calculation logic in its script class.
