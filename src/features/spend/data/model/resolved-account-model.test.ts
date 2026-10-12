import { resolvedAccountResponseSchema } from './resolved-account-model';

describe('resolvedAccountResponseSchema', () => {
  it('reads the holder the endpoint records', () => {
    const parsed = resolvedAccountResponseSchema.parse({
      data: { account_number: '0000000001', account_name: 'JOHN DOE' },
      error: false,
    });

    expect(parsed.data).toEqual({
      account_number: '0000000001',
      account_name: 'JOHN DOE',
    });
  });

  it.each([
    ['an empty response', {}],
    ['a null payload', { data: null }],
    ['null fields', { data: { account_number: null, account_name: null } }],
  ])('survives %s, answering blanks', (_case, payload) => {
    expect(resolvedAccountResponseSchema.parse(payload).data).toEqual({
      account_number: '',
      account_name: '',
    });
  });
});
