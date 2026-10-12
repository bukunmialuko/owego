import { derivePinKey } from '@/core/crypto/pin-kdf';
import { secureRandom } from '@/core/crypto/secure-random';
import { createTokenStore } from '@/core/network/auth-tokens';
import { createRefreshTokenService } from '@/core/network/refresh-token-service';
import { ok } from '@/core/result/result';
import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import { SecureKey } from '@/core/storage/storage-keys';
import { createAppLockAdapter } from './data/adapter/app-lock-adapter';
import { createAdaptiveTokenPersistence } from './data/repository/adaptive-token-persistence';
import { createPinRepositoryImpl } from './data/repository/pin-repository-impl';
import { createSealedSessionVault } from './data/repository/sealed-session-vault';
import { createSignInSettingsRepositoryImpl } from './data/repository/sign-in-settings-repository-impl';
import { createUnlockAttemptStore } from './data/repository/unlock-attempt-store';
import type { BiometricOutcome, BiometricPort } from './domain/port/auth-port';
import { createBiometricSignInToggleUseCase } from './domain/usecase/biometric-sign-in-toggle-usecase';
import { createPinSignInToggleUseCase } from './domain/usecase/pin-sign-in-toggle-usecase';
import { createUnlockUseCase } from './domain/usecase/unlock-usecase';

const PIN = '1357';

const keychain: { getGenericPassword: jest.Mock<Promise<unknown>, [unknown]> } =
  jest.requireMock('react-native-keychain');
const secureStorage = createSecureStorage();

const keychainRead = requireImplementation(keychain.getGenericPassword.getMockImplementation());

function requireImplementation<T>(implementation: T | undefined): T {
  if (implementation === undefined) throw new Error('the keychain stand-in has no implementation');
  return implementation;
}

const isGated = (options: unknown) =>
  (options as { accessControl?: string }).accessControl === 'BiometryCurrentSet';
const osPrompts = () =>
  keychain.getGenericPassword.mock.calls.filter(([options]) => isGated(options)).length;

function cancelNextOsPrompt() {
  let isSpent = false;
  keychain.getGenericPassword.mockImplementation((options: unknown) => {
    if (isSpent || !isGated(options)) return keychainRead(options);

    isSpent = true;
    return Promise.reject(
      Object.assign(new Error('User canceled the operation.'), { code: '-128' }),
    );
  });
}

let issued = 0;
const requestRefresh = () => {
  issued += 1;
  return Promise.resolve(ok({ access: `access-${issued}`, refresh: `refresh-${issued}` }));
};

function launch(standalonePrompt: BiometricOutcome = 'succeeded') {
  const settings = createSignInSettingsRepositoryImpl(secureStorage);
  const pinRepository = createPinRepositoryImpl({
    secureStorage,
    random: secureRandom,
    kdf: derivePinKey,
  });
  const attempts = createUnlockAttemptStore(secureStorage);
  const vault = createSealedSessionVault({
    secureStorage,
    random: secureRandom,
    kdf: derivePinKey,
    promptMessage: 'Unlock owego',
  });
  const tokenStore = createTokenStore(createAdaptiveTokenPersistence({ vault, settings }));
  const biometrics: BiometricPort = {
    authenticate: () => Promise.resolve(ok(standalonePrompt)),
    availability: () => Promise.resolve({ type: 'available', kind: 'face-id' }),
  };
  const biometricSignIn = createBiometricSignInToggleUseCase({ biometrics, settings, vault });

  return {
    tokenStore,
    appLock: createAppLockAdapter(tokenStore, createAdaptiveTokenPersistence({ vault, settings })),
    refresh: createRefreshTokenService({ tokenStore, requestRefresh }),
    unlock: createUnlockUseCase({
      biometrics,
      settings,
      biometricSignIn,
      vault,
      tokenStore,
      pinRepository,
      attempts,
    }),
    pinSignIn: createPinSignInToggleUseCase({
      pinRepository,
      settings,
      attempts,
      tokenStore,
      vault,
    }),
    biometricSignIn,
  };
}

