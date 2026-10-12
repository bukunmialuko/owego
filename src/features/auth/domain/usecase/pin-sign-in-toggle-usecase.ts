import { unknownError, type AppError } from '@/core/errors/app-error';
import type { TokenStore } from '@/core/network/auth-tokens';
import { err, ok, type Result } from '@/core/result/result';
import type { SessionVault, UnlockAttemptStore } from '../port/auth-port';
import type { PinRepository, SignInSettingsRepository } from '../repository/auth-repository';
import { checkPinStrength, type PinProblem } from './pin-strength';

type EnableOutcome = { type: 'enabled' } | { type: 'rejected'; problem: PinProblem };

type DisableOutcome = { type: 'disabled' } | { type: 'challenge-failed' };

type Dependencies = {
  pinRepository: PinRepository;
  settings: SignInSettingsRepository;
  attempts: UnlockAttemptStore;
  tokenStore: TokenStore;
  vault: Pick<SessionVault, 'seal' | 'clear' | 'openWithBiometrics'>;
};

export interface PinSignInToggleUseCase {
  enable(pin: string): Promise<Result<EnableOutcome, AppError>>;
  disable(challenge: { pin?: string }): Promise<Result<DisableOutcome, AppError>>;
}

export function createPinSignInToggleUseCase({
  pinRepository,
  settings,
  attempts,
  tokenStore,
  vault,
}: Dependencies): PinSignInToggleUseCase {
  async function undo<T>(failure: Result<T, AppError>): Promise<Result<T, AppError>> {
    await vault.clear();
    await pinRepository.clearPin();

    return failure;
  }

  async function prove(challenge: { pin?: string }): Promise<Result<boolean, AppError>> {
    if (challenge.pin !== undefined) return pinRepository.verifyPin(challenge.pin);
    if (!(await settings.read()).biometrics) return ok(false);

    const opened = await vault.openWithBiometrics();

    return opened.ok ? ok(opened.value.type === 'opened') : opened;
  }

  return {
    async enable(pin) {
      const problem = checkPinStrength(pin);
      if (problem !== undefined) return ok({ type: 'rejected', problem });

      const tokens = await tokenStore.read();
      if (tokens === undefined) return err(unknownError('No session to persist.'));

      if ((await settings.read()).biometrics) {
        const biometricsOff = await settings.setBiometricsEnabled(false);
        if (!biometricsOff.ok) return biometricsOff;
      }

      const sealed = await vault.seal(tokens.refresh, pin);
      if (!sealed.ok) return sealed;

      const savedPin = await pinRepository.setPin(pin);
      if (!savedPin.ok) return undo(savedPin);

      const flagged = await settings.setPinEnabled(true);
      if (!flagged.ok) return undo(flagged);

      return ok({ type: 'enabled' });
    },

    async disable(challenge) {
      const proven = await prove(challenge);
      if (!proven.ok) return proven;
      if (!proven.value) return ok({ type: 'challenge-failed' });

      const cleared = await vault.clear();
      if (!cleared.ok) return cleared;

      const clearedPin = await pinRepository.clearPin();
      if (!clearedPin.ok) return clearedPin;

      await attempts.reset();

      const biometricsOff = await settings.setBiometricsEnabled(false);
      if (!biometricsOff.ok) return biometricsOff;

      const pinOff = await settings.setPinEnabled(false);

      return pinOff.ok ? ok({ type: 'disabled' }) : pinOff;
    },
  };
}
