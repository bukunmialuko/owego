import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { OAuthCredential } from '../entity/auth-entity';

export interface OAuthAuthenticator {
  authenticate(): Promise<Result<OAuthCredential, AppError>>;
}

export interface WalletProvisioningPort {
  hasProvisionedWallet(): Promise<Result<boolean, AppError>>;
}

export type BiometricOutcome =
  'succeeded' | 'unavailable' | 'not-enrolled' | 'cancelled' | 'invalidated';

export interface BiometricPort {
  authenticate(): Promise<Result<BiometricOutcome, AppError>>;
  availability(): Promise<BiometricAvailability>;
}

export type BiometricKind = 'face-id' | 'touch-id' | 'biometrics';

export type BiometricAvailability =
  { type: 'available'; kind: BiometricKind } | { type: 'unavailable' } | { type: 'not-enrolled' };

export type VaultBiometricOutcome =
  | { type: 'opened'; refreshToken: string }
  | { type: 'cancelled' }
  | { type: 'invalidated' }
  | { type: 'empty' };

export type VaultBiometricCopyOutcome =
  | { type: 'added' }
  | { type: 'wrong-pin' }
  | { type: 'not-proven'; outcome: Exclude<BiometricOutcome, 'succeeded'> }
  | { type: 'empty' };

export type VaultPinOutcome =
  { type: 'opened'; refreshToken: string } | { type: 'wrong-pin' } | { type: 'empty' };

export interface SessionVault {
  seal(refreshToken: string, pin: string): Promise<Result<void, AppError>>;
  addBiometricCopy(
    pin: string,
    prove: () => Promise<Result<BiometricOutcome, AppError>>,
  ): Promise<Result<VaultBiometricCopyOutcome, AppError>>;
  removeBiometricCopy(): Promise<Result<void, AppError>>;
  openWithBiometrics(): Promise<Result<VaultBiometricOutcome, AppError>>;
  openWithPin(pin: string): Promise<Result<VaultPinOutcome, AppError>>;
  reseal(refreshToken: string): Promise<Result<void, AppError>>;
  clear(): Promise<Result<void, AppError>>;
}

export interface UnlockAttemptStore {
  increment(): Promise<number>;
  read(): Promise<number>;
  reset(): Promise<void>;
}
