import type { CurrencyDto } from '@/core/reference-data/reference-data';
import type { CorridorSpec, FieldValues } from './corridor-spec';
import type { PayoutRecipient } from '../entity/payout-recipient';

export function toPayoutRecipient(
  corridor: CorridorSpec,
  values: FieldValues,
  currency: CurrencyDto,
  labelOf: (name: string) => string,
): PayoutRecipient {
  const { displayName, subtitle } = corridor.summarise(values, labelOf);
  const choices = corridor.steps
    .flatMap((step) => step.fields)
    .filter((field) => field.kind === 'select');

  return {
    displayName,
    subtitle,
    ...(corridor.unnamedKey === undefined ? {} : { unnamedKey: corridor.unnamedKey }),
    currency: corridor.currency,
    method: corridor.method,
    rail: corridor.rail,
    endpoint: corridor.endpoint,
    requiresNarration: corridor.requiresNarration,
    limits: corridor.limits ?? [],
    countryCode: currency.country_code,
    values,
    labels: Object.fromEntries(choices.map((field) => [field.name, labelOf(field.name)])),
  };
}
