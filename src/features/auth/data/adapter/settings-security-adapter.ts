import type { BiometricSignInToggleUseCase } from '../../domain/usecase/biometric-sign-in-toggle-usecase';
import type { PinSignInToggleUseCase } from '../../domain/usecase/pin-sign-in-toggle-usecase';
import type { ReadSignInSecurityUseCase } from '../../domain/usecase/read-sign-in-security-usecase';

type Dependencies = {
  pinSignIn: PinSignInToggleUseCase;
  biometricSignIn: BiometricSignInToggleUseCase;
  readSecurity: ReadSignInSecurityUseCase;
};

export function createSettingsSecurityAdapter({
  pinSignIn,
  biometricSignIn,
  readSecurity,
}: Dependencies) {
  return {
    read: () => readSecurity.execute(),
    enablePin: (pin: string) => pinSignIn.enable(pin),
    disablePin: (challenge: { pin?: string }) => pinSignIn.disable(challenge),
    enableBiometrics: (pin: string) => biometricSignIn.enable(pin),
    disableBiometrics: () => biometricSignIn.disable(),
  };
}
