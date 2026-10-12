import { BLANK_RECIPIENT_FIELDS, type RecipientFields } from '../entity/beneficiary';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import { classifyRecipient, surfaceAccepts } from '../beneficiary/classify-recipient';
import {
  beneficiaryCorridorsFor,
  corridorNamed,
  corridorFor,
  isSaveableByForm,
  payoutCurrencies,
  savableCorridors,
  walletBeneficiaryCorridor,
} from './registry';
import { corridorOfRecipient, recipientFor } from './recipient-corridor';
import type { CorridorSpec, FieldValues } from './corridor-spec';

function spec(currency: string, method: PaymentMethodCode): CorridorSpec {
  const found = corridorFor(currency, method);
  if (found === undefined) throw new Error(`no corridor ${currency}:${method}`);

  return found;
}

const LABELS: Readonly<Record<string, string>> = { bankCode: 'Guaranty Trust Bank' };
const labelOf = (name: string) => LABELS[name] ?? '';

function saving(currency: string, method: PaymentMethodCode, values: FieldValues) {
  return recipientFor(spec(currency, method), values, labelOf);
}

const SAMPLES: Readonly<Record<string, FieldValues>> = {
  'NGN:bank_transfer': {
    bankCode: '058',
    accountNumber: '0123456789',
    accountName: 'Hannah Nuggest',
  },
  'KES:mobile_money': {
    provider: 'mpesa',
    beneficiaryName: 'Wanjiru Kamau',
    phoneNumber: '+254712345678',
  },
  'XOF:mobile_money': {
    provider: 'orange',
    beneficiaryName: 'Awa Diallo',
    phoneNumber: '+2250712345678',
  },
  'USD:zelle': {
    category: 'business',
    beneficiaryName: 'Precious Jameson',
    zelleId: 'precious.james@mail.com',
  },
  'USD:swift': {
    accountHolder: 'Hannah Nuggest',
    accountNumber: '031234567890',
    bankName: 'Citi bank',
    swiftCode: 'CITIGB2L',
    streetAddress: '33 Canada Square',
    country: 'gb',
    city: 'London',
    state: 'Greater London',
    postalCode: 'E14 5LB',
  },
  'USD:ach': {
    accountHolder: 'Precious Jameson',
    routingNumber: '021000021',
    accountNumber: '0123456789',
    accountType: 'checking',
    bankName: 'Chase',
    streetAddress: '270 Park Avenue',
    country: 'us',
    city: 'New York',
    state: 'NY',
    postalCode: '10017',
  },
  'USDC:crypto': {
    walletTag: 'Main wallet',
    network: 'BASE',
    walletAddress: '0xb249111111111111111111111111111111113901',
  },
};

const keyOf = (corridor: CorridorSpec) => `${corridor.currency}:${corridor.method}`;

describe('what each corridor saves', () => {
  it('saves a Nigerian account with the name the server resolved, never a typed one', () => {
    expect(
      saving('NGN', PaymentMethodCode.BankTransfer, SAMPLES['NGN:bank_transfer'] ?? {}),
    ).toEqual({
      ...BLANK_RECIPIENT_FIELDS,
      bankCountry: 'ng',
      bankName: 'Guaranty Trust Bank',
      bankCode: '058',
      accountHolder: 'Hannah Nuggest',
      accountNumber: '0123456789',
    });
  });

  it('saves M-Pesa as the institution of a Kenyan phone number', () => {
    expect(saving('KES', PaymentMethodCode.MobileMoney, SAMPLES['KES:mobile_money'] ?? {})).toEqual(
      {
        ...BLANK_RECIPIENT_FIELDS,
        bankCountry: 'ke',
        bankName: 'M-Pesa',
        accountHolder: 'Wanjiru Kamau',
        accountNumber: '+254712345678',
      },
    );
  });

  it.each([
    ['wave', 'Wave'],
    ['orange', 'Orange Money'],
  ])('saves the %s provider under the name v1 wrote, %s', (provider, name) => {
    const record = saving('XOF', PaymentMethodCode.MobileMoney, {
      ...SAMPLES['XOF:mobile_money'],
      provider,
    });

    expect(record).toEqual({
      ...BLANK_RECIPIENT_FIELDS,
      bankCountry: 'ci',
      bankName: name,
      accountHolder: 'Awa Diallo',
      accountNumber: '+2250712345678',
    });
  });

  it('carries the Zelle category in the bank code, as staging spells it', () => {
    expect(saving('USD', PaymentMethodCode.Zelle, SAMPLES['USD:zelle'] ?? {})).toEqual({
      ...BLANK_RECIPIENT_FIELDS,
      bankCountry: 'us',
      bankName: 'Zelle',
      bankCode: 'zelle_business',
      accountHolder: 'Precious Jameson',
      accountNumber: 'precious.james@mail.com',
    });
  });

  it("saves SWIFT with its code, its payment method and the beneficiary's address", () => {
    expect(saving('USD', PaymentMethodCode.Swift, SAMPLES['USD:swift'] ?? {})).toEqual({
      bankCountry: 'gb',
      bankName: 'Citi bank',
      bankCode: '',
      accountHolder: 'Hannah Nuggest',
      swiftNumber: 'CITIGB2L',
      accountNumber: '031234567890',
      paymentMethod: 'SWIFT',
      accountType: '',
      contact: {
        country: 'gb',
        state: 'Greater London',
        city: 'London',
        address: '33 Canada Square',
        zipCode: 'E14 5LB',
        email: '',
      },
    });
  });

  it('saves a wallet as its tag, its network and its address, and nothing else', () => {
    expect(saving('USDC', PaymentMethodCode.Crypto, SAMPLES['USDC:crypto'] ?? {})).toEqual({
      ...BLANK_RECIPIENT_FIELDS,
      bankName: 'BASE',
      accountHolder: 'Main wallet',
      accountNumber: '0xb249111111111111111111111111111111113901',
    });
  });

  it('saves what was typed without the spaces around it', () => {
    const record = saving('USDC', PaymentMethodCode.Crypto, {
      walletTag: '  Main wallet ',
      network: 'BASE',
      walletAddress: ' 0xb249111111111111111111111111111111113901\n',
    });

    expect(record.accountHolder).toBe('Main wallet');
    expect(record.accountNumber).toBe('0xb249111111111111111111111111111111113901');
  });
});

