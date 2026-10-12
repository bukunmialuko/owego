import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { CapturedAccount } from '../entity/captured-account';
import type { CapturedStill } from '../port/camera-scanner-port';

export interface AccountCaptureRepository {
  readAccount(still: CapturedStill): Promise<Result<CapturedAccount | undefined, AppError>>;
}
