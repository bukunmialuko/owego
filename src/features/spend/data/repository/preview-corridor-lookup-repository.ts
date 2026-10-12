import { ok } from '@/core/result/result';
import type { FieldOption } from '../../domain/entity/beneficiary-form';
import type { CorridorLookupRepository } from '../../domain/repository/corridor-lookup-repository';
import { CATEGORY_OPTIONS, countryOptions, networkOptions } from './static-field-options';

const BANKS: readonly FieldOption[] = [
  { value: '044', label: 'Access Bank' },
  { value: '058', label: 'Guaranty Trust Bank' },
  { value: '057', label: 'Zenith Bank' },
  { value: '033', label: 'United Bank for Africa' },
  { value: '011', label: 'First Bank of Nigeria' },
];

const ACCOUNT_NAMES: Readonly<Record<string, string>> = {
  '0123456789': 'Hannah Nuggest',
  '0123578038': 'Precious Jameson',
  '0152847803': 'Jasper Nwosu',
};

const RESOLVE_DELAY_MS = 600;

function after<T>(value: T, delayMs: number): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(value);
    }, delayMs);
  });
}

export function createPreviewCorridorLookupRepository(): CorridorLookupRepository {
  return {
    getOptions: (source) => {
      switch (source) {
        case 'bankList':
          return Promise.resolve(ok(BANKS));
        case 'countries':
          return Promise.resolve(ok(countryOptions()));
        case 'beneficiaryCategories':
          return Promise.resolve(ok(CATEGORY_OPTIONS));
        case 'networks':
          return Promise.resolve(ok(networkOptions()));
        case 'mobileMoneyProviders':
          return Promise.resolve(ok([]));
      }
    },

    resolveAccount: (_bankCode, accountNumber) => {
      const accountName = ACCOUNT_NAMES[accountNumber];

      return after(
        ok(accountName === undefined ? undefined : { accountName, accountNumber }),
        RESOLVE_DELAY_MS,
      );
    },
  };
}
