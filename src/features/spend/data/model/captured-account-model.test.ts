import { capturedAccountResponseSchema } from './captured-account-model';

describe('capturedAccountResponseSchema', () => {
  it('reads the response the endpoint records', () => {
    const parsed = capturedAccountResponseSchema.parse({
      data: {
        account_number: '1000000000',
        bank_name: 'Opay',
        bank_code: '100004',
        account_name: 'John Doe',
        is_verified: true,
      },
    });

    expect(parsed.data).toEqual({
      account_number: '1000000000',
      bank_name: 'Opay',
      bank_code: '100004',
      account_name: 'John Doe',
      is_verified: true,
    });
  });

  it.each([
    ['an empty response', {}],
    ['an empty payload', { data: {} }],
    ['a null payload', { data: null }],
  ])('survives %s', (_case, payload) => {
    expect(() => capturedAccountResponseSchema.parse(payload)).not.toThrow();
  });

  it('defaults every field of a payload it could not read', () => {
    expect(capturedAccountResponseSchema.parse({ data: {} }).data).toEqual({
      account_number: '',
      bank_name: '',
      bank_code: '',
      account_name: '',
      is_verified: false,
    });
  });

  it('treats an unverified account as unverified rather than assuming', () => {
    expect(capturedAccountResponseSchema.parse({}).data.is_verified).toBe(false);
  });
});
