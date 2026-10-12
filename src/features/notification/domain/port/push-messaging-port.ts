import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type PushMessage = {
  title: string;
  body: string;
  deepLink?: string;
};

export type PushPermissionStatus = 'granted' | 'not-determined' | 'denied' | 'blocked';

export interface PushMessagingPort {
  getPermissionStatus(): Promise<PushPermissionStatus>;
  requestPermission(): Promise<PushPermissionStatus>;
  getToken(): Promise<Result<string, AppError>>;
  onTokenRefresh(listener: (token: string) => void): () => void;
  onForegroundMessage(listener: (message: PushMessage) => void): () => void;
  getInitialMessage(): Promise<PushMessage | undefined>;
  onNotificationOpened(listener: (message: PushMessage) => void): () => void;
}
