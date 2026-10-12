import { derivePinKey } from '@/core/crypto/pin-kdf';
import { secureRandom } from '@/core/crypto/secure-random';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import { SecureKey } from '@/core/storage/storage-keys';
import type { BiometricOutcome } from '../../domain/port/auth-port';
import { createSealedSessionVault } from './sealed-session-vault';

const TOKEN = 'refresh-token-1';
const ROTATED = 'refresh-token-2';
const PIN = '1357';

const keychain: {
  getGenericPassword: jest.Mock;
  setGenericPassword: jest.Mock<Promise<unknown>, [string, string, { service: string }]>;
} = jest.requireMock('react-native-keychain');

const secureStorage = createSecureStorage();
const build = () =>
  createSealedSessionVault({
    secureStorage,
    random: secureRandom,
    kdf: derivePinKey,
    promptMessage: 'Unlock owego',
  });

const isGated = (options: unknown) =>
  typeof options === 'object' &&
  options !== null &&
  (options as { accessControl?: string }).accessControl === 'BiometryCurrentSet';

const gatedReads = () =>
  keychain.getGenericPassword.mock.calls.filter(([options]) => isGated(options)).length;
const gatedWrites = () =>
  keychain.setGenericPassword.mock.calls.filter(([, , options]) => isGated(options)).length;

function cancelNextPrompt() {
  keychain.getGenericPassword.mockImplementationOnce(() =>
    Promise.reject(Object.assign(new Error('User canceled the operation.'), { code: '-128' })),
  );
}

async function stored(key: string) {
  const result = await secureStorage.get(key);
  return result.ok ? result.value : undefined;
}

const answering = (outcome: BiometricOutcome) => () =>
  Promise.resolve<Result<BiometricOutcome, AppError>>(ok(outcome));
const proven = answering('succeeded');

async function sealWithBothCopies(token = TOKEN) {
  await build().seal(token, PIN);
  await build().addBiometricCopy(PIN, proven);
}

beforeEach(async () => {
  await build().clear();
  keychain.getGenericPassword.mockClear();
  keychain.setGenericPassword.mockClear();
});

