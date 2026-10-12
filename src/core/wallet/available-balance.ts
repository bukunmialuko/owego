import type { FxQuote } from '@/core/fx/fx-rate';
import {
  decimalToUnitsFloor,
  fractionDigitsFor,
  isCurrencyCode,
  type CurrencyCode,
} from '@/core/money/money';
import type { Wallet } from './wallet';

export const DOLLAR_STABLECOINS: readonly string[] = ['USDC', 'USDT'];

const MICRO_PLACES = 6;
const API_MINOR_PLACES = 2;

export type AvailableBalance = {
  amountMinor: number;
  currency: CurrencyCode;
};

export function availableBalance(wallets: Wallet[], quote: FxQuote): AvailableBalance | undefined {
  const currency = quote.quoteCurrency;
  if (!isCurrencyCode(currency)) return undefined;

  const dollarsMicro = wallets
    .flatMap((wallet) => wallet.balances)
    .filter((balance) => DOLLAR_STABLECOINS.includes(balance.symbol))
    .reduce((sum, balance) => sum + (decimalToUnitsFloor(balance.amount, MICRO_PLACES) ?? 0), 0);

  const convertedMicro = Math.round(dollarsMicro * quote.rate);
  const places = fractionDigitsFor(currency);
  const smallestUnits = Math.floor(convertedMicro / 10 ** (MICRO_PLACES - places));

  return { amountMinor: smallestUnits * 10 ** (API_MINOR_PLACES - places), currency };
}
