import { ErrorCode, offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { TransactionDetail } from '../entity/transaction-detail';
import type { TransactionDetailRepository } from '../repository/home-repository';
import { createGetTransactionDetailUseCase } from './get-transaction-detail-usecase';

const ID = '00000000-0000-4000-8000-000000000007';
const SIGNATURE =
  '4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';

const DETAIL: TransactionDetail = {
  id: ID,
  status: 'successful',
  direction: 'outgoing',
  kind: 'payout',
  amount: { minor: 9, currency: 'USD' },
  localAmount: { minor: 12_500, currency: 'NGN' },
  rate: 1384.909515,
  fee: undefined,
  narration: undefined,
  createdAt: '2026-03-13T13:59:22.052231Z',
  counterparty: undefined,
  signature: SIGNATURE,
};

function repositoryReturning(
  result: Awaited<ReturnType<TransactionDetailRepository['getById']>>,
): TransactionDetailRepository & { getById: jest.Mock } {
  return { getById: jest.fn(() => Promise.resolve(result)) };
}

describe('getTransactionDetail', () => {
  it('returns the transaction and a devnet explorer link', async () => {
    const transactionDetailRepository = repositoryReturning(ok(DETAIL));
    const useCase = createGetTransactionDetailUseCase({
      transactionDetailRepository,
      solanaCluster: 'devnet',
    });

    const result = await useCase.execute(ID);

    expect(transactionDetailRepository.getById).toHaveBeenCalledWith(ID);
    expect(result).toEqual(
      ok({
        detail: DETAIL,
        explorerUrl: `https://solscan.io/tx/${SIGNATURE}?cluster=devnet`,
      }),
    );
  });

  it('links mainnet unqualified on a production build', async () => {
    const useCase = createGetTransactionDetailUseCase({
      transactionDetailRepository: repositoryReturning(ok(DETAIL)),
      solanaCluster: 'mainnet-beta',
    });

    const result = await useCase.execute(ID);

    expect(result.ok && result.value.explorerUrl).toBe(`https://solscan.io/tx/${SIGNATURE}`);
  });

  it('offers no explorer link without a signature', async () => {
    const useCase = createGetTransactionDetailUseCase({
      transactionDetailRepository: repositoryReturning(ok({ ...DETAIL, signature: undefined })),
      solanaCluster: 'devnet',
    });

    const result = await useCase.execute(ID);

    expect(result.ok && result.value.explorerUrl).toBeUndefined();
  });

  it.each(['failed', 'cancelled'] as const)(
    'offers no explorer link for a %s transaction, signature and all',
    async (status) => {
      const useCase = createGetTransactionDetailUseCase({
        transactionDetailRepository: repositoryReturning(ok({ ...DETAIL, status })),
        solanaCluster: 'devnet',
      });

      const result = await useCase.execute(ID);

      expect(result.ok && result.value.explorerUrl).toBeUndefined();
    },
  );

  it.each(['processing', 'pending'] as const)(
    'still links a %s transaction to the chain',
    async (status) => {
      const useCase = createGetTransactionDetailUseCase({
        transactionDetailRepository: repositoryReturning(ok({ ...DETAIL, status })),
        solanaCluster: 'devnet',
      });

      const result = await useCase.execute(ID);

      expect(result.ok && result.value.explorerUrl).toBe(
        `https://solscan.io/tx/${SIGNATURE}?cluster=devnet`,
      );
    },
  );

  it('passes a repository failure through', async () => {
    const useCase = createGetTransactionDetailUseCase({
      transactionDetailRepository: repositoryReturning(err(offline())),
      solanaCluster: 'devnet',
    });

    expect(await useCase.execute(ID)).toEqual(err(offline()));
  });

  it.each([
    ['blank', ''],
    ['a path traversal', '../user/me'],
    ['a query', `${ID}?admin=true`],
    ['whitespace', ` ${ID}`],
    ['absurdly long', 'a'.repeat(129)],
  ])('refuses an id that is %s without asking the repository', async (_, id) => {
    const transactionDetailRepository = repositoryReturning(ok(DETAIL));
    const useCase = createGetTransactionDetailUseCase({
      transactionDetailRepository,
      solanaCluster: 'devnet',
    });

    const result = await useCase.execute(id);

    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe(ErrorCode.InvalidInput);
    expect(transactionDetailRepository.getById).not.toHaveBeenCalled();
  });
});
