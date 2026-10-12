import { CHAIN_METADATA } from '@/core/reference-data/chain-metadata';
import type { Beneficiary, RecipientRecord } from '../entity/beneficiary';
import { corridorOfRecipient } from '../corridor/recipient-corridor';
import { classifyRecipient, networkCodeOf } from './classify-recipient';
import { toMerchantBeneficiary } from './merchant-beneficiary';

export function toBeneficiary(record: RecipientRecord): Beneficiary {
  const { fields } = record;

  if (record.merchantCode !== undefined) {
    return toMerchantBeneficiary({
      id: record.id,
      qrString: record.merchantCode,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      fields,
    });
  }

  if (classifyRecipient(fields) === 'crypto') {
    const networkCode = networkCodeOf(fields.bankName);

    return {
      ...record,
      kind: 'wallet',
      tag: fields.accountHolder.trim(),
      address: fields.accountNumber.trim(),
      networkCode: networkCode ?? fields.bankName.trim(),
      networkName:
        networkCode === undefined
          ? fields.bankName.trim()
          : (CHAIN_METADATA[networkCode]?.name ?? networkCode),
    };
  }

  const corridor = corridorOfRecipient(fields);
  const countryCode = (fields.bankCountry || fields.contact.country).trim().toLowerCase();

  return {
    ...record,
    kind: 'bank',
    name: fields.accountHolder.trim(),
    institution: fields.bankName.trim(),
    reference: fields.accountNumber.trim(),
    ...(countryCode === '' ? {} : { countryCode }),
    ...(corridor === undefined
      ? {}
      : { corridor: { currency: corridor.currency, method: corridor.method } }),
  };
}
