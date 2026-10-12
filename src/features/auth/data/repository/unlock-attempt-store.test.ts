import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import { SecureKey } from '@/core/storage/storage-keys';
import { createUnlockAttemptStore } from './unlock-attempt-store';

describe('UnlockAttemptStore', () => {
  const secureStorage = createSecureStorage();

  beforeEach(async () => {
    await secureStorage.remove(SecureKey.UnlockAttempts);
  });

  it('starts at zero', async () => {
    await expect(createUnlockAttemptStore(secureStorage).read()).resolves.toBe(0);
  });

  it('returns the count including the attempt just made', async () => {
    const store = createUnlockAttemptStore(secureStorage);

    await expect(store.increment()).resolves.toBe(1);
    await expect(store.increment()).resolves.toBe(2);
  });

  it('survives a new store over the same storage', async () => {
    await createUnlockAttemptStore(secureStorage).increment();
    await createUnlockAttemptStore(secureStorage).increment();

    await expect(createUnlockAttemptStore(secureStorage).read()).resolves.toBe(2);
  });

  it('clears on reset', async () => {
    const store = createUnlockAttemptStore(secureStorage);
    await store.increment();

    await store.reset();

    await expect(store.read()).resolves.toBe(0);
  });

  it.each(['nonsense', '-3', ''])('treats %p as an attempt already spent', async (value) => {
    await secureStorage.set(SecureKey.UnlockAttempts, value);

    await expect(createUnlockAttemptStore(secureStorage).read()).resolves.toBe(1);
  });
});
