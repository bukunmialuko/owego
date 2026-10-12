import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { equalBytes } from '@/core/crypto/constant-time';
import type { PinKdf } from '@/core/crypto/pin-kdf';
import type { SecureRandom } from '@/core/crypto/secure-random';
import { err, ok, type Result } from '@/core/result/result';
import { unknownError, type AppError } from '@/core/errors/app-error';
import type { SecureStorage } from '@/core/storage/secure-storage';
import { SecureKey } from '@/core/storage/storage-keys';
import type { PinRepository } from '../../domain/repository/auth-repository';

const SALT_BYTES = 16;

type Dependencies = {
  secureStorage: SecureStorage;
  random: SecureRandom;
  kdf: PinKdf;
};

export function createPinRepositoryImpl({
  secureStorage,
  random,
  kdf,
}: Dependencies): PinRepository {
  async function readBytes(key: SecureKey): Promise<Result<Uint8Array | undefined, AppError>> {
    const stored = await secureStorage.get(key);
    if (!stored.ok) return stored;
    if (stored.value === undefined) return ok(undefined);

    try {
      return ok(hexToBytes(stored.value));
    } catch {
      return ok(undefined);
    }
  }

  return {
    async setPin(pin) {
      let salt: Uint8Array;
      try {
        salt = random(SALT_BYTES);
      } catch (cause) {
        return err(unknownError('Could not draw a salt for the pin digest.', cause));
      }

      const derived = await kdf(pin, salt);
      if (!derived.ok) return derived;
      const digest = derived.value;

      const savedSalt = await secureStorage.set(SecureKey.PinSalt, bytesToHex(salt));
      if (!savedSalt.ok) return savedSalt;

      return secureStorage.set(SecureKey.AppLockPinHash, bytesToHex(digest));
    },

    async verifyPin(pin): Promise<Result<boolean, AppError>> {
      const [salt, expected] = await Promise.all([
        readBytes(SecureKey.PinSalt),
        readBytes(SecureKey.AppLockPinHash),
      ]);
      if (!salt.ok) return salt;
      if (!expected.ok) return expected;

      if (salt.value === undefined || expected.value === undefined) return ok(false);

      const derived = await kdf(pin, salt.value);

      return derived.ok ? ok(equalBytes(derived.value, expected.value)) : derived;
    },

    async clearPin() {
      const removals = await Promise.all([
        secureStorage.remove(SecureKey.AppLockPinHash),
        secureStorage.remove(SecureKey.PinSalt),
        secureStorage.remove(SecureKey.UnlockAttempts),
      ]);

      return removals.find((removal) => !removal.ok) ?? ok(undefined);
    },

    async isPinSet() {
      const digest = await readBytes(SecureKey.AppLockPinHash);
      if (!digest.ok) return digest;

      return ok(digest.value !== undefined);
    },
  };
}
