import { z } from 'zod';
import { text } from './wire-text';

const resolvedAccountSchema = z.object({
  account_number: text,
  account_name: text,
});

export type ResolvedAccountDto = z.infer<typeof resolvedAccountSchema>;

const BLANK: ResolvedAccountDto = { account_number: '', account_name: '' };

export const resolvedAccountResponseSchema = z.object({
  data: resolvedAccountSchema
    .nullable()
    .default(BLANK)
    .transform((account) => account ?? BLANK),
});
