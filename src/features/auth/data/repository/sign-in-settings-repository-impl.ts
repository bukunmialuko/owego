import type { SecureStorage } from '@/core/storage/secure-storage';
import { SecureKey } from '@/core/storage/storage-keys';
import type { SignInSettingsRepository } from '../../domain/repository/auth-repository';

export function createSignInSettingsRepositoryImpl(
  secureStorage: SecureStorage,
): SignInSettingsRepository {
  async function isOn(key: SecureKey): Promise<boolean> {
    const stored = await secureStorage.get(key);

    return stored.ok && stored.value === 'true';
  }

  return {
    async read() {
      const [pin, biometrics] = await Promise.all([
        isOn(SecureKey.PinSigninEnabled),
        isOn(SecureKey.BiometricSigninEnabled),
      ]);

      return { pin: pin || biometrics, biometrics };
    },

    setPinEnabled(enabled) {
      return secureStorage.set(SecureKey.PinSigninEnabled, String(enabled));
    },

    setBiometricsEnabled(enabled) {
      return secureStorage.set(SecureKey.BiometricSigninEnabled, String(enabled));
    },
  };
}
