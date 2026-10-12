import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type NotificationSettings = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
};

export interface NotificationSettingsRepository {
  read(): Promise<Result<NotificationSettings, AppError>>;
  update(settings: NotificationSettings): Promise<Result<void, AppError>>;
}
