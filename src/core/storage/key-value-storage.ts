import type { ZodType } from 'zod';
import type { Result } from '@/core/result/result';
import type { AppError } from '@/core/errors/app-error';

export interface KeyValueStorage {
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  getObject<T>(key: string, schema: ZodType<T>): Result<T | undefined, AppError>;
  setObject(key: string, value: unknown): void;
  remove(key: string): void;
  clearAll(): void;
}
