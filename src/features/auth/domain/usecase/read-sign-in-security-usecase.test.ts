import { ok } from '@/core/result/result';
import type { BiometricAvailability, BiometricPort } from '../port/auth-port';
import type { SignInSettings } from '../repository/auth-repository';
import { createReadSignInSecurityUseCase } from './read-sign-in-security-usecase';

function build(settings: SignInSettings, device: BiometricAvailability) {
  const authenticate = jest.fn(() => Promise.resolve(ok('succeeded' as const)));
  const biometrics: BiometricPort = { availability: () => Promise.resolve(device), authenticate };

  const usecase = createReadSignInSecurityUseCase({
    settings: { read: () => Promise.resolve(settings) },
    biometrics,
  });

  return { usecase, authenticate };
}

describe('ReadSignInSecurityUseCase', () => {
  it('reports what is on and what this device can do', async () => {
    const { usecase } = build(
      { pin: true, biometrics: false },
      { type: 'available', kind: 'face-id' },
    );

    await expect(usecase.execute()).resolves.toEqual({
      pin: true,
      biometrics: false,
      device: { type: 'available', kind: 'face-id' },
    });
  });

  it('asks the sensor without showing a prompt', async () => {
    const { usecase, authenticate } = build(
      { pin: false, biometrics: false },
      { type: 'not-enrolled' },
    );

    await expect(usecase.execute()).resolves.toMatchObject({ device: { type: 'not-enrolled' } });
    expect(authenticate).not.toHaveBeenCalled();
  });
});
