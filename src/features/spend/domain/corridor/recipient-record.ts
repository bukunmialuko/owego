import { countryFixture, findCountry } from '@/core/reference-data/reference-data';
import type { TranslationKey } from '@/core/i18n/translation-key';
import type { RecipientContact, RecipientFields } from '../entity/beneficiary';
import type { DetailRow, FieldValues } from './corridor-spec';

type RecipientDraft = Partial<Omit<RecipientFields, 'contact'>> & {
  contact?: Partial<RecipientContact>;
};

export function recipientRecord(draft: RecipientDraft): RecipientFields {
  const clean = (value: string | undefined) => (value ?? '').trim();

  return {
    bankCountry: clean(draft.bankCountry),
    bankName: clean(draft.bankName),
    bankCode: clean(draft.bankCode),
    accountHolder: clean(draft.accountHolder),
    swiftNumber: clean(draft.swiftNumber),
    accountNumber: clean(draft.accountNumber),
    paymentMethod: clean(draft.paymentMethod),
    accountType: clean(draft.accountType),
    contact: {
      country: clean(draft.contact?.country),
      state: clean(draft.contact?.state),
      city: clean(draft.contact?.city),
      address: clean(draft.contact?.address),
      zipCode: clean(draft.contact?.zipCode),
      email: clean(draft.contact?.email),
    },
  };
}

export function valueOf(values: FieldValues, name: string): string {
  return values[name] ?? '';
}

export function addressLine(contact: RecipientContact): string {
  const region = [contact.state, contact.zipCode].filter((part) => part !== '').join(' ');

  return [contact.address, contact.city, region, countryName(contact.country)]
    .filter((part) => part !== '')
    .join(', ');
}

function countryName(code: string): string {
  if (code === '') return '';

  const countries = countryFixture.read();
  const country = countries.ok ? findCountry(countries.value, code.toLowerCase()) : undefined;

  return country?.name ?? code;
}

export function row(labelKey: TranslationKey, value: string): DetailRow[] {
  return value === '' ? [] : [{ labelKey, value }];
}

export function bankRows(fields: RecipientFields): readonly DetailRow[] {
  return [
    ...row('common.bankName', fields.bankName),
    ...row('common.accountNumber', fields.accountNumber),
    ...row('spend.swiftCode', fields.swiftNumber),
    ...row('spend.beneficiaries.address', addressLine(fields.contact)),
  ];
}
