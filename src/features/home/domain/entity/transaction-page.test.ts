import type { Transaction } from './home-entity';
import { flattenTransactionPages } from './transaction-page';

function transaction(id: string, amountMinor = 5000): Transaction {
  return {
    id,
    status: 'completed',
    direction: 'incoming',
    amountMinor,
    currency: 'USD',
    narration: '',
    createdAt: '2026-09-21T10:00:00Z',
    title: 'Deposit',
  };
}

describe('flattenTransactionPages', () => {
  it('reads the pages as one list, in the order they arrived', () => {
    const rows = flattenTransactionPages([
      { transactions: [transaction('a'), transaction('b')], nextPage: 2 },
      { transactions: [transaction('c')], nextPage: undefined },
    ]);

    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
  });

  it('shows a row that straddles a page boundary once, as the first page had it', () => {
    const rows = flattenTransactionPages([
      { transactions: [transaction('a'), transaction('b', 5000)], nextPage: 2 },
      { transactions: [transaction('b', 9900), transaction('c')], nextPage: undefined },
    ]);

    expect(rows.map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(rows[1]?.amountMinor).toBe(5000);
  });

  it('is empty when nothing has loaded', () => {
    expect(flattenTransactionPages([])).toEqual([]);
  });
});
