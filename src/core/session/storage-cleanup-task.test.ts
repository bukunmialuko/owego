import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import {
  CLEARED_ON_SIGN_OUT,
  CacheKey,
  PreferenceKey,
  SecureKey,
} from '@/core/storage/storage-keys';
import { createSessionCleanupRegistry } from './session-cleanup';
import { createStorageCleanupTask } from './storage-cleanup-task';

async function seed() {
  const cache = createKeyValueStorage('storage-cleanup-test');
  const secureStorage = createSecureStorage();

  cache.clearAll();
  for (const key of Object.values(CacheKey)) cache.setString(key, `cached:${key}`);
  for (const key of Object.values(PreferenceKey)) cache.setString(key, `preferred:${key}`);
  for (const key of Object.values(SecureKey)) await secureStorage.set(key, `secret:${key}`);

  return { cache, secureStorage, task: createStorageCleanupTask({ cache, secureStorage }) };
}

describe('storageCleanupTask', () => {
  it('removes every cached value', async () => {
    const { cache, task } = await seed();

    await task.run();

    for (const key of Object.values(CacheKey)) {
      expect(cache.getString(key)).toBeUndefined();
    }
  });

  it('removes every secret', async () => {
    const { secureStorage, task } = await seed();

    await task.run();

    for (const key of Object.values(SecureKey)) {
      await expect(secureStorage.get(key)).resolves.toEqual({ ok: true, value: undefined });
    }
  });

  it('leaves device preferences alone', async () => {
    const { cache, task } = await seed();

    await task.run();

    for (const key of Object.values(PreferenceKey)) {
      expect(cache.getString(key)).toBe(`preferred:${key}`);
    }
  });

  it('clears exactly the published sign-out set', async () => {
    const { cache, secureStorage, task } = await seed();

    await task.run();

    const remaining: string[] = [];
    for (const key of Object.values(CacheKey)) {
      if (cache.getString(key) !== undefined) remaining.push(key);
    }
    for (const key of Object.values(SecureKey)) {
      const stored = await secureStorage.get(key);
      if (stored.ok && stored.value !== undefined) remaining.push(key);
    }

    expect(remaining).toEqual([]);
    expect(CLEARED_ON_SIGN_OUT.length).toBeGreaterThan(0);
  });

  it('runs through the cleanup registry', async () => {
    const { cache, task } = await seed();
    const registry = createSessionCleanupRegistry();
    registry.register(task);

    await expect(registry.runAll()).resolves.toEqual([]);
    expect(cache.getString(CacheKey.UserProfile)).toBeUndefined();
  });

  it('attempts every key even when one store refuses', async () => {
    const { cache } = await seed();
    const failing = {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn().mockRejectedValue(new Error('keychain locked')),
    };

    const task = createStorageCleanupTask({ cache, secureStorage: failing });
    await task.run();

    expect(failing.remove).toHaveBeenCalledTimes(Object.values(SecureKey).length);
    expect(cache.getString(CacheKey.UserProfile)).toBeUndefined();
  });
});
