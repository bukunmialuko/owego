import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export interface PushTokenRepository {
  register(token: string): Promise<Result<void, AppError>>;
  unregister(accessToken: string): Promise<Result<void, AppError>>;
}
