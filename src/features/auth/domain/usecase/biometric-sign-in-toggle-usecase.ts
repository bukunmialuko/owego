import type { AppError } from '@/core/errors/app-error';
import { ok, type Result } from '@/core/result/result';
import type { BiometricOutcome, BiometricPort, SessionVault } from '../port/auth-port';
import type { SignInSettingsRepository } from '../repository/auth-repository';

type EnableOutcome =
  | { type: 'enabled' }
  | { type: 'wrong-pin' }
  | { type: 'pin-sign-in-off' }
  | { type: 'not-enabled'; reason: Exclude<BiometricOutcome, 'succeeded'> };

type DisableOutcome = { type: 'disabled' };

type Dependencies = {
  biometrics: Pick<BiometricPort, 'authenticate'>;
  settings: SignInSettingsRepository;
  vault: Pick<SessionVault, 'addBiometricCopy' | 'removeBiometricCopy'>;
};

export interface BiometricSignInToggleUseCase {
  enable(pin: string): Promise<Result<EnableOutcome, AppError>>;
  disable(): Promise<Result<DisableOutcome, AppError>>;
}

export function createBiometricSignInToggleUseCase({
  biometrics,
  settings,
  vault,
}: Dependencies): BiometricSignInToggleUseCase {
  return {
    async enable(pin) {
      if (!(await settings.read()).pin) return ok({ type: 'pin-sign-in-off' });

      const added = await vault.addBiometricCopy(pin, () => biometrics.authenticate());
      if (!added.ok) return added;

      switch (added.value.type) {
        case 'wrong-pin':
          return ok({ type: 'wrong-pin' });
        case 'empty':
          return ok({ type: 'pin-sign-in-off' });
        case 'not-proven':
          return ok({ type: 'not-enabled', reason: added.value.outcome });
        case 'added':
          break;
      }

      const flagged = await settings.setBiometricsEnabled(true);
      if (!flagged.ok) {
        await vault.removeBiometricCopy();
        return flagged;
      }

      return ok({ type: 'enabled' });
    },

    async disable() {
      if (!(await settings.read()).biometrics) return ok({ type: 'disabled' });

      const pinOn = await settings.setPinEnabled(true);
      if (!pinOn.ok) return pinOn;

      const removed = await vault.removeBiometricCopy();
      if (!removed.ok) return removed;

      const biometricsOff = await settings.setBiometricsEnabled(false);

      return biometricsOff.ok ? ok({ type: 'disabled' }) : biometricsOff;
    },
  };
}
