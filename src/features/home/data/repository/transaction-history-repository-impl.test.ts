import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { HomeRemoteDataSource } from '../datasource/home-remote-datasource';
import { transactionListResponseSchema } from '../model/transaction-model';
import { createTransactionHistoryRepositoryImpl } from './transaction-history-repository-impl';

function repositoryOver(getTransactionPage: HomeRemoteDataSource['getTransactionPage']) {
  const remoteDataSource: HomeRemoteDataSource = {
    getTransactionPage: jest.fn(getTransactionPage),
    getTransaction: jest.fn(),
  };

  return {
    repository: createTransactionHistoryRepositoryImpl({ remoteDataSource }),
    remoteDataSource,
  };
}

const PAGE_TWO = transactionListResponseSchema.parse({
  data: {
    data: [
      { id: 't21', amount: 50, currency: 'USD', status: 'SUCCESSFUL', type: 'CREDIT' },
      { id: 't22', amount: 12.5, currency: 'USD', status: 'FAILED', type: 'TRANSFER' },
    ],
    total: 42,
    page: 2,
    limit: 20,
  },
}).data;

describe('TransactionHistoryRepositoryImpl', () => {
  it('asks the datasource for the page at the size given', async () => {
    const { repository, remoteDataSource } = repositoryOver(() => Promise.resolve(ok(PAGE_TWO)));

    await repository.getPage(2, 20);

    expect(remoteDataSource.getTransactionPage).toHaveBeenCalledWith(2, 20);
  });

  it('maps each row, in the order the server sent them', async () => {
    const { repository } = repositoryOver(() => Promise.resolve(ok(PAGE_TWO)));

    const result = await repository.getPage(2, 20);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.value.transactions).toEqual([
      expect.objectContaining({ id: 't21', amountMinor: 5000, direction: 'incoming' }),
      expect.objectContaining({ id: 't22', amountMinor: 1250, status: 'failed' }),
    ]);
  });

  it('carries the total and page size the server reported', async () => {
    const { repository } = repositoryOver(() => Promise.resolve(ok(PAGE_TWO)));

    const result = await repository.getPage(2, 20);

    expect(result).toEqual(ok(expect.objectContaining({ total: 42, pageSize: 20 })));
  });

  it('reports no totals when the server sent none', async () => {
    const { repository } = repositoryOver(() =>
      Promise.resolve(ok(transactionListResponseSchema.parse({ data: { data: [] } }).data)),
    );

    const result = await repository.getPage(1, 20);

    expect(result).toEqual(ok({ transactions: [], total: 0, pageSize: 0 }));
  });

  it('passes a failure through', async () => {
    const { repository } = repositoryOver(() => Promise.resolve(err(offline())));

    expect(await repository.getPage(1, 20)).toEqual(err(offline()));
  });
});
