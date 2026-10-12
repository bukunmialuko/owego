import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

type SettingsVerificationResult =
  { type: 'completed'; state: string } | { type: 'cancelled' } | { type: 'failed'; reason: string };

export interface SettingsVerificationPort {
  start(): Promise<Result<SettingsVerificationResult, AppError>>;
}