describe('SealedSessionVault', () => {
  describe('sealing', () => {
    it('seals under the PIN alone, writing nothing behind the OS gate', async () => {
      await build().seal(TOKEN, PIN);

      expect(gatedWrites()).toBe(0);
      await expect(stored(SecureKey.SessionKeyBiometric)).resolves.toBeUndefined();
      await expect(build().openWithPin(PIN)).resolves.toEqual({
        ok: true,
        value: { type: 'opened', refreshToken: TOKEN },
      });
    });

    it('drops a biometric copy made for an earlier key when sealing again', async () => {
      await sealWithBothCopies();

      await build().seal(ROTATED, PIN);

      await expect(stored(SecureKey.SessionKeyBiometric)).resolves.toBeUndefined();
    });

    it('leaves neither the token nor the secret key readable outside Copy A', async () => {
      await sealWithBothCopies();
      const secretKeyHex = await stored(SecureKey.SessionKeyBiometric);

      for (const key of [
        SecureKey.SessionKeyPinSealed,
        SecureKey.SessionPublicKey,
        SecureKey.RefreshTokenSealed,
      ]) {
        const value = await stored(key);
        expect(value).toBeDefined();
        expect(value).not.toContain(TOKEN);
        expect(value).not.toContain(secretKeyHex);
      }
    });

    it('leaves nothing behind when any write fails', async () => {
      const passThrough = keychain.setGenericPassword.getMockImplementation();
      if (passThrough === undefined) throw new Error('the keychain stand-in has no implementation');
      keychain.setGenericPassword
        .mockImplementationOnce(passThrough)
        .mockImplementationOnce(() => Promise.reject(new Error('keychain full')));

      const result = await build().seal(TOKEN, PIN);

      expect(result.ok).toBe(false);
      for (const key of [
        SecureKey.SessionKeyBiometric,
        SecureKey.SessionKeyPinSealed,
        SecureKey.SessionPublicKey,
        SecureKey.RefreshTokenSealed,
      ]) {
        await expect(stored(key)).resolves.toBeUndefined();
      }
    });
  });

  describe('adding the biometric copy', () => {
    it('puts Copy A behind the flags the design rests on', async () => {
      await sealWithBothCopies();

      expect(keychain.setGenericPassword).toHaveBeenCalledWith(
        SecureKey.SessionKeyBiometric,
        expect.any(String),
        expect.objectContaining({
          accessControl: 'BiometryCurrentSet',
          accessible: 'AccessibleWhenUnlockedThisDeviceOnly',
        }),
      );
    });

    it('derives the PIN key, then proves, then writes Copy A with nothing in between', async () => {
      await build().seal(TOKEN, PIN);
      const order: string[] = [];
      const passThrough = keychain.setGenericPassword.getMockImplementation();
      if (passThrough === undefined) throw new Error('the keychain stand-in has no implementation');
      keychain.setGenericPassword.mockImplementation(
        (username: string, password: string, options: { service: string }) => {
          order.push(`write ${options.service}`);
          return passThrough(username, password, options);
        },
      );
      const vault = createSealedSessionVault({
        secureStorage,
        random: secureRandom,
        kdf: (pin, salt) => {
          order.push('derive');
          return derivePinKey(pin, salt);
        },
        promptMessage: 'Unlock owego',
      });

      try {
        await vault.addBiometricCopy(PIN, () => {
          order.push('prompt');
          return proven();
        });
      } finally {
        keychain.setGenericPassword.mockImplementation(passThrough);
      }

      expect(order).toEqual(['derive', 'prompt', `write ${SecureKey.SessionKeyBiometric}`]);
    });

    it('opens the current token with one prompt, even after a rotation', async () => {
      await build().seal(TOKEN, PIN);
      await build().reseal(ROTATED);

      await expect(build().addBiometricCopy(PIN, proven)).resolves.toEqual({
        ok: true,
        value: { type: 'added' },
      });
      await expect(build().openWithBiometrics()).resolves.toEqual({
        ok: true,
        value: { type: 'opened', refreshToken: ROTATED },
      });
    });

    it('never prompts for a wrong PIN', async () => {
      await build().seal(TOKEN, PIN);
      const prove = jest.fn(proven);

      await expect(build().addBiometricCopy('2468', prove)).resolves.toEqual({
        ok: true,
        value: { type: 'wrong-pin' },
      });
      expect(prove).not.toHaveBeenCalled();
      await expect(stored(SecureKey.SessionKeyBiometric)).resolves.toBeUndefined();
    });

    it.each<Exclude<BiometricOutcome, 'succeeded'>>([
      'cancelled',
      'unavailable',
      'not-enrolled',
      'invalidated',
    ])('writes nothing when the prompt answers %s', async (outcome) => {
      await build().seal(TOKEN, PIN);

      await expect(build().addBiometricCopy(PIN, answering(outcome))).resolves.toEqual({
        ok: true,
        value: { type: 'not-proven', outcome },
      });
      await expect(stored(SecureKey.SessionKeyBiometric)).resolves.toBeUndefined();
    });

    it('passes a prompt that failed outright through as an error', async () => {
      await build().seal(TOKEN, PIN);
      const failed = () =>
        Promise.resolve<Result<BiometricOutcome, AppError>>(err(unknownError('lockout')));

      const result = await build().addBiometricCopy(PIN, failed);

      expect(result.ok).toBe(false);
      await expect(stored(SecureKey.SessionKeyBiometric)).resolves.toBeUndefined();
    });

    it('reports an empty vault when nothing was sealed', async () => {
      await expect(build().addBiometricCopy(PIN, proven)).resolves.toEqual({
        ok: true,
        value: { type: 'empty' },
      });
    });

    it('leaves the PIN rung opening the token when the gated write fails', async () => {
      await build().seal(TOKEN, PIN);
      keychain.setGenericPassword.mockImplementationOnce(() =>
        Promise.reject(new Error('code: 7, msg: Too many attempts')),
      );

      const result = await build().addBiometricCopy(PIN, proven);

      expect(result.ok).toBe(false);
      await expect(build().openWithPin(PIN)).resolves.toEqual({
        ok: true,
        value: { type: 'opened', refreshToken: TOKEN },
      });
    });

    it('removing it leaves the PIN rung working', async () => {
      await sealWithBothCopies();

      await build().removeBiometricCopy();

      await expect(stored(SecureKey.SessionKeyBiometric)).resolves.toBeUndefined();
      await expect(build().openWithPin(PIN)).resolves.toEqual({
        ok: true,
        value: { type: 'opened', refreshToken: TOKEN },
      });
    });
  });

  describe('the biometric rung', () => {
    it('opens the token with exactly one OS prompt', async () => {
      await sealWithBothCopies();

      await expect(build().openWithBiometrics()).resolves.toEqual({
        ok: true,
        value: { type: 'opened', refreshToken: TOKEN },
      });
      expect(gatedReads()).toBe(1);
    });

    it('reports a dismissed prompt as a cancellation', async () => {
      await sealWithBothCopies();
      cancelNextPrompt();

      await expect(build().openWithBiometrics()).resolves.toEqual({
        ok: true,
        value: { type: 'cancelled' },
      });
    });

    it('reports Copy A missing beside a live Copy B as an invalidated enrolment', async () => {
      await sealWithBothCopies();
      await secureStorage.remove(SecureKey.SessionKeyBiometric);

      await expect(build().openWithBiometrics()).resolves.toEqual({
        ok: true,
        value: { type: 'invalidated' },
      });
    });

    it('reports an empty vault when nothing was sealed', async () => {
      await expect(build().openWithBiometrics()).resolves.toEqual({
        ok: true,
        value: { type: 'empty' },
      });
    });

    it('passes any other keychain failure through as an error', async () => {
      await sealWithBothCopies();
      keychain.getGenericPassword.mockImplementationOnce(() =>
        Promise.reject(new Error('code: 7, msg: Too many attempts')),
      );

      const result = await build().openWithBiometrics();

      expect(result.ok).toBe(false);
    });
  });

  describe('the pin rung', () => {
    it('opens the token without any OS prompt', async () => {
      await build().seal(TOKEN, PIN);

      await expect(build().openWithPin(PIN)).resolves.toEqual({
        ok: true,
        value: { type: 'opened', refreshToken: TOKEN },
      });
      expect(gatedReads()).toBe(0);
    });

    it('reports a wrong pin', async () => {
      await build().seal(TOKEN, PIN);

      await expect(build().openWithPin('2468')).resolves.toEqual({
        ok: true,
        value: { type: 'wrong-pin' },
      });
    });

    it('reports an empty vault when nothing was sealed', async () => {
      await expect(build().openWithPin(PIN)).resolves.toEqual({
        ok: true,
        value: { type: 'empty' },
      });
    });

    it('reports a corrupt Copy B as empty rather than as a wrong pin', async () => {
      await build().seal(TOKEN, PIN);
      await secureStorage.set(SecureKey.SessionKeyPinSealed, 'not-a-seal');

      await expect(build().openWithPin(PIN)).resolves.toEqual({
        ok: true,
        value: { type: 'empty' },
      });
    });
  });

  describe('re-sealing a rotated token', () => {
    it('keeps both rungs opening the current token', async () => {
      await sealWithBothCopies();

      await build().reseal(ROTATED);

      await expect(build().openWithBiometrics()).resolves.toEqual({
        ok: true,
        value: { type: 'opened', refreshToken: ROTATED },
      });
      await expect(build().openWithPin(PIN)).resolves.toEqual({
        ok: true,
        value: { type: 'opened', refreshToken: ROTATED },
      });
    });

    it('touches nothing behind the OS gate', async () => {
      await sealWithBothCopies();
      keychain.getGenericPassword.mockClear();
      keychain.setGenericPassword.mockClear();

      await build().reseal(ROTATED);

      expect(gatedReads()).toBe(0);
      expect(gatedWrites()).toBe(0);
    });

    it('refuses when no session was sealed', async () => {
      const result = await build().reseal(ROTATED);

      expect(result.ok).toBe(false);
    });
  });

  it('clears every artefact, including the retired copies', async () => {
    await sealWithBothCopies();
    await secureStorage.set(SecureKey.RefreshTokenBiometric, 'old');
    await secureStorage.set(SecureKey.RefreshTokenPinSealed, 'old');

    await build().clear();

    for (const key of [
      SecureKey.SessionKeyBiometric,
      SecureKey.SessionKeyPinSealed,
      SecureKey.SessionPublicKey,
      SecureKey.RefreshTokenSealed,
      SecureKey.RefreshTokenBiometric,
      SecureKey.RefreshTokenPinSealed,
    ]) {
      await expect(stored(key)).resolves.toBeUndefined();
    }
  });

  it('seals and opens without a global crypto, as on Hermes', async () => {
    const restore = jest.replaceProperty(globalThis, 'crypto', undefined as unknown as Crypto);

    try {
      await expect(build().seal(TOKEN, PIN)).resolves.toEqual({ ok: true, value: undefined });
      await expect(build().openWithPin(PIN)).resolves.toMatchObject({
        value: { type: 'opened', refreshToken: TOKEN },
      });
    } finally {
      restore.restore();
    }
  });
});
