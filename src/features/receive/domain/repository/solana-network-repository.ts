import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { DepositToken } from '../entity/deposit-token';
import type { RecentBlockhash, SignatureStatus } from '../entity/external-deposit';

export interface SolanaNetworkRepository {
  getRecentBlockhash(): Promise<Result<RecentBlockhash, AppError>>;

  getTokenBalance(owner: string, token: DepositToken): Promise<Result<bigint, AppError>>;

  getSignatureStatus(signature: string): Promise<Result<SignatureStatus, AppError>>;
}
