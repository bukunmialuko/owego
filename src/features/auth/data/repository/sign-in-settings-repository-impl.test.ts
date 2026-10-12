import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import { SecureKey } from '@/core/storage/storage-keys';
import { createSignInSettingsRepositoryImpl } from './sign-in-settings-repository-impl';

const keychain: { getGenericPassword: jest.Mock } = jest.requireMock('react-native-keychain');

describe('SignInSettingsRepository', () => {
  const secureStorage = createSecureStorage();
  const repository = createSignInSettingsRepositoryImpl(secureStorage);

  beforeEach(async () => {
    await secureStorage.remove(SecureKey.PinSigninEnabled);
    await secureStorage.remove(SecureKey.BiometricSigninEnabled);
  });

  it('reads both off on a fresh install', async () => {
    await expect(repository.read()).resolves.toEqual({ pin: false, biometrics: false });
  });

  it('round-trips PIN sign-in on its own', async () => {
    await repository.setPinEnabled(true);
    await expect(repository.read()).resolves.toEqual({ pin: true, biometrics: false });

    await repository.setPinEnabled(false);
    await expect(repository.read()).resolves.toEqual({ pin: false, biometrics: false });
  });

  it('round-trips biometrics on top of PIN sign-in', async () => {
    await repository.setPinEnabled(true);
    await repository.setBiometricsEnabled(true);
    await expect(repository.read()).resolves.toEqual({ pin: true, biometrics: true });

    await repository.setBiometricsEnabled(false);
    await expect(repository.read()).resolves.toEqual({ pin: true, biometrics: false });
  });

  it('reads an install holding only the biometric flag as PIN sign-in on', async () => {
    await secureStorage.set(SecureKey.BiometricSigninEnabled, 'true');

    await expect(repository.read()).resolves.toEqual({ pin: true, biometrics: true });
  });

  it('reads an unrecognised stored value as off', async () => {
    await secureStorage.set(SecureKey.PinSigninEnabled, 'yes');
    await secureStorage.set(SecureKey.BiometricSigninEnabled, '1');

    await expect(repository.read()).resolves.toEqual({ pin: false, biometrics: false });
  });

  it('reads a refused keychain read as off', async () => {
    await repository.setPinEnabled(true);
    await repository.setBiometricsEnabled(true);
    const refuse = () => Promise.reject(new Error('locked'));
    keychain.getGenericPassword.mockImplementationOnce(refuse).mockImplementationOnce(refuse);

    await expect(repository.read()).resolves.toEqual({ pin: false, biometrics: false });
  });
});
