import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import type { SecureStorage } from '@/core/storage/secure-storage';
import { CacheKey, SecureKey } from '@/core/storage/storage-keys';
import type { SessionCleanupTask } from './session-cleanup';

type Dependencies = {
  cache: KeyValueStorage;
  secureStorage: SecureStorage;
};

export function createStorageCleanupTask({
  cache,
  secureStorage,
}: Dependencies): SessionCleanupTask {
  return {
    name: 'storage',

    async run() {
      for (const key of Object.values(CacheKey)) {
        cache.remove(key);
      }

      await Promise.allSettled(Object.values(SecureKey).map((key) => secureStorage.remove(key)));
    },
  };
}
