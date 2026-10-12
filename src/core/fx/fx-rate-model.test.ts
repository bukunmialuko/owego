import { fxRateResponseSchema } from './fx-rate-model';

describe('fxRateResponseSchema', () => {
  it('reads the response the endpoint records', () => {
    expect(
      fxRateResponseSchema.parse({
        data: {
          source_currency: 'USD',
          destination_currency: 'NGN',
          rate: 1431.692,
          expire_at: '2026-02-10T18:47:34.182Z',
        },
      }).data,
    ).toEqual({
      source_currency: 'USD',
      destination_currency: 'NGN',
      rate: 1431.692,
      expire_at: '2026-02-10T18:47:34.182Z',
    });
  });

  it.each([
    ['an empty response', {}],
    ['an empty payload', { data: {} }],
    ['a null payload', { data: null }],
  ])('survives %s', (_case, payload) => {
    expect(() => fxRateResponseSchema.parse(payload)).not.toThrow();
  });

  it('defaults a missing rate to zero rather than to one', () => {
    expect(fxRateResponseSchema.parse({ data: {} }).data.rate).toBe(0);
  });

  it('refuses a rate that is not a number', () => {
    expect(() => fxRateResponseSchema.parse({ data: { rate: '1431.692' } })).toThrow();
  });
});
