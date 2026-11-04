import type Database from '@tauri-apps/plugin-sql';
import { addDays, amount, isoDate } from '../lib/units';

const NAMES: [string, string][] = [
  ['ဦးအောင်မြင့်', '09-421553118'],
  ['ဒေါ်ခင်မာလာ', '09-795102334'],
  ['ကိုဇော်ဝင်း', '09-250887461'],
  ['မနှင်းဝေ', '09-684229170'],
  ['ဦးကျော်စွာ', '09-401336925'],
  ['ဒေါ်သီတာ', '09-773018552'],
  ['ကိုမင်းထက်', '09-962145807'],
  ['ဒေါ်စန္ဒာ', '09-428670913'],
];

/** Demo seed — only when SEED=1 and DB is empty */
export async function makeSeed(database: Database): Promise<void> {
  let sd = 7;
  const r = () => {
    sd = (sd * 1664525 + 1013904223) % 4294967296;
    return sd / 4294967296;
  };

  const customerIds: number[] = [];
  for (const [name, phone] of NAMES) {
    const res = await database.execute(
      'INSERT INTO customers (name, phone, nrc, address) VALUES ($1, $2, $3, $4)',
      [name, phone, null, ''],
    );
    customerIds.push(res.lastInsertId as number);
  }

  const today = new Date();
  let buy = 7050000;
  const prices: { date: string; buy: number; sell: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    buy += Math.round((r() - 0.4) * 60) * 1000;
    prices.push({
      date: isoDate(addDays(today, -i)),
      buy,
      sell: buy + 100000,
    });
  }
  for (const p of prices) {
    await database.execute(
      'INSERT INTO prices (date, buy, sell) VALUES ($1, $2, $3)',
      [p.date, p.buy, p.sell],
    );
    await database.execute(
      'INSERT INTO price_logs (date, time, buy, sell) VALUES ($1, $2, $3, $4)',
      [p.date, '09:00:00', p.buy, p.sell],
    );
  }

  let no = 1;
  for (let i = 29; i >= 0; i--) {
    const date = isoDate(addDays(today, -i));
    const p = prices.find((x) => x.date === date)!;
    const n = 1 + Math.floor(r() * 3);
    for (let j = 0; j < n; j++) {
      const type = r() < 0.55 ? 'sell' : 'buy';
      const yway = 8 + Math.round(r() * 180);
      const price = type === 'sell' ? p.sell : p.buy;
      const amt = amount(yway, price);
      const time =
        String(9 + Math.floor(r() * 8)).padStart(2, '0') +
        ':' +
        String(Math.floor(r() * 60)).padStart(2, '0');
      const cid = customerIds[Math.floor(r() * 8)]!;
      await database.execute(
        `INSERT INTO txns (voucher_no, date, time, type, customer_id, yway, price, amount, note, channel, card_fee)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [no, date, time, type, cid, yway, price, amt, null, 'loose', 0],
      );
      no++;
    }
  }

  await database.execute(
    `INSERT INTO settings (key, value) VALUES ('opening_stock_yway', $1)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [String(128 * 15)],
  );
}
