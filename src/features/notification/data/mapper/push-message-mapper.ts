import type { PushMessage } from '../../domain/port/push-messaging-port';
import type { PushMessageModel } from '../model/push-message-model';

export function toPushMessage(model: PushMessageModel): PushMessage {
  const deepLink = model.data?.deepLink;

  return {
    title: model.notification.title,
    body: model.notification.body,
    ...(deepLink === undefined ? {} : { deepLink }),
  };
}
