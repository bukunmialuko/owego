import type { Transaction } from './home-entity';

export type TransactionSlice = {
  transactions: Transaction[];
  total: number;
  pageSize: number;
};

export type TransactionPage = {
  transactions: Transaction[];
  nextPage: number | undefined;
};

export function flattenTransactionPages(pages: readonly TransactionPage[]): Transaction[] {
  const seen = new Set<string>();
  const rows: Transaction[] = [];

  for (const page of pages) {
    for (const transaction of page.transactions) {
      if (seen.has(transaction.id)) continue;

      seen.add(transaction.id);
      rows.push(transaction);
    }
  }

  return rows;
}
