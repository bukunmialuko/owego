import { CHAIN_METADATA, NATIVE_CHAIN_CODE } from '@/core/reference-data/chain-metadata';
import { chainFixture, countryFixture } from '@/core/reference-data/reference-data';
import type { FieldOption } from '../../domain/entity/beneficiary-form';

export const CATEGORY_OPTIONS: readonly FieldOption[] = [
  { value: 'individual', labelKey: 'spend.categoryIndividual' },
  { value: 'business', labelKey: 'spend.categoryBusiness' },
];

export function countryOptions(): readonly FieldOption[] {
  const parsed = countryFixture.read();

  return parsed.ok
    ? parsed.value.map((country) => ({ value: country.code, label: country.name }))
    : [];
}

export function networkOptions(): readonly FieldOption[] {
  const parsed = chainFixture.read();
  const bridged = parsed.ok ? parsed.value.filter((chain) => chain.enabled) : [];

  return [
    {
      value: NATIVE_CHAIN_CODE,
      label: CHAIN_METADATA[NATIVE_CHAIN_CODE]?.name ?? NATIVE_CHAIN_CODE,
    },
    ...bridged.map((chain) => ({
      value: chain.key,
      label: CHAIN_METADATA[chain.key]?.name ?? chain.key,
    })),
  ];
}
