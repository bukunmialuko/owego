import type { TokenStore } from '@/core/network/auth-tokens';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import type { SessionCleanupTask } from '@/core/session/session-cleanup';
import type { PushTokenRepository } from '../../domain/repository/push-token-repository';

type Dependencies = {
  pushTokenRepository: PushTokenRepository;
  tokenStore: TokenStore;
  cache: KeyValueStorage;
};

export function createPushCleanupTask({
  pushTokenRepository,
  tokenStore,
  cache,
}: Dependencies): SessionCleanupTask {
  return {
    name: 'push-token',

    async run() {
      const tokens = await tokenStore.read();
      if (tokens === undefined || tokens.access === '') return;

      await pushTokenRepository.unregister(tokens.access);

      cache.remove(CacheKey.RegisteredPushToken);
    },
  };
}
