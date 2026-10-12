import { convert } from '@/core/fx/convert';
import type { TransferQuote } from './asset-transfer';
import type { TransferChallenge } from './transfer-challenge';

const WALLET_CURRENCY = 'USD';

export type PayoutFigures = {
  recipientGetsMinor: number;
  recipientUsdMinor: number;
  feeUsdMinor: number;
  totalUsdMinor: number;
  localPerUsd: number;
  currency?: string;
};

export type PayoutInitiation = {
  figures: PayoutFigures;
  challenge: TransferChallenge;
};

export type PayoutQuote = {
  destination: TransferQuote;
  wallet: TransferQuote;
  rate: number;
};

export function pricePayout(figures: PayoutFigures, currency: string): PayoutQuote | undefined {
  const { recipientGetsMinor, recipientUsdMinor, feeUsdMinor, totalUsdMinor, localPerUsd } =
    figures;

  if (figures.currency !== undefined && figures.currency !== currency) return undefined;
  if (![recipientGetsMinor, recipientUsdMinor, feeUsdMinor, totalUsdMinor].every(isWholeMinor)) {
    return undefined;
  }
  if (recipientGetsMinor === 0 || totalUsdMinor === 0) return undefined;

  const isConverted = currency !== WALLET_CURRENCY;
  if (isConverted && !(Number.isFinite(localPerUsd) && localPerUsd > 0)) return undefined;

  const rate = isConverted ? localPerUsd : 1;
  const feeMinor = isConverted
    ? convert(feeUsdMinor, { baseCurrency: WALLET_CURRENCY, quoteCurrency: currency, rate })
    : feeUsdMinor;

  return {
    destination: {
      recipientGetsMinor,
      feeMinor,
      totalMinor: recipientGetsMinor + feeMinor,
      currency,
    },
    wallet: {
      recipientGetsMinor: recipientUsdMinor,
      feeMinor: feeUsdMinor,
      totalMinor: totalUsdMinor,
      currency: WALLET_CURRENCY,
    },
    rate,
  };
}

function isWholeMinor(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
