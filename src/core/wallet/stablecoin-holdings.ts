import { decimalToUnitsFloor, unitsToDecimalString } from '@/core/money/money';
import { DOLLAR_STABLECOINS } from './available-balance';
import type { Wallet } from './wallet';

const MICRO_PLACES = 6;

export type StablecoinHolding = {
  symbol: string;
  amount: string;
};

export function stablecoinHoldings(wallets: Wallet[]): StablecoinHolding[] {
  const balances = wallets.flatMap((wallet) => wallet.balances);

  return DOLLAR_STABLECOINS.flatMap((symbol) => {
    const held = balances.filter((balance) => balance.symbol === symbol);
    if (held.length === 0) return [];

    const micro = held.reduce(
      (sum, balance) => sum + (decimalToUnitsFloor(balance.amount, MICRO_PLACES) ?? 0),
      0,
    );

    return [{ symbol, amount: unitsToDecimalString(micro, MICRO_PLACES) }];
  });
}
