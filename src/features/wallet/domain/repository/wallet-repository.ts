import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { Wallet, WalletChallenge } from '../entity/wallet-entity';

export type WalletListRequest = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export interface WalletRepository {
  getWallets(request?: WalletListRequest): Promise<Result<Wallet[], AppError>>;
  createChallenge(): Promise<Result<WalletChallenge, AppError>>;
  createPinChangeChallenge(): Promise<Result<WalletChallenge, AppError>>;
}
