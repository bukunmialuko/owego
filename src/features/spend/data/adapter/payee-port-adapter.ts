import { truncateAddress } from '@/core/format/address';
import type { Payee, PayeePort } from '@/core/payee/payee';
import { map } from '@/core/result/result';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import type { BeneficiaryRepository } from '../../domain/repository/beneficiary-repository';
import { maskReference } from '../../domain/beneficiary/mask-reference';
import { payAgainDestination } from '../../domain/beneficiary/pay-again';

const TINTS = ['brand', 'success', 'error', 'warning', 'neutral'] as const;

export function createPayeePortAdapter(beneficiaryRepository: BeneficiaryRepository): PayeePort {
  return {
    async getRecent(limit) {
      const recent = await beneficiaryRepository.getRecent();

      return map(recent, (beneficiaries) => beneficiaries.slice(0, limit).map(toPayee));
    },
  };
}

function toPayee(beneficiary: Beneficiary, index: number): Payee {
  const tint = TINTS[index % TINTS.length] ?? 'neutral';
  const destination = payAgainDestination(beneficiary);

  switch (beneficiary.kind) {
    case 'wallet': {
      const address = truncateAddress(beneficiary.address);

      return {
        id: beneficiary.id,
        name: beneficiary.tag === '' ? address : beneficiary.tag,
        detail: address,
        tint,
        destination,
      };
    }

    case 'merchant':
      return {
        id: beneficiary.id,
        name: beneficiary.merchantName,
        detail: beneficiary.currency,
        ...(beneficiary.countryCode === undefined ? {} : { countryCode: beneficiary.countryCode }),
        tint,
        destination,
      };

    case 'bank':
      return {
        id: beneficiary.id,
        name: beneficiary.name === '' ? beneficiary.institution : beneficiary.name,
        detail: `${beneficiary.institution} • ${maskReference(beneficiary.reference)}`,
        ...(beneficiary.countryCode === undefined ? {} : { countryCode: beneficiary.countryCode }),
        tint,
        destination,
      };
  }
}
