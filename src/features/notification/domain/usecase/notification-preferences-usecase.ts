import type { AppError } from '@/core/errors/app-error';
import { map, ok, type Result } from '@/core/result/result';
import type { PushMessagingPort, PushPermissionStatus } from '../port/push-messaging-port';
import type {
  NotificationSettings,
  NotificationSettingsRepository,
} from '../repository/notification-settings-repository';

type Dependencies = {
  notificationSettingsRepository: NotificationSettingsRepository;
  messaging: Pick<PushMessagingPort, 'getPermissionStatus' | 'requestPermission'>;
};

type PreferenceOutcome =
  { type: 'saved' } | { type: 'needs-permission' } | { type: 'blocked-in-settings' };

export interface NotificationPreferencesUseCase {
  read(): Promise<Result<NotificationSettings, AppError>>;
  readPermission(): Promise<PushPermissionStatus>;
  setEmail(enabled: boolean): Promise<Result<PreferenceOutcome, AppError>>;
  setInApp(enabled: boolean): Promise<Result<PreferenceOutcome, AppError>>;
}

export function createNotificationPreferencesUseCase({
  notificationSettingsRepository,
  messaging,
}: Dependencies): NotificationPreferencesUseCase {
  async function save(
    change: Partial<NotificationSettings>,
  ): Promise<Result<PreferenceOutcome, AppError>> {
    const current = await notificationSettingsRepository.read();
    if (!current.ok) return current;

    const next = { ...current.value, ...change };
    if (
      next.emailEnabled === current.value.emailEnabled &&
      next.inAppEnabled === current.value.inAppEnabled
    ) {
      return ok({ type: 'saved' });
    }

    return map(await notificationSettingsRepository.update(next), () => ({
      type: 'saved' as const,
    }));
  }

  async function devicePermission(): Promise<PushPermissionStatus> {
    const status = await messaging.getPermissionStatus();

    if (status === 'granted' || status === 'blocked') return status;

    return messaging.requestPermission();
  }

  return {
    async read() {
      const [settings, permission] = await Promise.all([
        notificationSettingsRepository.read(),
        messaging.getPermissionStatus(),
      ]);

      return map(settings, (value) => ({
        emailEnabled: value.emailEnabled,
        inAppEnabled: value.inAppEnabled && permission === 'granted',
      }));
    },

    readPermission: () => messaging.getPermissionStatus(),

    setEmail(enabled) {
      return save({ emailEnabled: enabled });
    },

    async setInApp(enabled) {
      if (!enabled) return save({ inAppEnabled: false });

      const permission = await devicePermission();

      switch (permission) {
        case 'granted':
          return save({ inAppEnabled: true });
        case 'blocked':
          return ok({ type: 'blocked-in-settings' });
        case 'denied':
        case 'not-determined':
          return ok({ type: 'needs-permission' });
      }
    },
  };
}
