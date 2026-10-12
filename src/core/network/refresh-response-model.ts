import { z } from 'zod';
import { unauthenticated, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { AuthTokens } from './auth-tokens';

export const refreshResponseSchema = z.object({
  data: z
    .object({
      token: z.string().default(''),
      refresh_token: z.string().default(''),
    })
    .default({ token: '', refresh_token: '' }),
});

export function parseRefreshResponse(payload: unknown): Result<AuthTokens, AppError> {
  const parsed = refreshResponseSchema.safeParse(payload);

  if (!parsed.success) {
    return err({ ...unauthenticated(), detail: 'Refresh response was not the expected shape.' });
  }

  const { token, refresh_token: refresh } = parsed.data.data;

  if (token === '' || refresh === '') {
    return err({ ...unauthenticated(), detail: 'Refresh response carried no token pair.' });
  }

  return ok({ access: token, refresh });
}
