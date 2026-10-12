import { z } from 'zod';
import { wireList, wireNumber, wireOptionalNumber, wireText } from '@/core/network/wire-schema';

const yieldSummarySchema = z.object({
  total_staked_usdc: wireNumber(),
  total_deposited_usdc: wireNumber(),
  total_profit_usdc: wireNumber(),
  total_profit_percent: wireNumber(),
});

const stakedVaultSchema = z.object({
  vault_address: wireText(),
  token: wireText(),
  token_id: wireText(),
  staked_usdc: wireNumber(),
  deposited_usdc: wireNumber(),
  profit_usdc: wireNumber(),
  profit_percent: wireNumber(),
  total_rate: wireOptionalNumber(),
});

export type YieldSummaryDto = z.infer<typeof yieldSummarySchema>;
export type StakedVaultDto = z.infer<typeof stakedVaultSchema>;

const overviewSchema = z.object({
  summary: yieldSummarySchema.nullable().default(null),
  products: wireList(stakedVaultSchema),
});

type OverviewDto = z.infer<typeof overviewSchema>;

const EMPTY: OverviewDto = { summary: null, products: [] };

export const yieldOverviewResponseSchema = z.object({
  data: overviewSchema
    .nullable()
    .default(EMPTY)
    .transform((overview) => overview ?? EMPTY),
});
