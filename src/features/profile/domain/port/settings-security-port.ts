import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type SettingsPinProblem = 'wrong-length' | 'not-numeric' | 'repeated' | 'consecutive';

export type SettingsBiometricKind = 'face-id' | 'touch-id' | 'biometrics';

export type SettingsBiometricDevice =
  | { type: 'available'; kind: SettingsBiometricKind }
  | { type: 'unavailable' }
  | { type: 'not-enrolled' };

export type SettingsSecurity = {
  pin: boolean;
  biometrics: boolean;
  device: SettingsBiometricDevice;
};

type EnablePinOutcome = { type: 'enabled' } | { type: 'rejected'; problem: SettingsPinProblem };

type DisablePinOutcome = { type: 'disabled' } | { type: 'challenge-failed' };

type EnableBiometricsOutcome =
  | { type: 'enabled' }
  | { type: 'wrong-pin' }
  | { type: 'pin-sign-in-off' }
  | { type: 'not-enabled'; reason: 'cancelled' | 'unavailable' | 'not-enrolled' | 'invalidated' };

export interface SettingsSecurityPort {
  read(): Promise<SettingsSecurity>;
  enablePin(pin: string): Promise<Result<EnablePinOutcome, AppError>>;
  disablePin(challenge: { pin?: string }): Promise<Result<DisablePinOutcome, AppError>>;
  enableBiometrics(pin: string): Promise<Result<EnableBiometricsOutcome, AppError>>;
  disableBiometrics(): Promise<Result<{ type: 'disabled' }, AppError>>;
}
