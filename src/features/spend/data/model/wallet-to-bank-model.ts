import { z } from 'zod';

const walletToBankSchema = z.object({
  amount_fiat: z.number().default(0),
  amount_usdc: z.number().default(0),
  base_amount_usdc: z.number().default(0),
  rate: z.number().default(0),
  challenge_id: z.string().default(''),
  user_token: z.string().default(''),
  encryption_key: z.string().default(''),
});

export type WalletToBankDto = z.infer<typeof walletToBankSchema>;

export const walletToBankResponseSchema = z.object({
  data: walletToBankSchema.default({
    amount_fiat: 0,
    amount_usdc: 0,
    base_amount_usdc: 0,
    rate: 0,
    challenge_id: '',
    user_token: '',
    encryption_key: '',
  }),
});
