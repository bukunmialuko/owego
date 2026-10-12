import { z } from 'zod';

const capturedAccountSchema = z.object({
  account_number: z.string().default(''),
  bank_name: z.string().default(''),
  bank_code: z.string().default(''),
  account_name: z.string().default(''),
  is_verified: z.boolean().default(false),
});

export type CapturedAccountDto = z.infer<typeof capturedAccountSchema>;

const EMPTY: CapturedAccountDto = {
  account_number: '',
  bank_name: '',
  bank_code: '',
  account_name: '',
  is_verified: false,
};

export const capturedAccountResponseSchema = z.object({
  data: capturedAccountSchema
    .nullable()
    .default(EMPTY)
    .transform((account) => account ?? EMPTY),
});
