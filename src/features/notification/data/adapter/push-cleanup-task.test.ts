import { offline } from '@/core/errors/app-error';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { createSessionCleanupRegistry } from '@/core/session/session-cleanup';
import { CacheKey } from '@/core/storage/storage-keys';
import { err, ok } from '@/core/result/result';
import { createFakeTokenStore } from '@/test/fake-token-store';
import { createStorageCleanupTask } from '@/core/session/storage-cleanup-task';
import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import { createPushCleanupTask } from './push-cleanup-task';

const tokens = { access: 'access-1', refresh: 'refresh-1' };

function build(options: { unregisterFails?: boolean } = {}) {
  const cache = createKeyValueStorage('push-cleanup-test');
  cache.clearAll();
  cache.setString(CacheKey.RegisteredPushToken, 'fcm-1');

  const seenBearers: string[] = [];
  const tokenStore = createFakeTokenStore(tokens);

  const task = createPushCleanupTask({
    pushTokenRepository: {
      register: jest.fn(),
      unregister: (accessToken: string) => {
        seenBearers.push(accessToken);
        return Promise.resolve(options.unregisterFails === true ? err(offline()) : ok(undefined));
      },
    },
    tokenStore,
    cache,
  });

  return { task, cache, seenBearers, tokenStore };
}

describe('pushCleanupTask', () => {
  it('sends the bearer it snapshotted', async () => {
    const { task, seenBearers } = build();

    await task.run();

    expect(seenBearers).toEqual(['access-1']);
  });

  it('forgets the registered token so the next sign-in registers again', async () => {
    const { task, cache } = build();

    await task.run();

    expect(cache.getString(CacheKey.RegisteredPushToken)).toBeUndefined();
  });

  it('does nothing when there is no session left', async () => {
    const { task, tokenStore, seenBearers } = build();
    await tokenStore.clear();

    await task.run();

    expect(seenBearers).toEqual([]);
  });

  it('does not throw when the call fails', async () => {
    const { task } = build({ unregisterFails: true });

    await expect(task.run()).resolves.toBeUndefined();
  });

  it('runs before storage is cleared, so the bearer is still there', async () => {
    const { task, seenBearers, tokenStore } = build();
    const registry = createSessionCleanupRegistry();

    registry.registerPre(task);
    registry.register(
      createStorageCleanupTask({
        cache: createKeyValueStorage('push-cleanup-test'),
        secureStorage: createSecureStorage(),
      }),
    );
    registry.register({
      name: 'tokens',
      run: () => tokenStore.clear(),
    });

    await registry.runAll();

    expect(seenBearers).toEqual(['access-1']);
  });
});
