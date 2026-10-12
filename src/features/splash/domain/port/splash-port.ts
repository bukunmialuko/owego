import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type SplashProfile = {
  id: string;
  email: string;
  kycState: string;
  firstName: string;
  country: string;
};

export interface ProfilePort {
  loadProfile(): Promise<Result<SplashProfile, AppError>>;
  cachedProfile(): Result<SplashProfile | undefined, AppError>;
}

export interface WalletsPort {
  countWallets(): Promise<Result<number, AppError>>;
  cachedWalletCount(): number | undefined;
}

export interface AppLockPort {
  sessionPersists(): Promise<boolean>;
  isLockRequired(): Promise<boolean>;
}

export interface PushRegistrationPort {
  registerIfNeeded(): Promise<void>;
}
