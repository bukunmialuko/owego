import { decimalToMinorFloor } from '@/core/money/money';
import { isOnChain } from '@/core/wallet/chain';
import type { Wallet } from '@/core/wallet/wallet';
import type { FundingOption } from './funding-token';
import { SENDABLE_TOKENS, type SendableToken } from './send-networks';

export type SendableAsset = {
  walletId: string;
  tokenId: string;
  symbol: SendableToken;
  amount: string;
};

export function findSendableAsset(
  wallets: Wallet[],
  networkCode: string,
  symbol: SendableToken,
): SendableAsset | undefined {
  const wallet = wallets.find((candidate) => isOnChain(candidate.blockchain, networkCode));
  const row = wallet?.balances.find((balance) => balance.symbol === symbol);

  if (wallet === undefined || row === undefined) return undefined;
  if (wallet.id === '' || row.tokenId === '') return undefined;

  return { walletId: wallet.id, tokenId: row.tokenId, symbol, amount: row.amount };
}

export function sendableBalanceMinor(
  wallets: Wallet[],
  networkCode: string,
  symbol: SendableToken,
): number | undefined {
  const asset = findSendableAsset(wallets, networkCode, symbol);

  return asset === undefined ? undefined : decimalToMinorFloor(asset.amount);
}

export function sendableOptions(wallets: Wallet[], networkCode: string): FundingOption[] {
  return SENDABLE_TOKENS.flatMap((symbol) => {
    const balanceMinor = sendableBalanceMinor(wallets, networkCode, symbol);

    return balanceMinor === undefined ? [] : [{ symbol, balanceMinor }];
  });
}
