import type { ZodType } from 'zod';
import { fromZodError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';

export interface FixtureDataSource<T> {
  read(): Result<T, AppError>;
}

export function createFixtureDataSource<T>(
  data: unknown,
  schema: ZodType<T>,
): FixtureDataSource<T> {
  return {
    read() {
      const parsed = schema.safeParse(data);

      return parsed.success ? ok(parsed.data) : err(fromZodError(parsed.error));
    },
  };
}
