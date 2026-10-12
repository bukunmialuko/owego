import type { SecureStorage } from '@/core/storage/secure-storage';
import { SecureKey } from '@/core/storage/storage-keys';
import type { UnlockAttemptStore } from '../../domain/port/auth-port';

export function createUnlockAttemptStore(secureStorage: SecureStorage): UnlockAttemptStore {
  async function read(): Promise<number> {
    const stored = await secureStorage.get(SecureKey.UnlockAttempts);
    if (!stored.ok || stored.value === undefined) return 0;

    const parsed = Number.parseInt(stored.value, 10);

    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1;
  }

  return {
    read,

    async increment() {
      const next = (await read()) + 1;
      await secureStorage.set(SecureKey.UnlockAttempts, String(next));

      return next;
    },

    async reset() {
      await secureStorage.remove(SecureKey.UnlockAttempts);
    },
  };
}
