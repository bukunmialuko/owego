import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type YieldChange = {
  percent: number;
  amountMinor: number;
};

export type YieldPosition = {
  id: string;
  tokenSymbol: string;
  tokenMint: string;
  valueMinor: number;
  currency: string;
  apyPercent?: number;
  contributedMinor?: number;
  change?: YieldChange;
};

export type YieldOverview = {
  valueMinor: number;
  currency: string;
  change?: YieldChange;
  positions: YieldPosition[];
};

export interface YieldOverviewRepository {
  getOverview(): Promise<Result<YieldOverview, AppError>>;
}