describe('what each corridor asks for', () => {
  const names = (corridor: CorridorSpec, step: number) =>
    corridor.beneficiary?.steps[step]?.fields.map((field) => field.name);

  it("asks SWIFT for its code and the beneficiary's address on a second page", () => {
    const swift = spec('USD', PaymentMethodCode.Swift);

    expect(names(swift, 0)).toEqual(['accountHolder', 'accountNumber']);
    expect(names(swift, 1)).toEqual([
      'bankName',
      'swiftCode',
      'streetAddress',
      'country',
      'city',
      'state',
      'postalCode',
    ]);
  });

  it('does not ask SWIFT for a category it has nowhere to keep', () => {
    const fields = spec('USD', PaymentMethodCode.Swift).beneficiary?.steps.flatMap(
      (step) => step.fields,
    );

    expect(fields?.map((field) => field.name)).not.toContain('category');
  });

  it("asks for a wallet's tag, its network and its address", () => {
    expect(names(walletBeneficiaryCorridor(), 0)).toEqual([
      'walletTag',
      'network',
      'walletAddress',
    ]);
  });

  it('asks ACH for its routing number and account type, then the bank details on a second page', () => {
    const ach = spec('USD', PaymentMethodCode.Ach);

    expect(names(ach, 0)).toEqual([
      'accountHolder',
      'routingNumber',
      'accountNumber',
      'accountType',
    ]);
    expect(ach.beneficiary?.steps[1]?.titleKey).toBe('spend.bankDetails');
    expect(names(ach, 1)).toEqual([
      'bankName',
      'streetAddress',
      'country',
      'city',
      'state',
      'postalCode',
    ]);
  });

  it('does not ask ACH for a category it has nowhere to keep', () => {
    const fields = spec('USD', PaymentMethodCode.Ach).beneficiary?.steps.flatMap(
      (step) => step.fields,
    );

    expect(fields?.map((field) => field.name)).not.toContain('category');
  });
});

describe('a Zelle record saved before staging asked for zelle_ codes', () => {
  const legacy: RecipientFields = {
    ...BLANK_RECIPIENT_FIELDS,
    bankCountry: 'us',
    bankName: 'Zelle',
    bankCode: 'individual',
    accountHolder: 'Precious Jameson',
    accountNumber: 'precious.james@mail.com',
  };

  it('is still recognised as Zelle', () => {
    expect(corridorOfRecipient({ ...legacy, bankName: '' })).toBe(
      spec('USD', PaymentMethodCode.Zelle),
    );
  });

  it('still prefills its category', () => {
    expect(spec('USD', PaymentMethodCode.Zelle).beneficiary?.fromRecipient(legacy)).toMatchObject({
      category: 'individual',
    });
  });

  it('still names its category in words', () => {
    expect(spec('USD', PaymentMethodCode.Zelle).beneficiary?.details(legacy)).toContainEqual({
      labelKey: 'spend.beneficiaryCategory',
      valueKey: 'spend.categoryIndividual',
    });
  });
});

