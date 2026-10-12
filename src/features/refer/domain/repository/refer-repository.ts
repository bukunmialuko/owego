import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { Referral, ReferralPayout, ReferralSummary } from '../entity/refer-entity';

export interface ReferRepository {
  getSummary(): Promise<Result<ReferralSummary | undefined, AppError>>;
  getPayouts(): Promise<Result<ReferralPayout[], AppError>>;
  getReferrals(): Promise<Result<Referral[], AppError>>;
}
