import {
  recipientPageResponseSchema,
  recipientResponseSchema,
  removeRecipientResponseSchema,
} from './recipient-model';

const CREATED = {
  id: '00000000-0000-4000-8000-000000000009',
  user_id: '00000000-0000-4000-8000-000000000008',
  bank_account_information: {
    bank_country: 'SA',
    bank_name: 'ACCESS BANK',
    account_holder: 'John Doe',
    swift_number: 'ABNGNGLAXXX',
    account_number: '0123456789',
  },
  contact_information: {
    contact_country: 'NG',
    state: 'Lagos',
    city: 'Lekki',
    address: '1 Example Street',
    zip_code: '100001',
    email: 'johndoe@gmail.com',
  },
  meta_data: { orange_merchant: '00000000-0000-4000-8000-000000000006' },
  created_at: '2025-08-14T03:10:14.577176+01:00',
  updated_at: '2025-08-14T03:10:14.577176+01:00',
};

describe('recipientResponseSchema', () => {
  it('reads a recipient the way the reference records it', () => {
    expect(recipientResponseSchema.parse({ data: CREATED, error: false }).data).toEqual({
      id: '00000000-0000-4000-8000-000000000009',
      bank_account_information: {
        bank_country: 'SA',
        bank_name: 'ACCESS BANK',
        bank_code: '',
        account_holder: 'John Doe',
        swift_number: 'ABNGNGLAXXX',
        account_number: '0123456789',
        payment_method: '',
        account_type: '',
      },
      contact_information: {
        contact_country: 'NG',
        state: 'Lagos',
        city: 'Lekki',
        address: '1 Example Street',
        zip_code: '100001',
        email: 'johndoe@gmail.com',
      },
      beneficiary_type: '',
      meta_data: '',
      created_at: '2025-08-14T03:10:14.577176+01:00',
      updated_at: '2025-08-14T03:10:14.577176+01:00',
    });
  });

  it('reads the account type an ACH record carries', () => {
    const parsed = recipientResponseSchema.parse({
      data: { bank_account_information: { account_type: 'CHECKING', payment_method: 'ACH' } },
    });

    expect(parsed.data.bank_account_information.account_type).toBe('CHECKING');
  });

  it('reads a holder that arrives as a boolean as no name at all', () => {
    const parsed = recipientResponseSchema.parse({
      data: { ...CREATED, bank_account_information: { account_holder: true } },
    });

    expect(parsed.data.bank_account_information.account_holder).toBe('');
  });

  it('reads a numeric id as the string every path segment needs', () => {
    expect(recipientResponseSchema.parse({ data: { id: 42 } }).data.id).toBe('42');
  });

  it.each([
    ['an empty response', {}],
    ['a null record', { data: null }],
    ['null blocks', { data: { bank_account_information: null, contact_information: null } }],
    ['null fields', { data: { id: null, bank_account_information: { bank_name: null } } }],
  ])('survives %s', (_case, payload) => {
    expect(() => recipientResponseSchema.parse(payload)).not.toThrow();
  });
});

describe('recipientPageResponseSchema', () => {
  it('reads the cursor v1 pages on', () => {
    const parsed = recipientPageResponseSchema.parse({
      status: 200,
      message: 'ok',
      data: [CREATED],
      meta: { next: '', previous: '', count: 1, page_size: 20 },
    });

    expect(parsed.data).toHaveLength(1);
    expect(parsed.meta?.next).toBe('');
  });

  it('reads the reference envelope, which has no cursor', () => {
    const parsed = recipientPageResponseSchema.parse({ data: [CREATED], error: false });

    expect(parsed.data).toHaveLength(1);
    expect(parsed.meta).toBeUndefined();
  });

  it('answers no rows when there are none', () => {
    expect(recipientPageResponseSchema.parse({ data: null }).data).toEqual([]);
    expect(recipientPageResponseSchema.parse({}).data).toEqual([]);
  });

  it('refuses rows that are not records', () => {
    expect(recipientPageResponseSchema.safeParse({ data: 'recipients' }).success).toBe(false);
  });
});

describe('removeRecipientResponseSchema', () => {
  it('reads the flag the reference answers a removal with', () => {
    expect(removeRecipientResponseSchema.parse({ error: false }).error).toBe(false);
  });

  it('survives an empty body', () => {
    expect(removeRecipientResponseSchema.parse({}).error).toBe(false);
  });
});