describe('ACH', () => {
  it('saves the routing number as the bank code, the account type, and the address as the contact', () => {
    expect(saving('USD', PaymentMethodCode.Ach, SAMPLES['USD:ach'] ?? {})).toEqual({
      bankCountry: 'us',
      bankName: 'Chase',
      bankCode: '021000021',
      accountHolder: 'Precious Jameson',
      swiftNumber: '',
      accountNumber: '0123456789',
      paymentMethod: 'ACH',
      accountType: 'checking',
      contact: {
        country: 'us',
        state: 'NY',
        city: 'New York',
        address: '270 Park Avenue',
        zipCode: '10017',
        email: '',
      },
    });
  });

  it('stays unpayable', () => {
    expect(spec('USD', PaymentMethodCode.Ach).payable).toBe(false);
  });
});

describe.each(savableCorridors().map((corridor) => [keyOf(corridor), corridor] as const))(
  'the %s corridor',
  (key, corridor) => {
    const sample = SAMPLES[key] ?? {};
    const record = recipientFor(corridor, sample, labelOf);

    it('has a sample for every field it collects', () => {
      const collected = (corridor.beneficiary?.steps ?? []).flatMap((step) =>
        step.fields.map((field) => field.name),
      );

      expect(Object.keys(sample).sort()).toEqual(collected.sort());
    });

    it('persists every field it collects', () => {
      expect(corridor.beneficiary?.fromRecipient(record)).toMatchObject(sample);
    });

    it('lands on the surface that can pay it', () => {
      const surface = corridor.method === PaymentMethodCode.Crypto ? 'crypto' : 'bank';

      expect(surfaceAccepts(surface, classifyRecipient(record))).toBe(true);
    });

    it('recognises its own records again', () => {
      if (corridor.method === PaymentMethodCode.Crypto) {
        expect(classifyRecipient(record)).toBe('crypto');
        return;
      }

      expect(corridorOfRecipient(record)).toBe(corridor);
    });
  },
);

describe('which corridors can be saved', () => {
  it('offers the dollar every method, all of them saveable', () => {
    expect(beneficiaryCorridorsFor('USD').map((corridor) => corridor.method)).toEqual([
      PaymentMethodCode.Zelle,
      PaymentMethodCode.Ach,
      PaymentMethodCode.Swift,
    ]);
  });

  it('saves every form corridor, and never a scan corridor', () => {
    expect(savableCorridors().map(keyOf).sort()).toEqual(Object.keys(SAMPLES).sort());
  });

  it.each([
    ['USD', true],
    ['NGN', true],
    ['VND', false],
  ])('knows whether %s can be saved through a form', (code, expected) => {
    const currency = payoutCurrencies().find((candidate) => candidate.code === code);

    expect(currency === undefined ? undefined : isSaveableByForm(currency)).toBe(expected);
  });
});

describe('corridorOfRecipient', () => {
  const record = (fields: Partial<RecipientFields>): RecipientFields => ({
    ...BLANK_RECIPIENT_FIELDS,
    ...fields,
  });

  it('finds SWIFT by its payment method, wherever the bank is', () => {
    expect(corridorOfRecipient(record({ paymentMethod: 'SWIFT', bankCountry: 'ng' }))).toBe(
      spec('USD', PaymentMethodCode.Swift),
    );
  });

  it.each([
    ['bank_transfer', 'NGN', PaymentMethodCode.BankTransfer],
    ['kes_mobile_money', 'KES', PaymentMethodCode.MobileMoney],
    ['mobile_money', 'XOF', PaymentMethodCode.MobileMoney],
    ['zelle_transfer', 'USD', PaymentMethodCode.Zelle],
  ])('finds the corridor a %s record was paid over', (rail, currency, method) => {
    expect(corridorOfRecipient(record({ paymentMethod: rail }))).toBe(spec(currency, method));
  });

  it('never resolves a Zelle rail to a corridor that only borrows it', () => {
    expect(corridorOfRecipient(record({ paymentMethod: 'zelle_transfer' }))?.method).toBe(
      PaymentMethodCode.Zelle,
    );
  });

  it('places a record by its bank country when nothing names a rail', () => {
    expect(corridorOfRecipient(record({ bankCountry: 'ng', bankCode: '058' }))).toBe(
      spec('NGN', PaymentMethodCode.BankTransfer),
    );
  });

  it('tells a Zelle record from the other dollar corridors by what it saved', () => {
    expect(corridorOfRecipient(record({ bankCountry: 'us', bankName: 'Zelle' }))).toBe(
      spec('USD', PaymentMethodCode.Zelle),
    );
  });

  it.each([
    ['an American bank with no rail', record({ bankCountry: 'us', bankName: 'Chase' })],
    ['a country no form pays', record({ bankCountry: 'ph', bankName: 'BDO' })],
    ['a country with no currency here', record({ bankCountry: 'gb', bankName: 'Barclays' })],
    ['a wire transfer', record({ paymentMethod: 'WIRE', bankCountry: 'us' })],
    ['nothing at all', record({})],
  ])('places nothing it cannot be sure of: %s', (_case, fields) => {
    expect(corridorOfRecipient(fields)).toBeUndefined();
  });

  it('reads the payment method and the country whatever their case', () => {
    expect(corridorOfRecipient(record({ paymentMethod: 'swift' }))?.method).toBe(
      PaymentMethodCode.Swift,
    );
    expect(corridorOfRecipient(record({ bankCountry: 'NG' }))?.currency).toBe('NGN');
  });
});

