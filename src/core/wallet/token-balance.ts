import { decimalToMinorFloor } from '@/core/money/money';
import type { Wallet } from './wallet';

const TOKEN_CURRENCY = 'USD';

export function tokenBalanceOf(
  wallets: Wallet[],
  tokenSymbol: string,
): { amountMinor: number; currency: string } | undefined {
  const holdings = wallets
    .flatMap((wallet) => wallet.balances)
    .filter((balance) => balance.symbol === tokenSymbol);

  if (holdings.length === 0) return undefined;

  return {
    amountMinor: holdings.reduce((total, holding) => total + toMinor(holding.amount), 0),
    currency: TOKEN_CURRENCY,
  };
}

function toMinor(amount: string): number {
  return decimalToMinorFloor(amount) ?? 0;
}
