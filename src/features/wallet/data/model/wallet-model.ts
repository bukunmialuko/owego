import { z } from 'zod';
import { wireInteger, wireList, wireText } from '@/core/network/wire-schema';

const balanceSchema = z.object({
  name: wireText(),
  symbol: wireText(),
  decimals: wireInteger(),
  token_address: wireText(),
  amount: wireText('0'),
  token_id: wireText(),
});

/** @public */
export type BalanceDto = z.infer<typeof balanceSchema>;

export const walletSchema = z.object({
  id: wireText(),
  address: wireText(),
  blockchain: wireText(),
  balances: wireList(balanceSchema),
});

export type WalletDto = z.infer<typeof walletSchema>;

export const walletListResponseSchema = z.object({
  data: wireList(walletSchema),
});

export const walletChallengeSchema = z.object({
  challenge_id: wireText(),
  user_token: wireText(),
  encryption_key: wireText(),
});

export type WalletChallengeDto = z.infer<typeof walletChallengeSchema>;

const EMPTY_CHALLENGE: WalletChallengeDto = {
  challenge_id: '',
  user_token: '',
  encryption_key: '',
};

export const walletChallengeResponseSchema = z.object({
  data: walletChallengeSchema
    .nullable()
    .default(EMPTY_CHALLENGE)
    .transform((challenge) => challenge ?? EMPTY_CHALLENGE),
});
