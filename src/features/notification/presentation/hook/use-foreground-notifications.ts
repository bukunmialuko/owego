import { useEffect, useState } from 'react';
import { useResolve } from '@/core/di/container-provider';
import type { PushMessage } from '../../domain/port/push-messaging-port';

const DISMISS_AFTER_MS = 5_000;

export function useForegroundNotifications() {
  const messaging = useResolve('pushMessagingPort');
  const [message, setMessage] = useState<PushMessage | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = messaging.onForegroundMessage(setMessage);

    return unsubscribe;
  }, [messaging]);

  useEffect(() => {
    if (message === undefined) return;

    const timer = setTimeout(() => {
      setMessage(undefined);
    }, DISMISS_AFTER_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [message]);

  return {
    message,
    dismiss: () => {
      setMessage(undefined);
    },
  };
}
