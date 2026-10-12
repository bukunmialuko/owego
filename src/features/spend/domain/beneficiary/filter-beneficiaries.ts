import type { Beneficiary } from '../entity/beneficiary';
import { searchBeneficiaries } from './beneficiary-search';

export type BeneficiaryTab = 'bank' | 'wallet';

export function tabOf(beneficiary: Beneficiary): BeneficiaryTab {
  switch (beneficiary.kind) {
    case 'wallet':
      return 'wallet';
    case 'bank':
    case 'merchant':
      return 'bank';
  }
}

export function filterBeneficiaries(
  beneficiaries: readonly Beneficiary[],
  tab: BeneficiaryTab,
  query: string,
): Beneficiary[] {
  const onTab = beneficiaries.filter((beneficiary) => tabOf(beneficiary) === tab);

  return searchBeneficiaries(onTab, query, { dedupe: false });
}
