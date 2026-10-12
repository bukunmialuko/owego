import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type SettingsProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  kycState: string;
  pictureUrl: string;
};

export interface SettingsProfilePort {
  loadSettingsProfile(): Promise<Result<SettingsProfile, AppError>>;
}
