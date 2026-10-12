import { ErrorCategory, type AppError } from '@/core/errors/app-error';
import { devLog } from '@/core/log/dev-log';
import type { Result } from '@/core/result/result';
import type { AuthTokens, TokenStore } from './auth-tokens';

export type RefreshOutcome =
  { type: 'refreshed'; tokens: AuthTokens } | { type: 'transient' } | { type: 'invalid-session' };

export interface RefreshTokenService {
  refresh(): Promise<RefreshOutcome>;
}

type Dependencies = {
  tokenStore: TokenStore;
  requestRefresh: (refreshToken: string) => Promise<Result<AuthTokens, AppError>>;
};

export function createRefreshTokenService({
  tokenStore,
  requestRefresh,
}: Dependencies): RefreshTokenService {
  let inFlight: Promise<RefreshOutcome> | undefined;

  async function performRefresh(): Promise<RefreshOutcome> {
    const tokens = await tokenStore.read();
    if (tokens === undefined) return { type: 'invalid-session' };

    const result = await requestRefresh(tokens.refresh);

    if (result.ok) {
      const persisted = await tokenStore.write(result.value);

      if (!persisted.ok) devLog('auth', 'persist-failed', { code: persisted.error.code });

      return { type: 'refreshed', tokens: result.value };
    }

    if (isRejection(result.error)) {
      await tokenStore.clear();
      return { type: 'invalid-session' };
    }

    return { type: 'transient' };
  }

  return {
    refresh() {
      inFlight ??= performRefresh().finally(() => {
        inFlight = undefined;
      });

      return inFlight;
    },
  };
}

function isRejection(error: AppError): boolean {
  if (error.category === ErrorCategory.Auth) return true;

  const status = error.httpStatus;
  if (status === undefined || status < 400 || status >= 500) return false;

  return status !== 408 && status !== 429;
}
