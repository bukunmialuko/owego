import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type AvailableBalance = {
  amountMinor: number;
  currency: string;
};

export interface TokenBalancePort {
  getBalance(tokenSymbol: string): Promise<Result<AvailableBalance | undefined, AppError>>;
}
