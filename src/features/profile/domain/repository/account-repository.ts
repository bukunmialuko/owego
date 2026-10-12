import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export interface AccountRepository {
  deleteAccount(): Promise<Result<void, AppError>>;
}
