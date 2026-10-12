import type { RecipientFields } from '../entity/beneficiary';
import { allCorridors, beneficiaryCorridorsFor, payoutCurrencies } from './registry';
import { RailCode, type CorridorSpec, type FieldValues } from './corridor-spec';

const DOLLAR_METHODS = new Set(['swift', 'ach', 'wire']);

export function corridorOfRecipient(fields: RecipientFields): CorridorSpec | undefined {
  const method = fields.paymentMethod.trim().toLowerCase();

  if (method !== '') {
    const written = allCorridors().find(
      (spec) => spec.beneficiary?.paymentMethod?.toLowerCase() === method,
    );
    if (written !== undefined) return written;

    const paidOver = allCorridors().find(
      (spec) =>
        spec.payable &&
        spec.entry === 'form' &&
        spec.rail !== RailCode.Wallet &&
        spec.rail === method,
    );
    if (paidOver !== undefined) return paidOver;
  }

  const currency = recipientCurrency(fields);
  if (currency === undefined) return undefined;

  const candidates = beneficiaryCorridorsFor(currency);
  if (candidates.length === 1) return candidates[0];

  const claimed = candidates.filter((spec) => spec.beneficiary?.claims?.(fields) === true);

  return claimed.length === 1 ? claimed[0] : undefined;
}

function recipientCurrency(fields: RecipientFields): string | undefined {
  if (DOLLAR_METHODS.has(fields.paymentMethod.trim().toLowerCase())) return 'USD';

  const country = fields.bankCountry.trim().toLowerCase();
  if (country === '') return undefined;

  return payoutCurrencies().find((currency) => currency.country_code.toLowerCase() === country)
    ?.code;
}

export function recipientFor(
  corridor: CorridorSpec,
  values: FieldValues,
  labelOf: (name: string) => string,
): RecipientFields {
  const block = corridor.beneficiary;
  if (block === undefined || !block.saveable) {
    throw new TypeError(
      `${corridor.currency}:${corridor.method} cannot be saved as a beneficiary.`,
    );
  }

  const currency = payoutCurrencies().find((candidate) => candidate.code === corridor.currency);

  return block.toRecipient(values, {
    countryCode: currency?.country_code.toLowerCase() ?? '',
    labelOf,
  });
}
