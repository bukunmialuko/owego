import type { DetailRow } from '../corridor/corridor-spec';
import { row } from '../corridor/recipient-record';
import {
  BLANK_RECIPIENT_FIELDS,
  type MerchantBeneficiary,
  type RecipientFields,
} from '../entity/beneficiary';
import { merchantCodeIn } from '../scan/merchant-code';

type SavedMerchant = {
  id: string;
  qrString: string;
  createdAt: string;
  updatedAt: string;
  fields?: RecipientFields;
};

export function toMerchantBeneficiary({
  id,
  qrString,
  createdAt,
  updatedAt,
  fields = BLANK_RECIPIENT_FIELDS,
}: SavedMerchant): MerchantBeneficiary {
  const code = merchantCodeIn(qrString);
  const countryCode = code?.country.toLowerCase() ?? '';

  return {
    kind: 'merchant',
    id,
    fields,
    createdAt,
    updatedAt,
    merchantName: code?.merchantName ?? '',
    qrString,
    currency: code?.currency ?? '',
    ...(countryCode === '' ? {} : { countryCode }),
  };
}

export function merchantDetailRows(qrString: string): readonly DetailRow[] {
  const code = merchantCodeIn(qrString);
  const merchantName = code?.merchantName ?? '';

  return [
    merchantName === ''
      ? { labelKey: 'spend.merchant.label', valueKey: 'spend.merchant.unnamed' }
      : { labelKey: 'spend.merchant.label', value: merchantName },
    ...row('spend.city', code?.merchantCity ?? ''),
    ...row('common.currency', code?.currency ?? ''),
  ];
}
