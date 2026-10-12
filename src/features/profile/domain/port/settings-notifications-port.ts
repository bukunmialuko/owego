import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type SettingsPermissionStatus = 'granted' | 'not-determined' | 'denied' | 'blocked';

export type SettingsNotificationPreferences = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

type SettingsPreferenceOutcome =
  { type: 'saved' } | { type: 'needs-permission' } | { type: 'blocked-in-settings' };

export interface SettingsNotificationsPort {
  read(): Promise<Result<SettingsNotificationPreferences, AppError>>;
  readPermission(): Promise<SettingsPermissionStatus>;
  setEmail(enabled: boolean): Promise<Result<SettingsPreferenceOutcome, AppError>>;
  setInApp(enabled: boolean): Promise<Result<SettingsPreferenceOutcome, AppError>>;
}
