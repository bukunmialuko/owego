import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export interface SolanaWalletAddressPort {
  getSolanaAddress(): Promise<Result<string | undefined, AppError>>;
}
