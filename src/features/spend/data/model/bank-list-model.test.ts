import { bankListResponseSchema } from './bank-list-model';

describe('bankListResponseSchema', () => {
  it('reads the banks the endpoint records for Nigeria', () => {
    const parsed = bankListResponseSchema.parse({
      data: [
        {
          bank_code: '090832',
          bank_name: '5TT MFB',
          bank_url: 'https://example.test/small.png',
          bg_url: 'https://example.test/big.png',
        },
      ],
      error: false,
    });

    expect(parsed.data).toEqual([{ bank_code: '090832', bank_name: '5TT MFB' }]);
  });

  it('reads a bank that carries no code', () => {
    expect(bankListResponseSchema.parse({ data: [{ bank_name: 'ABSA' }] }).data).toEqual([
      { bank_code: '', bank_name: 'ABSA' },
    ]);
  });

  it.each([
    ['an empty response', {}],
    ['a null list', { data: null }],
    ['a row of nulls', { data: [{ bank_code: null, bank_name: null }] }],
  ])('survives %s', (_case, payload) => {
    expect(() => bankListResponseSchema.parse(payload)).not.toThrow();
  });

  it('answers an empty list when the payload has none', () => {
    expect(bankListResponseSchema.parse({}).data).toEqual([]);
  });
});
