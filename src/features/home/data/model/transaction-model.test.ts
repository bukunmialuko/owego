import {
  transactionDetailResponseSchema,
  transactionListResponseSchema,
  transactionSchema,
} from './transaction-model';

describe('transactionListResponseSchema', () => {
  it('parses the real double-nested envelope', () => {
    const parsed = transactionListResponseSchema.parse({
      data: {
        data: [{ id: 't1', amount: 15, currency: 'USDC', status: 'SUCCESSFUL', type: 'CREDIT' }],
        total: 127,
        page: 1,
        limit: 5,
      },
      error: false,
    });

    expect(parsed.data.data).toHaveLength(1);
    expect(parsed.data.data[0]?.id).toBe('t1');
    expect(parsed.data.total).toBe(127);
  });

  it('degrades a missing envelope to an empty page rather than throwing', () => {
    expect(transactionListResponseSchema.parse({})).toEqual({
      data: { data: [], total: 0, page: 1, limit: 0 },
    });
  });
});

describe('transactionDetailResponseSchema', () => {
  it('parses the recorded envelope, whose meta_data is null', () => {
    const parsed = transactionDetailResponseSchema.parse({
      data: {
        id: '00000000-0000-4000-8000-000000000004',
        status: 'CREATED',
        type: 'INVOICE',
        amount: 100.23,
        usdc_amount: 0,
        currency: 'USDC',
        tx_hash: '',
        meta_data: null,
        created_at: '2025-07-22T23:45:47.692397+01:00',
      },
      error: false,
    });

    expect(parsed.data.id).toBe('00000000-0000-4000-8000-000000000004');
    expect(parsed.data.meta_data).toEqual(transactionSchema.parse({}).meta_data);
  });

  it('parses an empty body, like every model in this app', () => {
    expect(transactionDetailResponseSchema.parse({}).data.id).toBe('');
  });

  it('parses a null data', () => {
    expect(transactionDetailResponseSchema.parse({ data: null }).data.id).toBe('');
  });
});

describe('transactionSchema', () => {
  it('reads the recipient from bank_account_information', () => {
    const parsed = transactionSchema.parse({
      recipient: {
        id: '00000000-0000-4000-8000-000000000005',
        bank_account_information: {
          bank_country: 'NG',
          bank_name: 'PalmPay',
          bank_code: '100004',
          account_holder: 'JOHN DOE',
          account_number: '0000000001',
        },
        contact_information: { email: '' },
        meta_data: null,
      },
    });

    expect(parsed.recipient.bank_account_information).toEqual({
      bank_country: 'NG',
      bank_name: 'PalmPay',
      account_holder: 'JOHN DOE',
      account_number: '0000000001',
    });
  });

  it('treats a null recipient and null strings as blank', () => {
    const parsed = transactionSchema.parse({
      recipient: null,
      recipient_name: null,
      tx_hash: null,
      narration: null,
    });

    expect(parsed.recipient.bank_account_information.account_holder).toBe('');
    expect(parsed.recipient_name).toBe('');
    expect(parsed.tx_hash).toBe('');
    expect(parsed.narration).toBe('');
  });

  it('reads the meta_data keys v1 reads for fee and narration', () => {
    const parsed = transactionSchema.parse({
      meta_data: { narration: 'For goods and services', usdc_total_fee: 0.25 },
    });

    expect(parsed.meta_data.narration).toBe('For goods and services');
    expect(parsed.meta_data.usdc_total_fee).toBe(0.25);
  });

  it('defaults the fee to zero when meta_data carries none', () => {
    expect(
      transactionSchema.parse({ meta_data: { wallet_id: 'w1' } }).meta_data.usdc_total_fee,
    ).toBe(0);
  });
});

describe('transactionListResponseSchema with a null meta_data row', () => {
  it('keeps the page rather than failing it', () => {
    const parsed = transactionListResponseSchema.parse({
      data: { data: [{ id: 't1', meta_data: null }, { id: 't2' }], total: 2, page: 1, limit: 5 },
    });

    expect(parsed.data.data.map((row) => row.id)).toEqual(['t1', 't2']);
  });
});
