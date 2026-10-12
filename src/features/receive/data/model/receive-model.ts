import { z } from 'zod';
import { chainSchema } from '@/core/reference-data/reference-data-model';

export const chainListResponseSchema = z.object({ data: z.array(chainSchema).default([]) });

export const depositAddressSchema = z.object({
  chain: z.string().default(''),
  address: z.string().default(''),
  status: z.string().default(''),
});

export type DepositAddressDto = z.infer<typeof depositAddressSchema>;

export const depositAddressResponseSchema = z.object({ data: depositAddressSchema });
