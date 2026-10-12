import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type FxQuote = {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  expiresAt?: string;
};

export interface FxRateRepository {
  getQuote(
    baseCurrency: string,
    quoteCurrency: string,
  ): Promise<Result<FxQuote | undefined, AppError>>;
}
