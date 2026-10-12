import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
  type Messaging,
} from '@react-native-firebase/messaging';
import { PermissionsAndroid, Platform } from 'react-native';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type {
  PushMessage,
  PushMessagingPort,
  PushPermissionStatus,
} from '../../domain/port/push-messaging-port';
import { toPushMessage } from '../mapper/push-message-mapper';
import { parsePushMessage } from '../model/push-message-model';

export function createFirebaseMessagingAdapter(): PushMessagingPort {
  let instance: Messaging | undefined;
  const messaging = () => (instance ??= getMessaging());

  async function readPermission(): Promise<PushPermissionStatus> {
    try {
      const status = await hasPermission(messaging());

      if (status === AuthorizationStatus.AUTHORIZED) return 'granted';
      if (status === AuthorizationStatus.PROVISIONAL) return 'granted';

      if (Platform.OS === 'android') return asksAtRuntime() ? 'not-determined' : 'blocked';

      if (status === AuthorizationStatus.DENIED) return 'blocked';

      return 'not-determined';
    } catch {
      return 'not-determined';
    }
  }

  return {
    getPermissionStatus: readPermission,

    async requestPermission(): Promise<PushPermissionStatus> {
      if (Platform.OS === 'android') {
        if (!asksAtRuntime()) return readPermission();

        return requestPostNotifications();
      }

      try {
        const status = await requestPermission(messaging());

        if (status === AuthorizationStatus.AUTHORIZED) return 'granted';
        if (status === AuthorizationStatus.PROVISIONAL) return 'granted';
        if (status === AuthorizationStatus.DENIED) return 'blocked';

        return 'denied';
      } catch {
        return 'denied';
      }
    },

    async getToken(): Promise<Result<string, AppError>> {
      try {
        return ok(await getToken(messaging()));
      } catch (cause) {
        return err(unknownError('FCM token could not be fetched.', cause));
      }
    },

    onTokenRefresh(listener) {
      return onTokenRefresh(messaging(), listener);
    },

    onForegroundMessage(listener) {
      return onMessage(messaging(), (remote) => {
        const message = toDisplayable(remote);
        if (message !== undefined) listener(message);
      });
    },

    async getInitialMessage() {
      try {
        const remote = await getInitialNotification(messaging());

        return remote === null ? undefined : toDisplayable(remote);
      } catch {
        return undefined;
      }
    },

    onNotificationOpened(listener) {
      return onNotificationOpenedApp(messaging(), (remote) => {
        const message = toDisplayable(remote);
        if (message !== undefined) listener(message);
      });
    },
  };
}

const POST_NOTIFICATIONS_API_LEVEL = 33;

function asksAtRuntime(): boolean {
  return Platform.OS === 'android' && Number(Platform.Version) >= POST_NOTIFICATIONS_API_LEVEL;
}

async function requestPostNotifications(): Promise<PushPermissionStatus> {
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    switch (result) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'never_ask_again':
        return 'blocked';
    }
  } catch {
    return 'denied';
  }
}

function toDisplayable(remote: unknown): PushMessage | undefined {
  const model = parsePushMessage(remote);

  return model === undefined ? undefined : toPushMessage(model);
}

export function registerBackgroundMessageHandler(): void {
  setBackgroundMessageHandler(getMessaging(), () => Promise.resolve());
}
