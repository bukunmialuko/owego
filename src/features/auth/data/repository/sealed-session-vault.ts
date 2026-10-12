import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import type { PinKdf } from '@/core/crypto/pin-kdf';
import { openUnderPin, sealUnderPin } from '@/core/crypto/pin-seal';
import { generateKeyPair, openWith, sealTo } from '@/core/crypto/sealed-box';
import type { SecureRandom } from '@/core/crypto/secure-random';
import { ErrorCode, unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { SecureStorage } from '@/core/storage/secure-storage';
import { SecureKey } from '@/core/storage/storage-keys';
import type {
  SessionVault,
  VaultBiometricCopyOutcome,
  VaultBiometricOutcome,
  VaultPinOutcome,
} from '../../domain/port/auth-port';

type Dependencies = {
  secureStorage: SecureStorage;
  random: SecureRandom;
  kdf: PinKdf;
  promptMessage: string;
};

const ARTEFACTS = [
  SecureKey.SessionKeyBiometric,
  SecureKey.SessionKeyPinSealed,
  SecureKey.SessionPublicKey,
  SecureKey.RefreshTokenSealed,
  SecureKey.RefreshTokenBiometric,
  SecureKey.RefreshTokenPinSealed,
] as const;

export function createSealedSessionVault({
  secureStorage,
  random,
  kdf,
  promptMessage,
}: Dependencies): SessionVault {
  async function clear(): Promise<Result<void, AppError>> {
    const removals = await Promise.all(ARTEFACTS.map((key) => secureStorage.remove(key)));

    return removals.find((removal) => !removal.ok) ?? ok(undefined);
  }

  async function openToken(secretKey: Uint8Array): Promise<Result<string | undefined, AppError>> {
    const sealed = await secureStorage.get(SecureKey.RefreshTokenSealed);
    if (!sealed.ok) return sealed;
    if (sealed.value === undefined) return ok(undefined);

    return ok(openWith(secretKey, sealed.value));
  }

  async function writeAll(refreshToken: string, pin: string): Promise<Result<void, AppError>> {
    const staleCopyA = await secureStorage.remove(SecureKey.SessionKeyBiometric);
    if (!staleCopyA.ok) return staleCopyA;

    const pair = generateKeyPair(random);

    const sealedKey = await sealUnderPin(pair.secretKey, pin, random, kdf);
    if (!sealedKey.ok) return sealedKey;

    const copyB = await secureStorage.set(SecureKey.SessionKeyPinSealed, sealedKey.value);
    if (!copyB.ok) return copyB;

    const publicKey = await secureStorage.set(
      SecureKey.SessionPublicKey,
      bytesToHex(pair.publicKey),
    );
    if (!publicKey.ok) return publicKey;

    const token = sealTo(pair.publicKey, refreshToken, random);
    if (!token.ok) return token;

    return secureStorage.set(SecureKey.RefreshTokenSealed, token.value);
  }

  return {
    clear,

    async seal(refreshToken, pin) {
      let written: Result<void, AppError>;
      try {
        written = await writeAll(refreshToken, pin);
      } catch (cause) {
        written = err(unknownError('Could not seal the session.', cause));
      }

      if (!written.ok) await clear();

      return written;
    },

    async addBiometricCopy(pin, prove): Promise<Result<VaultBiometricCopyOutcome, AppError>> {
      const copyB = await secureStorage.get(SecureKey.SessionKeyPinSealed);
      if (!copyB.ok) return copyB;
      if (copyB.value === undefined) return ok({ type: 'empty' });

      const opened = await openUnderPin(copyB.value, pin, kdf);
      if (!opened.ok) return opened;
      if (opened.value.type === 'wrong-pin') return ok({ type: 'wrong-pin' });
      if (opened.value.type === 'malformed') return ok({ type: 'empty' });
      const { secret } = opened.value;

      const proof = await prove();
      if (!proof.ok) return proof;
      if (proof.value !== 'succeeded') return ok({ type: 'not-proven', outcome: proof.value });

      const copyA = await secureStorage.set(SecureKey.SessionKeyBiometric, bytesToHex(secret), {
        requireBiometrics: true,
        promptMessage,
      });

      return copyA.ok ? ok({ type: 'added' }) : copyA;
    },

    removeBiometricCopy() {
      return secureStorage.remove(SecureKey.SessionKeyBiometric);
    },

    async openWithBiometrics(): Promise<Result<VaultBiometricOutcome, AppError>> {
      const copyA = await secureStorage.get(SecureKey.SessionKeyBiometric, {
        requireBiometrics: true,
        promptMessage,
      });

      if (!copyA.ok) {
        return copyA.error.code === ErrorCode.PromptCancelled ? ok({ type: 'cancelled' }) : copyA;
      }

      if (copyA.value === undefined) {
        const copyB = await secureStorage.get(SecureKey.SessionKeyPinSealed);
        if (!copyB.ok) return copyB;

        return ok({ type: copyB.value === undefined ? 'empty' : 'invalidated' });
      }

      let secretKey: Uint8Array;
      try {
        secretKey = hexToBytes(copyA.value);
      } catch {
        return ok({ type: 'invalidated' });
      }

      const token = await openToken(secretKey);
      if (!token.ok) return token;

      return ok(
        token.value === undefined
          ? { type: 'empty' }
          : { type: 'opened', refreshToken: token.value },
      );
    },

    async openWithPin(pin): Promise<Result<VaultPinOutcome, AppError>> {
      const copyB = await secureStorage.get(SecureKey.SessionKeyPinSealed);
      if (!copyB.ok) return copyB;
      if (copyB.value === undefined) return ok({ type: 'empty' });

      const outcome = await openUnderPin(copyB.value, pin, kdf);
      if (!outcome.ok) return outcome;
      const opened = outcome.value;

      switch (opened.type) {
        case 'wrong-pin':
          return ok({ type: 'wrong-pin' });
        case 'malformed':
          return ok({ type: 'empty' });
        case 'opened': {
          const token = await openToken(opened.secret);
          if (!token.ok) return token;

          return ok(
            token.value === undefined
              ? { type: 'empty' }
              : { type: 'opened', refreshToken: token.value },
          );
        }
      }
    },

    async reseal(refreshToken) {
      const publicKeyHex = await secureStorage.get(SecureKey.SessionPublicKey);
      if (!publicKeyHex.ok) return publicKeyHex;
      if (publicKeyHex.value === undefined) {
        return err(unknownError('No sealed session: nothing to re-seal.'));
      }

      let publicKey: Uint8Array;
      try {
        publicKey = hexToBytes(publicKeyHex.value);
      } catch (cause) {
        return err(unknownError('The stored public key is corrupt.', cause));
      }

      const token = sealTo(publicKey, refreshToken, random);
      if (!token.ok) return token;

      return secureStorage.set(SecureKey.RefreshTokenSealed, token.value);
    },
  };
}
