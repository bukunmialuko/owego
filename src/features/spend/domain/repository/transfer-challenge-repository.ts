import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { TransferChallenge, TransferChallengeRequest } from '../entity/transfer-challenge';

export interface TransferChallengeRepository {
  create(request: TransferChallengeRequest): Promise<Result<TransferChallenge, AppError>>;
}
