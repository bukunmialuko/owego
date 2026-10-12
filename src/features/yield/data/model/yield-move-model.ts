import { z } from 'zod';
import { wireOptionalNumber, wireText } from '@/core/network/wire-schema';

const depositQuoteSchema = z.object({
  stake_amount_usdc: wireOptionalNumber(),
  estimated_gas_usdc: wireOptionalNumber(),
  total_debit_usdc: wireOptionalNumber(),
});
export type DepositQuoteDto = z.infer<typeof depositQuoteSchema>;
const NO_DEPOSIT_QUOTE: DepositQuoteDto = {
  stake_amount_usdc: undefined,
  estimated_gas_usdc: undefined,
  total_debit_usdc: undefined,
};
export const depositQuoteResponseSchema = z.object({
  data: depositQuoteSchema
    .nullable()
    .default(NO_DEPOSIT_QUOTE)
    .transform((quote) => quote ?? NO_DEPOSIT_QUOTE),
});

const withdrawalQuoteSchema = z.object({
  withdraw_amount_usdc: wireOptionalNumber(),
  estimated_gas_usdc: wireOptionalNumber(),
  net_received_usdc: wireOptionalNumber(),
});
export type WithdrawalQuoteDto = z.infer<typeof withdrawalQuoteSchema>;
const NO_WITHDRAWAL_QUOTE: WithdrawalQuoteDto = {
  withdraw_amount_usdc: undefined,
  estimated_gas_usdc: undefined,
  net_received_usdc: undefined,
};
export const withdrawalQuoteResponseSchema = z.object({
  data: withdrawalQuoteSchema
    .nullable()
    .default(NO_WITHDRAWAL_QUOTE)
    .transform((quote) => quote ?? NO_WITHDRAWAL_QUOTE),
});

const initiationSchema = z.object({
  challenge_id: wireText(),
  user_token: wireText(),
  encryption_key: wireText(),
  transaction_id: wireText(),
});
export type YieldInitiationDto = z.infer<typeof initiationSchema>;
const NO_INITIATION: YieldInitiationDto = {
  challenge_id: '',
  user_token: '',
  encryption_key: '',
  transaction_id: '',
};
export const yieldInitiationResponseSchema = z.object({
  data: initiationSchema
    .nullable()
    .default(NO_INITIATION)
    .transform((initiation) => initiation ?? NO_INITIATION),
});

const broadcastSchema = z.object({ status: wireText() });
export type YieldBroadcastDto = z.infer<typeof broadcastSchema>;
const NO_BROADCAST: YieldBroadcastDto = { status: '' };
export const yieldBroadcastResponseSchema = z.object({
  data: broadcastSchema
    .nullable()
    .default(NO_BROADCAST)
    .transform((broadcast) => broadcast ?? NO_BROADCAST),
});
