import { z } from 'zod';
import type { SolanaCluster } from '@/core/config/app-config';
import { fromZodError, type AppError } from '@/core/errors/app-error';
import { solscanTransactionUrl } from '@/core/reference-data/explorer';
import { err, map, type Result } from '@/core/result/result';
import type { TransactionDetail, TransactionDetailStatus } from '../entity/transaction-detail';
import type { TransactionDetailRepository } from '../repository/home-repository';

const transactionIdSchema = z.string().regex(/^[A-Za-z0-9-]{1,128}$/);

type Dependencies = {
  transactionDetailRepository: TransactionDetailRepository;
  solanaCluster: SolanaCluster;
};

export type TransactionDetailView = {
  detail: TransactionDetail;
  explorerUrl: string | undefined;
};

export interface GetTransactionDetailUseCase {
  execute(id: string): Promise<Result<TransactionDetailView, AppError>>;
}

export function createGetTransactionDetailUseCase({
  transactionDetailRepository,
  solanaCluster,
}: Dependencies): GetTransactionDetailUseCase {
  return {
    async execute(id) {
      const parsed = transactionIdSchema.safeParse(id);
      if (!parsed.success) return err(fromZodError(parsed.error));

      const detail = await transactionDetailRepository.getById(parsed.data);

      return map(detail, (value) => ({
        detail: value,
        explorerUrl:
          value.signature === undefined || !linksToChain(value.status)
            ? undefined
            : solscanTransactionUrl(value.signature, solanaCluster),
      }));
    },
  };
}

function linksToChain(status: TransactionDetailStatus): boolean {
  switch (status) {
    case 'successful':
    case 'processing':
    case 'pending':
      return true;
    case 'failed':
    case 'cancelled':
      return false;
  }
}
