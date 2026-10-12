import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { PayoutEndpoint } from '../corridor/corridor-spec';
import type { PayoutInitiation } from '../entity/payout-quote';

export interface BankTransferRepository {
  initiate(
    endpoint: PayoutEndpoint,
    body: Record<string, unknown>,
  ): Promise<Result<PayoutInitiation, AppError>>;
}