describe('what the details screen shows', () => {
  const detailsOf = (key: string) => {
    const [currency = '', method = ''] = key.split(':');
    const corridor = spec(currency, method as PaymentMethodCode);

    return corridor.beneficiary?.details(recipientFor(corridor, SAMPLES[key] ?? {}, labelOf));
  };

  it('shows a Nigerian account by its bank and number', () => {
    expect(detailsOf('NGN:bank_transfer')).toEqual([
      { labelKey: 'common.bankName', value: 'Guaranty Trust Bank' },
      { labelKey: 'common.accountNumber', value: '0123456789' },
    ]);
  });

  it('shows a mobile-money wallet by its provider and number', () => {
    expect(detailsOf('KES:mobile_money')).toEqual([
      { labelKey: 'spend.mobileMoneyProvider', value: 'M-Pesa' },
      { labelKey: 'spend.phoneNumber', value: '+254712345678' },
    ]);
  });

  it('names a Zelle category in words', () => {
    expect(detailsOf('USD:zelle')).toEqual([
      { labelKey: 'spend.beneficiaryCategory', valueKey: 'spend.categoryBusiness' },
      { labelKey: 'spend.zelleId', value: 'precious.james@mail.com' },
    ]);
  });

  it("shows SWIFT's code and the beneficiary's address on one line", () => {
    expect(detailsOf('USD:swift')).toEqual([
      { labelKey: 'common.bankName', value: 'Citi bank' },
      { labelKey: 'common.accountNumber', value: '031234567890' },
      { labelKey: 'spend.swiftCode', value: 'CITIGB2L' },
      {
        labelKey: 'spend.beneficiaries.address',
        value: '33 Canada Square, London, Greater London E14 5LB, United Kingdom',
      },
    ]);
  });

  it("shows ACH's account type and routing number, as the details design draws them", () => {
    expect(detailsOf('USD:ach')).toEqual([
      { labelKey: 'common.bankName', value: 'Chase' },
      { labelKey: 'common.accountNumber', value: '0123456789' },
      { labelKey: 'spend.accountType', valueKey: 'spend.accountTypeChecking' },
      { labelKey: 'spend.routingNumber', value: '021000021' },
      {
        labelKey: 'spend.beneficiaries.address',
        value: '270 Park Avenue, New York, NY 10017, United States',
      },
    ]);
  });

  it('names a wallet’s network rather than printing its code', () => {
    expect(detailsOf('USDC:crypto')).toEqual([
      { labelKey: 'spend.network', value: 'Base' },
      { labelKey: 'spend.walletAddress', value: '0xb249111111111111111111111111111111113901' },
    ]);
  });

  it('leaves out a row the record has nothing for', () => {
    const record = recipientFor(
      spec('USD', PaymentMethodCode.Swift),
      {
        ...SAMPLES['USD:swift'],
        swiftCode: '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      labelOf,
    );

    expect(
      spec('USD', PaymentMethodCode.Swift)
        .beneficiary?.details(record)
        .map((entry) => entry.labelKey),
    ).toEqual(['common.bankName', 'common.accountNumber']);
  });
});

describe('the wallet rule', () => {
  const validate = walletBeneficiaryCorridor().beneficiary?.validate;

  it('refuses an address that belongs to another network', () => {
    expect(
      validate?.({ network: 'SOL', walletAddress: '0xb249111111111111111111111111111111113901' }),
    ).toEqual({ field: 'walletAddress', messageKey: 'spend.addressWrongNetwork' });
  });

  it('accepts an address the network can hold', () => {
    expect(
      validate?.({ network: 'BASE', walletAddress: '0xb249111111111111111111111111111111113901' }),
    ).toBeUndefined();
  });

  it('says nothing while the address is empty', () => {
    expect(validate?.({ network: 'SOL', walletAddress: '' })).toBeUndefined();
  });
});

describe('corridorNamed', () => {
  it('finds a corridor by the strings a route carries', () => {
    expect(corridorNamed('USD', 'swift')).toBe(spec('USD', PaymentMethodCode.Swift));
  });

  it('finds nothing for a pair no corridor answers to', () => {
    expect(corridorNamed('GBP', 'swift')).toBeUndefined();
    expect(corridorNamed('USD', 'carrier_pigeon')).toBeUndefined();
  });
});
