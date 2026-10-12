import type { TokenPersistence } from '@/core/network/token-persistence';
import type { TokenStore } from '@/core/network/auth-tokens';

export function createAppLockAdapter(tokenStore: TokenStore, persistence: TokenPersistence) {
  return {
    sessionPersists(): Promise<boolean> {
      return persistence.persists();
    },

    async isLockRequired(): Promise<boolean> {
      if (!(await persistence.persists())) return false;

      return (await tokenStore.read()) === undefined;
    },
  };
}
