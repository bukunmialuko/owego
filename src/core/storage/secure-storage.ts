import type { Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';

export type SecureStorageOptions = {
  requireBiometrics?: boolean;
  promptMessage?: string;
};

export interface SecureStorage {
  get(key: string, options?: SecureStorageOptions): Promise<Result<string | undefined, AppError>>;
  set(key: string, value: string, options?: SecureStorageOptions): Promise<Result<void, AppError>>;
  remove(key: string): Promise<Result<void, AppError>>;
}

export const MAX_SECURE_VALUE_BYTES = 2048;
