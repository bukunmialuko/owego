import {
  offline,
  rateLimited,
  serverError,
  unauthenticated,
  unknownError,
  type AppError,
} from '@/core/errors/app-error';
import { setLogSink } from '@/core/log/dev-log';
import { err, ok } from '@/core/result/result';
import { createFakeTokenStore } from '@/test/fake-token-store';
import { createRefreshTokenService } from './refresh-token-service';
import type { AuthTokens } from './auth-tokens';

const createTokenStore = createFakeTokenStore;

const stored: AuthTokens = { access: 'old-access', refresh: 'old-refresh' };
const renewed: AuthTokens = { access: 'new-access', refresh: 'new-refresh' };

describe('RefreshTokenService', () => {
  it('stores the renewed pair and reports success', async () => {
    const store = createTokenStore(stored);
    const service = createRefreshTokenService({
      tokenStore: store,
      requestRefresh: () => Promise.resolve(ok(renewed)),
    });

    await expect(service.refresh()).resolves.toEqual({ type: 'refreshed', tokens: renewed });
    expect(store.current).toEqual(renewed);
  });

  it('passes the stored refresh token to the request', async () => {
    const requestRefresh = jest.fn().mockResolvedValue(ok(renewed));
    const service = createRefreshTokenService({
      tokenStore: createTokenStore(stored),
      requestRefresh,
    });

    await service.refresh();

    expect(requestRefresh).toHaveBeenCalledWith('old-refresh');
  });

  describe('single flight', () => {
    it('collapses concurrent callers into one request', async () => {
      const requestRefresh = jest.fn().mockResolvedValue(ok(renewed));
      const service = createRefreshTokenService({
        tokenStore: createTokenStore(stored),
        requestRefresh,
      });

      const outcomes = await Promise.all([service.refresh(), service.refresh(), service.refresh()]);

      expect(requestRefresh).toHaveBeenCalledTimes(1);
      for (const outcome of outcomes) {
        expect(outcome).toEqual({ type: 'refreshed', tokens: renewed });
      }
    });

    it('allows a fresh attempt once the first settles', async () => {
      const requestRefresh = jest.fn().mockResolvedValue(ok(renewed));
      const service = createRefreshTokenService({
        tokenStore: createTokenStore(stored),
        requestRefresh,
      });

      await service.refresh();
      await service.refresh();

      expect(requestRefresh).toHaveBeenCalledTimes(2);
    });
  });

  describe('transient failure versus invalid session', () => {
    it('treats a network failure as transient and keeps the tokens', async () => {
      const store = createTokenStore(stored);
      const service = createRefreshTokenService({
        tokenStore: store,
        requestRefresh: () => Promise.resolve(err(offline())),
      });

      await expect(service.refresh()).resolves.toEqual({ type: 'transient' });
      expect(store.current).toEqual(stored);
    });

    it('treats a server error as transient', async () => {
      const service = createRefreshTokenService({
        tokenStore: createTokenStore(stored),
        requestRefresh: () => Promise.resolve(err(serverError(503))),
      });

      await expect(service.refresh()).resolves.toEqual({ type: 'transient' });
    });

    it('treats a rejected refresh token as an invalid session and clears storage', async () => {
      const store = createTokenStore(stored);
      const service = createRefreshTokenService({
        tokenStore: store,
        requestRefresh: () => Promise.resolve(err(unauthenticated())),
      });

      await expect(service.refresh()).resolves.toEqual({ type: 'invalid-session' });
      expect(store.current).toBeUndefined();
    });

    it.each([
      ['a used refresh token (400)', { ...unknownError(), httpStatus: 400 }],
      ['an unknown refresh token (404)', { ...unknownError(), httpStatus: 404 }],
      ['a malformed request (422)', { ...unknownError(), httpStatus: 422 }],
    ])('treats %s as an invalid session and clears storage', async (_label, error: AppError) => {
      const store = createTokenStore(stored);
      const service = createRefreshTokenService({
        tokenStore: store,
        requestRefresh: () => Promise.resolve(err(error)),
      });

      await expect(service.refresh()).resolves.toEqual({ type: 'invalid-session' });
      expect(store.current).toBeUndefined();
    });

    it('treats rate limiting as transient', async () => {
      const service = createRefreshTokenService({
        tokenStore: createTokenStore(stored),
        requestRefresh: () => Promise.resolve(err(rateLimited(30))),
      });

      await expect(service.refresh()).resolves.toEqual({ type: 'transient' });
    });

    it('treats a missing refresh token as an invalid session without calling the api', async () => {
      const requestRefresh = jest.fn();
      const service = createRefreshTokenService({
        tokenStore: createTokenStore(undefined),
        requestRefresh,
      });

      await expect(service.refresh()).resolves.toEqual({ type: 'invalid-session' });
      expect(requestRefresh).not.toHaveBeenCalled();
    });
  });

  describe('when the renewed pair cannot be persisted', () => {
    afterEach(() => {
      setLogSink(() => undefined);
    });

    it('still refreshes the live session', async () => {
      const store = createTokenStore(stored);
      store.write = (next) => {
        store.restore(next.refresh);
        return Promise.resolve(err(unknownError('keychain full')));
      };
      const service = createRefreshTokenService({
        tokenStore: store,
        requestRefresh: () => Promise.resolve(ok(renewed)),
      });

      await expect(service.refresh()).resolves.toEqual({ type: 'refreshed', tokens: renewed });
    });

    it('reports the failure by code, and nothing else', async () => {
      const lines: string[] = [];
      setLogSink((line) => lines.push(line));
      const store = createTokenStore(stored);
      store.write = () => Promise.resolve(err(unknownError('keychain full')));
      const service = createRefreshTokenService({
        tokenStore: store,
        requestRefresh: () => Promise.resolve(ok(renewed)),
      });

      await service.refresh();

      expect(lines).toEqual(['[auth] persist-failed code=common/unknown']);
    });
  });
});
