import { offline } from '@/core/errors/app-error';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import { err, ok } from '@/core/result/result';
import { createFakeTokenStore } from '@/test/fake-token-store';
import { createRegisterPushTokenUseCase } from './register-push-token-usecase';

const tokens = { access: 'a', refresh: 'r' };

function build(
  options: {
    signedIn?: boolean;
    fcmToken?: string;
    tokenFails?: boolean;
    registerFails?: boolean;
    permissionGranted?: boolean;
  } = {},
) {
  const cache = createKeyValueStorage('push-test');
  cache.clearAll();

  const calls: string[] = [];

  const register = jest.fn(() => {
    calls.push('register');
    return Promise.resolve(options.registerFails === true ? err(offline()) : ok(undefined));
  });

  const usecase = createRegisterPushTokenUseCase({
    messaging: {
      getPermissionStatus: () => Promise.resolve('not-determined' as const),
      requestPermission: () => {
        calls.push('permission');
        return Promise.resolve(options.permissionGranted === false ? 'denied' : 'granted');
      },
      getToken: () => {
        calls.push('token');
        return Promise.resolve(
          options.tokenFails === true ? err(offline()) : ok(options.fcmToken ?? 'fcm-1'),
        );
      },
      onTokenRefresh: () => () => undefined,
      onForegroundMessage: () => () => undefined,
      getInitialMessage: () => Promise.resolve(undefined),
      onNotificationOpened: () => () => undefined,
    },
    pushTokenRepository: { register, unregister: jest.fn() },
    tokenStore: createFakeTokenStore(options.signedIn === false ? undefined : tokens),
    cache,
  });

  return { usecase, register, cache, calls };
}

describe('RegisterPushTokenUseCase', () => {
  it('registers the token when signed in', async () => {
    const { usecase, register } = build();

    await usecase.execute();

    expect(register).toHaveBeenCalledWith('fcm-1');
  });

  it('does nothing without an access token, not even ask for permission', async () => {
    const { usecase, register, calls } = build({ signedIn: false });

    await usecase.execute();

    expect(register).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('gives up when no token can be fetched', async () => {
    const { usecase, register, calls } = build({ tokenFails: true });

    const result = await usecase.execute();

    expect(result.ok).toBe(false);
    expect(register).not.toHaveBeenCalled();
    expect(calls).toEqual(['token']);
  });

  describe('notification permission', () => {
    it('asks before registering a new token', async () => {
      const { usecase, calls } = build();

      await usecase.execute();

      expect(calls).toEqual(['token', 'permission', 'register']);
    });

    it('registers the token even when permission is denied', async () => {
      const { usecase, register } = build({ permissionGranted: false });

      await usecase.execute();

      expect(register).toHaveBeenCalledWith('fcm-1');
    });

    it('does not ask again for a token it has already registered', async () => {
      const { usecase, calls } = build();

      await usecase.execute();
      await usecase.execute();

      expect(calls.filter((call) => call === 'permission')).toHaveLength(1);
    });
  });

  describe('deduping', () => {
    it('does not re-post an unchanged token', async () => {
      const { usecase, register } = build();

      await usecase.execute();
      await usecase.execute();

      expect(register).toHaveBeenCalledTimes(1);
    });

    it('posts again when the token has rotated', async () => {
      const { cache } = build();
      cache.setString(CacheKey.RegisteredPushToken, 'fcm-old');

      const next = build({ fcmToken: 'fcm-new' });
      await next.usecase.execute();

      expect(next.register).toHaveBeenCalledWith('fcm-new');
    });

    it('remembers nothing when the call failed', async () => {
      const { usecase, cache } = build({ registerFails: true });

      await usecase.execute();

      expect(cache.getString(CacheKey.RegisteredPushToken)).toBeUndefined();
    });
  });

  it('collapses concurrent callers into one request', async () => {
    const { usecase, register } = build();

    await Promise.all([usecase.execute(), usecase.execute(), usecase.execute()]);

    expect(register).toHaveBeenCalledTimes(1);
  });
});
