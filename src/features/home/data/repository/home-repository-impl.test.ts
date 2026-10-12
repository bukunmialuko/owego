import { offline } from '@/core/errors/app-error';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { err, ok } from '@/core/result/result';
import type { HomeRemoteDataSource } from '../datasource/home-remote-datasource';
import { transactionListResponseSchema } from '../model/transaction-model';
import { createTransactionRepositoryImpl } from './home-repository-impl';

function repositoryOver(getTransactionPage: HomeRemoteDataSource['getTransactionPage']) {
  const remoteDataSource: HomeRemoteDataSource = {
    getTransactionPage: jest.fn(getTransactionPage),
    getTransaction: jest.fn(),
  };

  return {
    repository: createTransactionRepositoryImpl({
      remoteDataSource,
      cache: createKeyValueStorage('home-repo-test'),
    }),
    remoteDataSource,
  };
}

describe('TransactionRepositoryImpl', () => {
  it('reads the most recent transactions as the first page at the requested size', async () => {
    const { repository, remoteDataSource } = repositoryOver(() =>
      Promise.resolve(ok(transactionListResponseSchema.parse({}).data)),
    );

    await repository.getRecent(5);

    expect(remoteDataSource.getTransactionPage).toHaveBeenCalledWith(1, 5);
  });

  it('maps the rows and leaves the totals behind', async () => {
    const { repository } = repositoryOver(() =>
      Promise.resolve(
        ok(
          transactionListResponseSchema.parse({
            data: {
              data: [
                { id: 't1', amount: 50, currency: 'USD', status: 'SUCCESSFUL', type: 'CREDIT' },
              ],
              total: 127,
              page: 1,
              limit: 5,
            },
          }).data,
        ),
      ),
    );

    const result = await repository.getRecent(5);

    expect(result).toEqual(
      ok([expect.objectContaining({ id: 't1', amountMinor: 5000, direction: 'incoming' })]),
    );
  });

  it('passes a failure through', async () => {
    const { repository } = repositoryOver(() => Promise.resolve(err(offline())));

    expect(await repository.getRecent(5)).toEqual(err(offline()));
  });
});
