import { z } from 'zod';

const qrPayFeeSchema = z.object({
  total_fee: z.number().default(0),
});

const qrPaySchema = z.object({
  currency: z.string().default(''),
  amount_local: z.number().default(0),
  amount_usdc: z.number().default(0),
  base_amount_usdc: z.number().default(0),
  fee: qrPayFeeSchema.default({ total_fee: 0 }),
  rate: z.number().default(0),
  challenge_id: z.string().default(''),
  user_token: z.string().default(''),
  encryption_key: z.string().default(''),
});

export type QrPayDto = z.infer<typeof qrPaySchema>;

export const qrPayResponseSchema = z.object({
  data: qrPaySchema.default({
    currency: '',
    amount_local: 0,
    amount_usdc: 0,
    base_amount_usdc: 0,
    fee: { total_fee: 0 },
    rate: 0,
    challenge_id: '',
    user_token: '',
    encryption_key: '',
  }),
});
