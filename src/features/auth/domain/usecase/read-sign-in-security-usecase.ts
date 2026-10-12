import type { BiometricAvailability, BiometricPort } from '../port/auth-port';
import type { SignInSettings, SignInSettingsRepository } from '../repository/auth-repository';

type SignInSecurity = SignInSettings & { device: BiometricAvailability };

type Dependencies = {
  settings: Pick<SignInSettingsRepository, 'read'>;
  biometrics: Pick<BiometricPort, 'availability'>;
};

export interface ReadSignInSecurityUseCase {
  execute(): Promise<SignInSecurity>;
}

export function createReadSignInSecurityUseCase({
  settings,
  biometrics,
}: Dependencies): ReadSignInSecurityUseCase {
  return {
    async execute() {
      const [current, device] = await Promise.all([settings.read(), biometrics.availability()]);

      return { ...current, device };
    },
  };
}
