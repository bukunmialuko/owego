import { depositAddressSchema } from './receive-model';

describe('depositAddressSchema', () => {
  it('parses a complete payload', () => {
    const parsed = depositAddressSchema.parse({
      chain: 'BASE',
      address: '0xabc',
      status: 'ACTIVE',
    });

    expect(parsed).toEqual({ chain: 'BASE', address: '0xabc', status: 'ACTIVE' });
  });

  it('degrades a missing status to an empty string rather than throwing', () => {
    expect(depositAddressSchema.parse({})).toEqual({ chain: '', address: '', status: '' });
  });

  it('ignores a token list even if the backend sends one', () => {
    const parsed = depositAddressSchema.parse({
      chain: 'SOL',
      address: 'addr',
      status: 'ACTIVE',
      tokens: ['USDC', 'USDT'],
    });

    expect(parsed).not.toHaveProperty('tokens');
  });
});
