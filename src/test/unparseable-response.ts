import { z } from 'zod';
import { fromZodError, type AppError } from '@/core/errors/app-error';

export function unparseableResponse(): AppError {
  const parsed = z.object({ fee: z.number() }).safeParse({ fee: '0.25' });
  if (parsed.success) throw new Error('fixture should not parse');

  return fromZodError(parsed.error);
}
