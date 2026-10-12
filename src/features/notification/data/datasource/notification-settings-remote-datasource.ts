import type { AppError } from '@/core/errors/app-error';
import type { HttpClient } from '@/core/network/http-client';
import { andThen, map, type Result } from '@/core/result/result';
import { parseNotificationSettings, toUpdateBody } from '../model/notification-settings-model';
import type { NotificationSettings } from '../../domain/repository/notification-settings-repository';

const NOTIFICATION_PREFERENCE_PATH = '/user/notification-preference';

export interface NotificationSettingsRemoteDataSource {
  read(): Promise<Result<NotificationSettings, AppError>>;
  update(settings: NotificationSettings): Promise<Result<void, AppError>>;
}

export function createNotificationSettingsRemoteDataSource(
  apiClient: HttpClient,
): NotificationSettingsRemoteDataSource {
  return {
    async read() {
      return andThen(
        await apiClient.get<unknown>(NOTIFICATION_PREFERENCE_PATH),
        parseNotificationSettings,
      );
    },

    async update(settings) {
      return map(
        await apiClient.put<unknown>(NOTIFICATION_PREFERENCE_PATH, toUpdateBody(settings)),
        () => undefined,
      );
    },
  };
}
