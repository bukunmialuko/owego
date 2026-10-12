import type { PayeeDestination } from '@/core/payee/payee';
import type { Beneficiary } from '../entity/beneficiary';
import { merchantCodeIn } from '../scan/merchant-code';
import { resolveMerchantCode } from '../usecase/resolve-merchant-code-usecase';
import { payoutPrefillFor, walletPrefillFor } from './prefill';

export function payAgainDestination(beneficiary: Beneficiary): PayeeDestination {
  if (beneficiary.kind === 'merchant') return merchantDestination(beneficiary.qrString);

  const wallet = walletPrefillFor(beneficiary);
  if (wallet !== undefined) return { kind: 'walletSend', prefill: wallet };

  const payout = payoutPrefillFor(beneficiary);
  if (payout !== undefined) return { kind: 'bankTransfer', prefill: payout };

  return { kind: 'details' };
}

function merchantDestination(qrString: string): PayeeDestination {
  if (merchantCodeIn(qrString)?.isOneTime !== false) return { kind: 'details' };

  return resolveMerchantCode(qrString).kind === 'merchant'
    ? { kind: 'merchantPay', qrString }
    : { kind: 'details' };
}
