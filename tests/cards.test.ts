import { describe, expect, it } from 'vitest';
import { buyCardAmountFixes, cardTxnAmount, cardsFeeTotal } from '../src/lib/cards';
import { amount as goldAmount } from '../src/lib/units';

describe('cardTxnAmount', () => {
  const lines = [{ denom: '1k' as const, qty: 2 }];
  const yway = 2 * 128; // 2 ကပ်
  const price = 7_000_000;
  const feePerCard = 30_000;

  it('sell total is gold + fee', () => {
    const gold = goldAmount(yway, price);
    const fee = cardsFeeTotal(lines, feePerCard);
    const parts = cardTxnAmount('sell', yway, price, lines, feePerCard);
    expect(parts.gold).toBe(gold);
    expect(parts.fee).toBe(fee);
    expect(parts.total).toBe(gold + fee);
  });

  it('buy total is gold + fee (not gold − fee)', () => {
    const gold = goldAmount(yway, price);
    const fee = cardsFeeTotal(lines, feePerCard);
    const parts = cardTxnAmount('buy', yway, price, lines, feePerCard);
    expect(parts.total).toBe(gold + fee);
    expect(parts.total).not.toBe(gold - fee);
  });

  it('gold split from stored amount uses amount − fee for both types', () => {
    for (const type of ['sell', 'buy'] as const) {
      const parts = cardTxnAmount(type, yway, price, lines, feePerCard);
      expect(parts.total - parts.fee).toBe(parts.gold);
    }
  });

  it('10k cards are fee-exempt', () => {
    const only10k = [{ denom: '10k' as const, qty: 1 }];
    const parts = cardTxnAmount('buy', 10 * 128, price, only10k, feePerCard);
    expect(parts.fee).toBe(0);
    expect(parts.total).toBe(parts.gold);
  });
});

describe('buyCardAmountFixes', () => {
  it('rewrites old buy amounts that used gold − fee', () => {
    const yway = 128;
    const price = 7_000_000;
    const feePerCard = 30_000;
    const lines = [{ denom: '1k' as const, qty: 1 }];
    const gold = goldAmount(yway, price);
    const fee = cardsFeeTotal(lines, feePerCard);
    const oldAmount = gold - fee; // previous formula

    const fixes = buyCardAmountFixes(
      [
        {
          id: 1,
          type: 'buy',
          channel: 'card',
          yway,
          price,
          card_fee: feePerCard,
          amount: oldAmount,
        },
        {
          id: 2,
          type: 'sell',
          channel: 'card',
          yway,
          price,
          card_fee: feePerCard,
          amount: gold + fee,
        },
      ],
      [{ txn_id: 1, denom: '1k', qty: 1 }],
    );

    expect(fixes).toEqual([{ id: 1, amount: gold + fee }]);
  });
});
