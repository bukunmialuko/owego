import type { AppError } from '@/core/errors/app-error';
import type { TokenStore } from '@/core/network/auth-tokens';
import type { Result } from '@/core/result/result';
import { ok } from '@/core/result/result';
import type { PinRepository, SignInSettingsRepository } from '../repository/auth-repository';
import type { BiometricPort, SessionVault, UnlockAttemptStore } from '../port/auth-port';
import type { BiometricSignInToggleUseCase } from './biometric-sign-in-toggle-usecase';

export const MAX_UNLOCK_ATTEMPTS = 3;

export type UnlockOutcome =
  | { type: 'unlocked' }
  | {
      type: 'needs-pin';
      reason: 'off' | 'unavailable' | 'not-enrolled' | 'cancelled' | 'invalidated';
    }
  | { type: 'wrong-pin'; attemptsLeft: number }
  | { type: 'signed-out' };

type Dependencies = {
  biometrics: Pick<BiometricPort, 'availability'>;
  settings: Pick<SignInSettingsRepository, 'read'>;
  biometricSignIn: Pick<BiometricSignInToggleUseCase, 'disable'>;
  vault: Pick<SessionVault, 'openWithBiometrics' | 'openWithPin'>;
  tokenStore: Pick<TokenStore, 'restore'>;
  pinRepository: Pick<PinRepository, 'clearPin'>;
  attempts: UnlockAttemptStore;
};

export interface UnlockUseCase {
  offersBiometrics(): Promise<boolean>;
  tryBiometric(): Promise<Result<UnlockOutcome, AppError>>;
  tryPin(pin: string): Promise<Result<UnlockOutcome, AppError>>;
  abandon(): Promise<Result<UnlockOutcome, AppError>>;
  attemptsLeft(): Promise<number>;
}

export function createUnlockUseCase({
  biometrics,
  settings,
  biometricSignIn,
  vault,
  tokenStore,
  pinRepository,
  attempts,
}: Dependencies): UnlockUseCase {
  async function attemptsLeft(): Promise<number> {
    return Math.max(0, MAX_UNLOCK_ATTEMPTS - (await attempts.read()));
  }

  async function wipe(): Promise<Result<UnlockOutcome, AppError>> {
    await pinRepository.clearPin();
    await attempts.reset();

    return ok({ type: 'signed-out' });
  }

  async function unlockWith(refreshToken: string): Promise<Result<UnlockOutcome, AppError>> {
    tokenStore.restore(refreshToken);
    await attempts.reset();

    return ok({ type: 'unlocked' });
  }

  async function offersBiometrics(): Promise<boolean> {
    return (await settings.read()).biometrics;
  }

  return {
    attemptsLeft,
    offersBiometrics,

    async tryBiometric() {
      if (!(await offersBiometrics())) return ok({ type: 'needs-pin', reason: 'off' });

      const availability = await biometrics.availability();
      if (availability.type !== 'available') {
        return ok({ type: 'needs-pin', reason: availability.type });
      }

      const opened = await vault.openWithBiometrics();
      if (!opened.ok) return opened;

      switch (opened.value.type) {
        case 'opened':
          return unlockWith(opened.value.refreshToken);
        case 'cancelled':
          return ok({ type: 'needs-pin', reason: 'cancelled' });
        case 'invalidated':
          await biometricSignIn.disable();
          return ok({ type: 'needs-pin', reason: 'invalidated' });
        case 'empty':
          return wipe();
      }
    },

    async tryPin(pin) {
      const used = await attempts.increment();
      const opened = await vault.openWithPin(pin);
      const isFinalAttempt = used >= MAX_UNLOCK_ATTEMPTS;

      if (!opened.ok) return isFinalAttempt ? wipe() : opened;

      switch (opened.value.type) {
        case 'opened':
          return unlockWith(opened.value.refreshToken);
        case 'wrong-pin':
          return isFinalAttempt
            ? wipe()
            : ok({ type: 'wrong-pin', attemptsLeft: MAX_UNLOCK_ATTEMPTS - used });
        case 'empty':
          return wipe();
      }
    },

    abandon: wipe,
  };
}
