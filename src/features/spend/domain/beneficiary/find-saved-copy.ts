import type { Beneficiary, RecipientFields } from '../entity/beneficiary';
import { destinationKeyOf } from './beneficiary-search';
import { toBeneficiary } from './to-beneficiary';

export function findSavedCopy(
  fields: RecipientFields,
  existing: readonly Beneficiary[],
): Beneficiary | undefined {
  const key = destinationKeyOf(
    toBeneficiary({ id: 'draft', fields, createdAt: '', updatedAt: '' }),
  );

  return existing.find((saved) => destinationKeyOf(saved) === key);
}

export function findSavedMerchant(
  qrString: string,
  existing: readonly Beneficiary[],
): Beneficiary | undefined {
  const code = qrString.trim();

  return existing.find((saved) => saved.kind === 'merchant' && saved.qrString.trim() === code);
}
