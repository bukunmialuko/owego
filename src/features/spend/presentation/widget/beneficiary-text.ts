import { truncateAddress } from '@/core/format/address';
import type { TranslationKey } from '@/core/i18n/translation-key';
import type { Beneficiary } from '../../domain/entity/beneficiary';
import { maskReference } from '../../domain/beneficiary/mask-reference';

type Translate = (key: TranslationKey) => string;

export function beneficiaryTitle(beneficiary: Beneficiary, t: Translate): string {
  switch (beneficiary.kind) {
    case 'wallet':
      return beneficiary.tag === '' ? truncateAddress(beneficiary.address) : beneficiary.tag;

    case 'merchant':
      return beneficiary.merchantName === ''
        ? t('spend.merchant.unnamed')
        : beneficiary.merchantName;

    case 'bank':
      if (beneficiary.name !== '') return beneficiary.name;

      return beneficiary.institution === ''
        ? maskReference(beneficiary.reference)
        : beneficiary.institution;
  }
}

export function beneficiarySubtitle(beneficiary: Beneficiary): string {
  switch (beneficiary.kind) {
    case 'wallet':
      return truncateAddress(beneficiary.address);

    case 'merchant':
      return beneficiary.currency;

    case 'bank': {
      const masked = maskReference(beneficiary.reference);

      return beneficiary.institution === '' ? masked : `${beneficiary.institution} • ${masked}`;
    }
  }
}
