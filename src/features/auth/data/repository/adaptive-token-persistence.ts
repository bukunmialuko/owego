import type { TokenPersistence } from '@/core/network/token-persistence';
import { ok } from '@/core/result/result';
import type { SessionVault } from '../../domain/port/auth-port';
import type { SignInSettingsRepository } from '../../domain/repository/auth-repository';

type Dependencies = {
  vault: Pick<SessionVault, 'reseal' | 'clear'>;
  settings: Pick<SignInSettingsRepository, 'read'>;
};

export function createAdaptiveTokenPersistence({
  vault,
  settings,
}: Dependencies): TokenPersistence {
  async function persists(): Promise<boolean> {
    return (await settings.read()).pin;
  }

  return {
    persists,

    async save(refreshToken) {
      return (await persists()) ? vault.reseal(refreshToken) : ok(undefined);
    },

    clear() {
      return vault.clear();
    },
  };
}
