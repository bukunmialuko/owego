import { z } from 'zod';

const transferChallengeSchema = z.object({
  challenge_id: z.string().default(''),
  user_token: z.string().default(''),
  encryption_key: z.string().default(''),
});

export type TransferChallengeDto = z.infer<typeof transferChallengeSchema>;

export const transferChallengeResponseSchema = z.object({
  data: transferChallengeSchema.default({ challenge_id: '', user_token: '', encryption_key: '' }),
});
