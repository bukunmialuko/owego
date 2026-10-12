import { derivePinKey } from '@/core/crypto/pin-kdf';
import { secureRandom } from '@/core/crypto/secure-random';
import { unknownError } from '@/core/errors/app-error';
import { err } from '@/core/result/result';
import { SecureKey } from '@/core/storage/storage-keys';
import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import { createPinRepositoryImpl } from './pin-repository-impl';
import type { PinRepository } from '../../domain/repository/auth-repository';

describe('PinRepository', () => {
  let repository: PinRepository;
  const secureStorage = createSecureStorage();

  beforeEach(async () => {
    await secureStorage.remove(SecureKey.AppLockPinHash);
    await secureStorage.remove(SecureKey.PinSalt);
    await secureStorage.remove(SecureKey.UnlockAttempts);
    repository = createPinRepositoryImpl({
      secureStorage,
      random: secureRandom,
      kdf: derivePinKey,
    });
  });

  describe('when the keychain refuses', () => {
    const refusing = {
      ...secureStorage,
      get: () => Promise.resolve(err(unknownError('keychain unavailable'))),
    };

    it('reports the failure rather than a wrong pin', async () => {
      const result = await createPinRepositoryImpl({
        secureStorage: refusing,
        random: secureRandom,
        kdf: derivePinKey,
      }).verifyPin('1234');

      expect(result.ok).toBe(false);
    });

    it('reports the failure rather than an absent pin', async () => {
      const result = await createPinRepositoryImpl({
        secureStorage: refusing,
        random: secureRandom,
        kdf: derivePinKey,
      }).isPinSet();

      expect(result.ok).toBe(false);
    });
  });

  it('reports a wrong pin when nothing was ever stored', async () => {
    await expect(repository.verifyPin('1234')).resolves.toEqual({ ok: true, value: false });
  });

  it('reports no pin before one is set', async () => {
    await expect(repository.isPinSet()).resolves.toEqual({ ok: true, value: false });
  });

  it('reports a pin once set', async () => {
    await repository.setPin('1234');

    await expect(repository.isPinSet()).resolves.toEqual({ ok: true, value: true });
  });

  it('accepts the correct pin', async () => {
    await repository.setPin('1234');

    await expect(repository.verifyPin('1234')).resolves.toEqual({ ok: true, value: true });
  });

  it('rejects an incorrect pin', async () => {
    await repository.setPin('1234');

    await expect(repository.verifyPin('9999')).resolves.toEqual({ ok: true, value: false });
  });

  it('rejects any pin when none is set', async () => {
    await expect(repository.verifyPin('1234')).resolves.toEqual({ ok: true, value: false });
  });

  it('clears the pin', async () => {
    await repository.setPin('1234');
    await repository.clearPin();

    await expect(repository.isPinSet()).resolves.toEqual({ ok: true, value: false });
  });

  describe('storage form', () => {
    it('stores a hash, never the pin itself', async () => {
      await repository.setPin('1234');

      const stored = await secureStorage.get(SecureKey.AppLockPinHash);

      expect(stored.ok && stored.value).not.toContain('1234');
      expect(stored.ok && stored.value).toMatch(/^[a-f0-9]{64}$/);
    });

    it('produces a different hash for a different pin', async () => {
      await repository.setPin('1234');
      const first = await secureStorage.get(SecureKey.AppLockPinHash);

      await repository.setPin('4321');
      const second = await secureStorage.get(SecureKey.AppLockPinHash);

      expect(first.ok && first.value).not.toBe(second.ok && second.value);
    });
  });

  describe('salting', () => {
    it('produces a different digest for the same pin on a second install', async () => {
      await repository.setPin('1234');
      const first = await secureStorage.get(SecureKey.AppLockPinHash);

      await repository.clearPin();
      await repository.setPin('1234');
      const second = await secureStorage.get(SecureKey.AppLockPinHash);

      expect(first.ok && first.value).toBeDefined();
      expect(first.ok && first.value).not.toBe(second.ok && second.value);
    });

    it('stores a salt beside the digest', async () => {
      await repository.setPin('1234');

      const salt = await secureStorage.get(SecureKey.PinSalt);

      expect(salt.ok && salt.value).toMatch(/^[0-9a-f]{32}$/);
    });

    it('verifies against the salt that was stored, across a fresh repository', async () => {
      await repository.setPin('4321');

      const reopened = createPinRepositoryImpl({
        secureStorage,
        random: secureRandom,
        kdf: derivePinKey,
      });

      await expect(reopened.verifyPin('4321')).resolves.toEqual({ ok: true, value: true });
      await expect(reopened.verifyPin('1234')).resolves.toEqual({ ok: true, value: false });
    });

    it('accepts no pin when the salt is gone', async () => {
      await repository.setPin('1234');
      await secureStorage.remove(SecureKey.PinSalt);

      await expect(repository.verifyPin('1234')).resolves.toEqual({ ok: true, value: false });
    });
  });

  describe('clearing', () => {
    it('removes the digest, the salt and the attempt counter together', async () => {
      await repository.setPin('1234');
      await secureStorage.set(SecureKey.UnlockAttempts, '2');

      await repository.clearPin();

      for (const key of [SecureKey.AppLockPinHash, SecureKey.PinSalt, SecureKey.UnlockAttempts]) {
        await expect(secureStorage.get(key)).resolves.toEqual({ ok: true, value: undefined });
      }
    });
  });

  describe('on a runtime with no global crypto', () => {
    it('sets and verifies a pin', async () => {
      const restore = jest.replaceProperty(globalThis, 'crypto', undefined as unknown as Crypto);

      try {
        await expect(repository.setPin('1357')).resolves.toEqual({ ok: true, value: undefined });
        await expect(repository.verifyPin('1357')).resolves.toEqual({ ok: true, value: true });
      } finally {
        restore.restore();
      }
    });
  });

  it('reports a failing random source as an error rather than throwing', async () => {
    const broken = createPinRepositoryImpl({
      secureStorage,
      kdf: derivePinKey,
      random: () => {
        throw new Error('no entropy');
      },
    });

    const result = await broken.setPin('1357');

    expect(result.ok).toBe(false);
  });
});
