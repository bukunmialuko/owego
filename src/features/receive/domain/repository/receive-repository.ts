import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { Chain, DepositAddress } from '../entity/receive-entity';

export interface ReceiveRepository {
  getChains(): Promise<Result<Chain[], AppError>>;
  getAddress(chainCode: string): Promise<Result<DepositAddress | undefined, AppError>>;
}
