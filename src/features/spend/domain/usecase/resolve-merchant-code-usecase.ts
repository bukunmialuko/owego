import type { CurrencyDto } from '@/core/reference-data/reference-data';
import { payoutCurrencies } from '../corridor/registry';
import { classifyDetection } from '../scan/classify-detection';
import type { ScanOutcome } from '../scan/scan-outcome';
import { resolveScanOutcome } from './resolve-scan-outcome-usecase';

export type MerchantResolution = Extract<ScanOutcome, { kind: 'merchant' | 'unsupported' }>;

export function resolveMerchantCode(
  raw: string,
  currencies: readonly CurrencyDto[] = payoutCurrencies(),
): MerchantResolution {
  const detected = classifyDetection(raw);
  if (detected.kind === 'unknown') return { kind: 'unsupported', reason: detected.reason };
  if (detected.kind !== 'merchantQr') return { kind: 'unsupported', reason: 'unknownCode' };

  const outcome = resolveScanOutcome(raw, currencies);

  switch (outcome.kind) {
    case 'merchant':
    case 'unsupported':
      return outcome;

    case 'account':
    case 'prefillRecipient':
    case 'prefillAddress':
      return { kind: 'unsupported', reason: 'unknownCode' };
  }
}
