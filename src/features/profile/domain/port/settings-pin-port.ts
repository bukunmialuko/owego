import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type SettingsPinOutcome =
  { type: 'changed' } | { type: 'cancelled' } | { type: 'expired' } | { type: 'failed' };

export interface SettingsPinPort {
  changePin(): Promise<Result<SettingsPinOutcome, AppError>>;
}
