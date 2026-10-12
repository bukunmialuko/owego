import { asValue } from 'awilix';
import type { AppConfig } from '@/core/config/app-config';
import { testAppConfig } from '@/test/test-config';
import type { HttpClient } from '@/core/network/http-client';
import type { AuthTokens } from '@/core/network/auth-tokens';
import { createFakeTokenStore } from '@/test/fake-token-store';
import { ok } from '@/core/result/result';
import { CacheKey, PreferenceKey } from '@/core/storage/storage-keys';
import { createAppContainer, type AppCradle } from './container';
import { KycState } from '@/core/session/onboarding-gate';

const config: AppConfig = testAppConfig;

describe('createAppContainer', () => {
  it('resolves every registered dependency', () => {
    const container = createAppContainer(config);

    const keys: (keyof AppCradle)[] = [
      'config',
      'secureStorage',
      'cache',
      'tokenStore',
      'refreshTokenService',
      'apiClient',
      'publicApiClient',
      'telemetry',
      'featureFlags',
      'sessionCleanup',
      'avatarAppearanceStore',
      'displayCurrencyStore',
    ];

    for (const key of keys) {
      expect(container.resolve(key)).toBeDefined();
    }
  });

  it('reuses a singleton across resolutions', () => {
    const container = createAppContainer(config);

    expect(container.resolve('cache')).toBe(container.resolve('cache'));
    expect(container.resolve('sessionCleanup')).toBe(container.resolve('sessionCleanup'));
  });

  it('exposes the config it was built with', () => {
    expect(createAppContainer(config).resolve('config')).toEqual(config);
  });

  it('builds independent containers', () => {
    const first = createAppContainer(config);
    const second = createAppContainer(config);

    expect(first.resolve('cache')).not.toBe(second.resolve('cache'));
  });

  describe('test seams', () => {
    it('accepts a replacement for any dependency', () => {
      const fakeTelemetry = { captureError: jest.fn(), track: jest.fn(), identify: jest.fn() };

      const container = createAppContainer(config, { telemetry: asValue(fakeTelemetry) });

      expect(container.resolve('telemetry')).toBe(fakeTelemetry);
    });

    it('leaves untouched dependencies intact when overriding', () => {
      const container = createAppContainer(config, {
        telemetry: asValue({ captureError: jest.fn(), track: jest.fn(), identify: jest.fn() }),
      });

      expect(container.resolve('apiClient')).toBeDefined();
    });

    it('rejects a replacement that does not satisfy the interface', () => {
      // @ts-expect-error telemetry requires captureError, track and identify
      createAppContainer(config, { telemetry: asValue({}) });
    });
  });

  it('fails loudly on an unregistered key', () => {
    const container = createAppContainer(config);

    expect(() => container.resolve('nope' as keyof AppCradle)).toThrow();
  });

  describe('refresh token service wiring', () => {
    function containerWithRefreshResponse(body: unknown) {
      const stored: AuthTokens = { access: 'old-access', refresh: 'old-refresh' };

      const tokenStore = createFakeTokenStore(stored);

      const post = jest.fn().mockResolvedValue(ok(body));
      const publicApiClient = { post } as unknown as HttpClient;

      return {
        container: createAppContainer(config, {
          tokenStore: asValue(tokenStore),
          publicApiClient: asValue(publicApiClient),
        }),
        post,
        readTokens: () => tokenStore.current,
      };
    }

    it('turns the api envelope into a usable token pair', async () => {
      const { container, post, readTokens } = containerWithRefreshResponse({
        data: { token: 'new-access', refresh_token: 'new-refresh', user: { id: 'u1' } },
      });

      const outcome = await container.resolve('refreshTokenService').refresh();

      expect(post).toHaveBeenCalledWith('/auth/refresh', { refresh_token: 'old-refresh' });
      expect(outcome).toEqual({
        type: 'refreshed',
        tokens: { access: 'new-access', refresh: 'new-refresh' },
      });
      expect(readTokens()).toEqual({ access: 'new-access', refresh: 'new-refresh' });
    });

    it('treats an envelope with no token as an invalid session', async () => {
      const { container, readTokens } = containerWithRefreshResponse({ data: {} });

      await expect(container.resolve('refreshTokenService').refresh()).resolves.toEqual({
        type: 'invalid-session',
      });
      expect(readTokens()).toBeUndefined();
    });
  });

  describe('session cleanup', () => {
    it('wipes account storage on sign-out', async () => {
      const container = createAppContainer(config);
      const { cache, sessionCleanup } = container.cradle;

      cache.setString(CacheKey.UserProfile, '{"id":"u1"}');
      cache.setString(PreferenceKey.ThemePreference, 'dark');

      await expect(sessionCleanup.runAll()).resolves.toEqual([]);

      expect(cache.getString(CacheKey.UserProfile)).toBeUndefined();
      expect(cache.getString(PreferenceKey.ThemePreference)).toBe('dark');
    });

    it('forgets the avatar look when the account signs out', async () => {
      const container = createAppContainer(config);
      const { cache, sessionStore, avatarAppearanceStore, signOutUseCase } = container.cradle;
      const ada = { id: 'u1', firstName: 'Ada', kycState: KycState.Approved };
      sessionStore.getState().signedIn(ada, 'ready');
      avatarAppearanceStore.getState().save({ kind: 'initials', swatch: 'coral' });
      expect(cache.getString(CacheKey.AvatarPreferences)).toBeDefined();

      await signOutUseCase.execute();

      expect(cache.getString(CacheKey.AvatarPreferences)).toBeUndefined();
      expect(avatarAppearanceStore.getState().appearance).toEqual({ kind: 'default' });

      sessionStore.getState().signedIn(ada, 'ready');
      expect(avatarAppearanceStore.getState().appearance).toEqual({ kind: 'default' });
    });
  });

  describe('the two http clients', () => {
    it('registers them separately, mirroring v1s authorized and unauthorized services', () => {
      const container = createAppContainer(config);

      expect(container.resolve('apiClient')).not.toBe(container.resolve('publicApiClient'));
    });
  });
});
