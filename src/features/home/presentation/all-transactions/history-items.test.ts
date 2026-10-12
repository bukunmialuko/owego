import type { Transaction } from '../../domain/entity/home-entity';
import { toHistoryItems, type HistoryItem } from './history-items';

const NOW = new Date('2026-10-09T12:00:00Z');

function transaction(id: string, createdAt: string): Transaction {
  return {
    id,
    status: 'completed',
    direction: 'incoming',
    amountMinor: 5000,
    currency: 'USD',
    narration: '',
    createdAt,
    title: `Deposit ${id}`,
  };
}

function outline(items: HistoryItem[]): string[] {
  return items.map((item) => {
    switch (item.kind) {
      case 'day':
        return `#${item.dayKey ?? item.day}`;
      case 'transaction':
        return item.transaction.id;
    }
  });
}

function history(transactions: Transaction[]) {
  return toHistoryItems(transactions, 'en', NOW);
}

describe('toHistoryItems', () => {
  it('returns nothing for an empty history', () => {
    expect(history([])).toEqual([]);
  });

  it('heads each calendar day once, keeping the rows in the order they arrived', () => {
    const items = history([
      transaction('a', '2026-10-09T09:05:00Z'),
      transaction('b', '2026-10-09T23:17:00Z'),
      transaction('c', '2026-10-08T18:42:00Z'),
    ]);

    expect(outline(items)).toEqual(['#common.today', 'a', 'b', '#common.yesterday', 'c']);
  });

  it('dates an older day in full', () => {
    const items = history([
      transaction('a', '2026-10-03T09:05:00Z'),
      transaction('b', '2025-10-03T09:05:00Z'),
    ]);

    expect(outline(items)).toEqual(['#Oct 3, 2026', 'a', '#Oct 3, 2025', 'b']);
  });

  it('splits two rows an hour apart that fall either side of midnight', () => {
    const items = history([
      transaction('a', '2026-10-09T00:30:00Z'),
      transaction('b', '2026-10-08T23:30:00Z'),
    ]);

    expect(outline(items)).toEqual(['#common.today', 'a', '#common.yesterday', 'b']);
  });

  it('heads a day that comes round again with a heading of its own', () => {
    const items = history([
      transaction('a', '2026-10-09T09:05:00Z'),
      transaction('b', '2026-10-08T09:05:00Z'),
      transaction('c', '2026-10-09T08:00:00Z'),
    ]);
    const headings = items.flatMap((item) => (item.kind === 'day' ? [item.key] : []));

    expect(outline(items)).toEqual([
      '#common.today',
      'a',
      '#common.yesterday',
      'b',
      '#common.today',
      'c',
    ]);
    expect(new Set(headings).size).toBe(3);
  });

  it('keeps a row whose time cannot be read, in its place under the day before it', () => {
    const items = history([
      transaction('a', '2026-10-09T09:05:00Z'),
      transaction('b', ''),
      transaction('c', '2026-10-09T08:00:00Z'),
    ]);

    expect(outline(items)).toEqual(['#common.today', 'a', 'b', 'c']);
  });

  it('keeps a row whose time cannot be read above the first heading when it leads', () => {
    const items = history([
      transaction('a', 'not a date'),
      transaction('b', '2026-10-09T09:05:00Z'),
    ]);

    expect(outline(items)).toEqual(['a', '#common.today', 'b']);
  });
});
