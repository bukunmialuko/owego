import type { NotificationSettingsRemoteDataSource } from '../datasource/notification-settings-remote-datasource';
import type { NotificationSettingsRepository } from '../../domain/repository/notification-settings-repository';

export function createNotificationSettingsRepositoryImpl(
  remoteDataSource: NotificationSettingsRemoteDataSource,
): NotificationSettingsRepository {
  return {
    read: () => remoteDataSource.read(),
    update: (settings) => remoteDataSource.update(settings),
  };
}
