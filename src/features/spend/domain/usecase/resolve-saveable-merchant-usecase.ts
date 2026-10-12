import type { CurrencyDto } from '@/core/reference-data/reference-data';
import { payoutCurrencies } from '../corridor/registry';
import { merchantCodeIn } from '../scan/merchant-code';
import { resolveMerchantCode, type MerchantResolution } from './resolve-merchant-code-usecase';

export function resolveSaveableMerchant(
  raw: string,
  currencies: readonly CurrencyDto[] = payoutCurrencies(),
): MerchantResolution {
  const resolved = resolveMerchantCode(raw, currencies);
  if (resolved.kind === 'unsupported') return resolved;

  return merchantCodeIn(raw)?.isOneTime === false
    ? resolved
    : { kind: 'unsupported', reason: 'oneTimeCode' };
}
