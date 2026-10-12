import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type { OAuthCredential, Session, UserProfile } from '../entity/auth-entity';

export interface AuthRepository {
  signInWithGoogle(credential: OAuthCredential): Promise<Result<Session, AppError>>;
  signInWithApple(credential: OAuthCredential): Promise<Result<Session, AppError>>;
  signUpWithGoogle(
    credential: OAuthCredential,
    country: string,
  ): Promise<Result<Session, AppError>>;
  signUpWithApple(credential: OAuthCredential, country: string): Promise<Result<Session, AppError>>;
}

export interface ProfileRepository {
  getProfile(): Promise<Result<UserProfile, AppError>>;
  cachedProfile(): UserProfile | undefined;
}

export interface PinRepository {
  setPin(pin: string): Promise<Result<void, AppError>>;
  verifyPin(pin: string): Promise<Result<boolean, AppError>>;
  clearPin(): Promise<Result<void, AppError>>;
  isPinSet(): Promise<Result<boolean, AppError>>;
}

export type SignInSettings = { pin: boolean; biometrics: boolean };

export interface SignInSettingsRepository {
  read(): Promise<SignInSettings>;
  setPinEnabled(enabled: boolean): Promise<Result<void, AppError>>;
  setBiometricsEnabled(enabled: boolean): Promise<Result<void, AppError>>;
}
