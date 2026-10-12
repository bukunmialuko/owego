import { z } from 'zod';
import { APP_URL_SCHEME } from '@/core/config/app-url-scheme';

const pushMessageModelSchema = z.object({
  notification: z.object({
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
  }),
  data: z
    .object({
      deepLink: z.string().startsWith(APP_URL_SCHEME).optional().catch(undefined),
    })
    .optional(),
});

export type PushMessageModel = z.infer<typeof pushMessageModelSchema>;

export function parsePushMessage(input: unknown): PushMessageModel | undefined {
  const parsed = pushMessageModelSchema.safeParse(input);

  return parsed.success ? parsed.data : undefined;
}
