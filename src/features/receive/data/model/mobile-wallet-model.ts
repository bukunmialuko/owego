import { z } from 'zod';

export const authorizationResultSchema = z.object({
  accounts: z.array(z.object({ address: z.string().min(1) })).min(1),
  auth_token: z.string().min(1),
});

export const signAndSendResultSchema = z.object({ signatures: z.array(z.string()) });

export const walletErrorSchema = z.object({ code: z.union([z.string(), z.number()]) });

export type WalletErrorCode = z.infer<typeof walletErrorSchema>['code'];
