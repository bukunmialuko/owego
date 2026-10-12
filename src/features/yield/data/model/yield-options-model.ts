import { z } from 'zod';
import { wireList, wireOptionalNumber, wireText } from '@/core/network/wire-schema';

const vaultOptionSchema = z.object({
  address: wireText(),
  totalRate: wireOptionalNumber(),
  stakeable: z
    .boolean()
    .nullable()
    .default(false)
    .transform((value) => value ?? false),
});

const tokenOptionSchema = z.object({
  address: wireText(),
  symbol: wireText(),
  vaults: wireList(vaultOptionSchema),
});

export type TokenOptionDto = z.infer<typeof tokenOptionSchema>;

export const yieldOptionsResponseSchema = z.object({
  data: wireList(tokenOptionSchema),
});
