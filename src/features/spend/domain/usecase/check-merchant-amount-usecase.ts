import { decimalToMinorFloor } from '@/core/money/money';
import type { CurrencyDto } from '@/core/reference-data/reference-data';
import { payoutCurrencies } from '../corridor/registry';

export type MerchantAmountCheck =
  { kind: 'payable' } | { kind: 'belowMinimum'; minimumMinor: number };

export function checkMerchantAmount(
  amountMinor: number,
  currency: string,
  currencies: readonly CurrencyDto[] = payoutCurrencies(),
): MerchantAmountCheck {
  const minimum = currencies.find((entry) => entry.code === currency)?.min_amount;
  if (minimum === null || minimum === undefined) return { kind: 'payable' };

  const minimumMinor = decimalToMinorFloor(String(minimum));
  if (minimumMinor === undefined || amountMinor >= minimumMinor) return { kind: 'payable' };

  return { kind: 'belowMinimum', minimumMinor };
}
