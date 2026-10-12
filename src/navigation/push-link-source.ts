import type { AppCradle } from '@/core/di/container';
import type { ExternalLinkSource } from './linking';

export function createPushLinkSource(
  messaging: AppCradle['pushMessagingPort'],
): ExternalLinkSource {
  return {
    async getInitialURL() {
      return (await messaging.getInitialMessage())?.deepLink;
    },

    subscribe(listener) {
      return messaging.onNotificationOpened((message) => {
        if (message.deepLink !== undefined) listener(message.deepLink);
      });
    },
  };
}
