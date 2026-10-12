import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { HomeRemoteDataSource } from '../datasource/home-remote-datasource';
import { transactionSchema } from '../model/transaction-model';
import { createTransactionDetailRepositoryImpl } from './transaction-detail-repository-impl';

function repositoryOver(getTransaction: HomeRemoteDataSource['getTransaction']) {
  const remoteDataSource: HomeRemoteDataSource = {
    getTransactionPage: jest.fn(),
    getTransaction: jest.fn(getTransaction),
  };

  return {
    repository: createTransactionDetailRepositoryImpl({ remoteDataSource }),
    remoteDataSource,
  };
}

describe('TransactionDetailRepositoryImpl', () => {
  it('asks the datasource for the id and maps what it answers', async () => {
    const { repository, remoteDataSource } = repositoryOver(() =>
      Promise.resolve(
        ok(
          transactionSchema.parse({ id: 't1', currency: 'USDC', amount: 15, status: 'SUCCESSFUL' }),
        ),
      ),
    );

    const result = await repository.getById('t1');

    expect(remoteDataSource.getTransaction).toHaveBeenCalledWith('t1');
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.value).toMatchObject({
      id: 't1',
      status: 'successful',
      amount: { minor: 1500, currency: 'USD' },
    });
  });

  it('passes a failure through', async () => {
    const { repository } = repositoryOver(() => Promise.resolve(err(offline())));

    expect(await repository.getById('t1')).toEqual(err(offline()));
  });
});