async function pinOnlyThenKilled() {
  const app = launch();
  await app.tokenStore.write({ access: 'access-0', refresh: 'refresh-0' });
  await expect(app.pinSignIn.enable(PIN)).resolves.toEqual(ok({ type: 'enabled' }));
  keychain.getGenericPassword.mockClear();
}

async function enabledThenKilled() {
  const app = launch();
  await app.tokenStore.write({ access: 'access-0', refresh: 'refresh-0' });
  await expect(app.pinSignIn.enable(PIN)).resolves.toEqual(ok({ type: 'enabled' }));
  await expect(app.biometricSignIn.enable(PIN)).resolves.toEqual(ok({ type: 'enabled' }));
  keychain.getGenericPassword.mockClear();
}

beforeEach(async () => {
  for (const key of Object.values(SecureKey)) await secureStorage.remove(key);
  keychain.getGenericPassword.mockImplementation(keychainRead);
  keychain.getGenericPassword.mockClear();
  issued = 0;
});

describe('session continuity', () => {
  describe('the boot', () => {
    it('asks for the lock without showing any prompt', async () => {
      await enabledThenKilled();
      const app = launch();

      await expect(app.appLock.isLockRequired()).resolves.toBe(true);
      expect(osPrompts()).toBe(0);
    });

    it('does not lock a session that was never sealed', async () => {
      const app = launch();
      await app.tokenStore.write({ access: 'access-0', refresh: 'refresh-0' });

      await expect(launch().appLock.isLockRequired()).resolves.toBe(false);
    });
  });

  describe('unlocking with biometrics', () => {
    it('takes exactly one OS prompt, and the first request needs no other', async () => {
      await enabledThenKilled();
      const app = launch();

      await expect(app.unlock.tryBiometric()).resolves.toEqual(ok({ type: 'unlocked' }));
      const bearer = await app.tokenStore.read();

      expect(bearer?.refresh).toBe('refresh-0');
      expect(osPrompts()).toBe(1);
    });
  });

  describe('unlocking with the pin after cancelling biometrics', () => {
    it('opens the session with no further prompt', async () => {
      await enabledThenKilled();
      const app = launch();
      cancelNextOsPrompt();

      await expect(app.unlock.tryBiometric()).resolves.toEqual(
        ok({ type: 'needs-pin', reason: 'cancelled' }),
      );
      await expect(app.unlock.tryPin(PIN)).resolves.toEqual(ok({ type: 'unlocked' }));
      const bearer = await app.tokenStore.read();

      expect(bearer?.refresh).toBe('refresh-0');
      expect(osPrompts()).toBe(1);
    });
  });

  describe('after the token rotates', () => {
    it('opens the current token with the pin', async () => {
      await enabledThenKilled();
      const first = launch();
      await first.unlock.tryBiometric();
      await first.refresh.refresh();
      await first.refresh.refresh();

      const next = launch();
      await next.unlock.tryPin(PIN);

      await expect(next.tokenStore.read()).resolves.toEqual({ access: '', refresh: 'refresh-2' });
    });

    it('opens the current token with biometrics', async () => {
      await enabledThenKilled();
      const first = launch();
      await first.unlock.tryPin(PIN);
      await first.refresh.refresh();

      const next = launch();
      await next.unlock.tryBiometric();

      await expect(next.tokenStore.read()).resolves.toEqual({ access: '', refresh: 'refresh-1' });
    });

    it('never prompts during a refresh', async () => {
      await enabledThenKilled();
      const app = launch();
      await app.unlock.tryPin(PIN);

      await app.refresh.refresh();

      expect(osPrompts()).toBe(0);
    });
  });

  describe('resuming past the grace window', () => {
    it('locks without a prompt and unlocks with exactly one', async () => {
      await enabledThenKilled();
      const app = launch();
      await app.unlock.tryPin(PIN);
      await app.refresh.refresh();

      app.tokenStore.lock();
      await expect(app.appLock.isLockRequired()).resolves.toBe(true);
      await app.unlock.tryBiometric();

      await expect(app.tokenStore.read()).resolves.toEqual({ access: '', refresh: 'refresh-1' });
      expect(osPrompts()).toBe(1);
    });
  });

  describe('a PIN-only session', () => {
    it('survives the process and opens with the PIN, never prompting', async () => {
      await pinOnlyThenKilled();
      const app = launch();

      await expect(app.appLock.isLockRequired()).resolves.toBe(true);
      await expect(app.unlock.tryBiometric()).resolves.toEqual(
        ok({ type: 'needs-pin', reason: 'off' }),
      );
      await expect(app.unlock.tryPin(PIN)).resolves.toEqual(ok({ type: 'unlocked' }));

      await expect(app.tokenStore.read()).resolves.toEqual({ access: '', refresh: 'refresh-0' });
      expect(osPrompts()).toBe(0);
    });

    it('opens the current token with biometrics added after a rotation', async () => {
      await pinOnlyThenKilled();
      const first = launch();
      await first.unlock.tryPin(PIN);
      await first.refresh.refresh();
      await expect(first.biometricSignIn.enable(PIN)).resolves.toEqual(ok({ type: 'enabled' }));

      const next = launch();
      await expect(next.unlock.tryBiometric()).resolves.toEqual(ok({ type: 'unlocked' }));

      await expect(next.tokenStore.read()).resolves.toEqual({ access: '', refresh: 'refresh-1' });
      expect(osPrompts()).toBe(1);
    });

    it('keeps persisting when adding biometrics is dismissed', async () => {
      await pinOnlyThenKilled();
      const app = launch('cancelled');
      await app.unlock.tryPin(PIN);

      await expect(app.biometricSignIn.enable(PIN)).resolves.toEqual(
        ok({ type: 'not-enabled', reason: 'cancelled' }),
      );

      await expect(launch().appLock.isLockRequired()).resolves.toBe(true);
    });
  });

  describe('turning biometrics off', () => {
    it('leaves the PIN rung working and the session persisting', async () => {
      await enabledThenKilled();
      const app = launch();
      await app.unlock.tryPin(PIN);

      await expect(app.biometricSignIn.disable()).resolves.toEqual(ok({ type: 'disabled' }));

      const next = launch();
      await expect(next.appLock.isLockRequired()).resolves.toBe(true);
      await expect(next.unlock.tryPin(PIN)).resolves.toEqual(ok({ type: 'unlocked' }));
      await expect(secureStorage.get(SecureKey.SessionKeyBiometric)).resolves.toEqual(
        ok(undefined),
      );
    });
  });

  describe('an install from before PIN sign-in', () => {
    async function legacyThenKilled() {
      await enabledThenKilled();
      await secureStorage.remove(SecureKey.PinSigninEnabled);
    }

    it('unlocks with either rung', async () => {
      await legacyThenKilled();

      await expect(launch().unlock.tryBiometric()).resolves.toEqual(ok({ type: 'unlocked' }));
      await expect(launch().unlock.tryPin(PIN)).resolves.toEqual(ok({ type: 'unlocked' }));
    });

    it('keeps persisting after biometrics are turned off', async () => {
      await legacyThenKilled();
      const app = launch();
      await app.unlock.tryPin(PIN);

      await app.biometricSignIn.disable();

      await expect(launch().appLock.isLockRequired()).resolves.toBe(true);
    });
  });

  describe('turning PIN sign-in off', () => {
    it('leaves no sealed artefact behind, and both flags off', async () => {
      await enabledThenKilled();
      const app = launch();
      await app.unlock.tryPin(PIN);

      await expect(app.pinSignIn.disable({ pin: PIN })).resolves.toEqual(ok({ type: 'disabled' }));

      const flags: string[] = [SecureKey.PinSigninEnabled, SecureKey.BiometricSigninEnabled];
      for (const key of Object.values(SecureKey)) {
        await expect(secureStorage.get(key)).resolves.toEqual(
          ok(flags.includes(key) ? 'false' : undefined),
        );
      }
      await expect(launch().appLock.isLockRequired()).resolves.toBe(false);
    });
  });
});
