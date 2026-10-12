import { z } from 'zod';
import { text } from './wire-text';

const bankSchema = z.object({
  bank_code: text,
  bank_name: text,
});

export type BankDto = z.infer<typeof bankSchema>;

export const bankListResponseSchema = z.object({
  data: z
    .array(bankSchema)
    .nullable()
    .default([])
    .transform((banks) => banks ?? []),
});
