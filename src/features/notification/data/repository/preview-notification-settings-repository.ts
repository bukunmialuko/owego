import { ok } from '@/core/result/result';
import type {
  NotificationSettings,
  NotificationSettingsRepository,
} from '../../domain/repository/notification-settings-repository';

export function createPreviewNotificationSettingsRepository(): NotificationSettingsRepository {
  let settings: NotificationSettings = { emailEnabled: true, inAppEnabled: false };

  return {
    read: () => Promise.resolve(ok(settings)),
    update: (next) => {
      settings = next;

      return Promise.resolve(ok(undefined));
    },
  };
}
