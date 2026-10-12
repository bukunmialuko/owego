import { z } from 'zod';
import { fromZodError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { NotificationSettings } from '../../domain/repository/notification-settings-repository';

const SERVER_DEFAULT = { email: true, in_app: false } as const;

const notificationSettingsSchema = z.object({
  email: z.boolean().default(SERVER_DEFAULT.email),
  in_app: z.boolean().default(SERVER_DEFAULT.in_app),
});

const envelopeSchema = z.object({ data: z.unknown() });

function unwrapEnvelope(payload: unknown): unknown {
  const envelope = envelopeSchema.safeParse(payload);

  return envelope.success && envelope.data.data !== undefined ? envelope.data.data : payload;
}

export function parseNotificationSettings(
  payload: unknown,
): Result<NotificationSettings, AppError> {
  const parsed = notificationSettingsSchema.safeParse(unwrapEnvelope(payload));
  if (!parsed.success) return err(fromZodError(parsed.error));

  return ok({
    emailEnabled: parsed.data.email,
    inAppEnabled: parsed.data.in_app,
  });
}

export function toUpdateBody(settings: NotificationSettings) {
  return {
    email: settings.emailEnabled,
    in_app: settings.inAppEnabled,
  };
}
