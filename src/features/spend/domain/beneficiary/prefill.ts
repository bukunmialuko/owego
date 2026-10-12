import type { Beneficiary } from '../entity/beneficiary';
import type { PaymentMethodCode } from '../entity/beneficiary-form';
import { corridorFor } from '../corridor/registry';
import { networkCodeOf } from './classify-recipient';

export type PayoutPrefill = {
  currency: string;
  method: PaymentMethodCode;
  values: Record<string, string>;
};

export type WalletPrefill = {
  address: string;
  networkCode?: string;
};

export function payoutPrefillFor(beneficiary: Beneficiary): PayoutPrefill | undefined {
  if (beneficiary.kind !== 'bank' || beneficiary.corridor === undefined) return undefined;

  const corridor = corridorFor(beneficiary.corridor.currency, beneficiary.corridor.method);
  if (corridor?.beneficiary === undefined || !corridor.payable || corridor.entry !== 'form') {
    return undefined;
  }

  const saved = corridor.beneficiary.fromRecipient(beneficiary.fields);
  const values: Record<string, string> = {};

  for (const field of corridor.steps.flatMap((step) => step.fields)) {
    const value = saved[field.name];
    if (field.derived !== true && value !== undefined && value !== '') values[field.name] = value;
  }

  return { currency: corridor.currency, method: corridor.method, values };
}

export function walletPrefillFor(beneficiary: Beneficiary): WalletPrefill | undefined {
  if (beneficiary.kind !== 'wallet') return undefined;

  const networkCode = networkCodeOf(beneficiary.networkCode);

  return {
    address: beneficiary.address,
    ...(networkCode === undefined ? {} : { networkCode }),
  };
}
