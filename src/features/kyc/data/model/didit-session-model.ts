import { z } from 'zod';

export const diditSessionSchema = z.object({
  session_id: z.string().default(''),
  session_token: z.string().default(''),
  url: z.string().default(''),
  status: z.string().default(''),
});

export type DiditSessionDto = z.infer<typeof diditSessionSchema>;
