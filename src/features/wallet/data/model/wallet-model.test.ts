import {
  walletChallengeResponseSchema,
  walletListResponseSchema,
  walletSchema,
} from './wallet-model';

describe('wallet models', () => {
  it('parses an empty wallet', () => {
    expect(walletSchema.parse({})).toEqual({
      id: '',
      address: '',
      blockchain: '',
      balances: [],
    });
  });

  it('parses an empty wallet list response', () => {
    expect(walletListResponseSchema.parse({})).toEqual({ data: [] });
  });

  it('treats a null wallet list the same as an empty one', () => {
    expect(walletListResponseSchema.parse({ data: null })).toEqual({ data: [] });
  });

  it('reads a wallet whose balances are null as holding none', () => {
    expect(walletSchema.parse({ id: 'w1', address: '0xabc', balances: null }).balances).toEqual([]);
  });

  it('reads null wallet text fields as blank', () => {
    expect(walletSchema.parse({ id: null, address: null, blockchain: null })).toEqual({
      id: '',
      address: '',
      blockchain: '',
      balances: [],
    });
  });

  it('reads null balance text fields as blank', () => {
    const [balance] = walletSchema.parse({
      balances: [{ name: null, symbol: null, token_address: null, token_id: null }],
    }).balances;

    expect(balance).toMatchObject({ name: '', symbol: '', token_address: '', token_id: '' });
  });

  it('reads a null amount as zero', () => {
    const [balance] = walletSchema.parse({ balances: [{ amount: null }] }).balances;

    expect(balance?.amount).toBe('0');
  });

  it('reads null decimals as zero', () => {
    const [balance] = walletSchema.parse({ balances: [{ decimals: null }] }).balances;

    expect(balance?.decimals).toBe(0);
  });

  it('reads a list response whose wallets carry nulls', () => {
    const parsed = walletListResponseSchema.parse({
      data: [{ id: 'w1', address: '0xabc', blockchain: 'SOL', balances: null }],
    });

    expect(parsed.data).toEqual([{ id: 'w1', address: '0xabc', blockchain: 'SOL', balances: [] }]);
  });

  it('reads a challenge whose data is null as blank', () => {
    expect(walletChallengeResponseSchema.parse({ data: null })).toEqual({
      data: { challenge_id: '', user_token: '', encryption_key: '' },
    });
  });

  it('reads null challenge fields as blank', () => {
    const parsed = walletChallengeResponseSchema.parse({
      data: { challenge_id: null, user_token: null, encryption_key: null },
    });

    expect(parsed.data).toEqual({ challenge_id: '', user_token: '', encryption_key: '' });
  });

  it('parses an empty challenge response', () => {
    expect(walletChallengeResponseSchema.parse({})).toEqual({
      data: { challenge_id: '', user_token: '', encryption_key: '' },
    });
  });

  it('reads the challenge in snake_case', () => {
    const parsed = walletChallengeResponseSchema.parse({
      data: { challenge_id: 'c1', user_token: 'u1', encryption_key: 'k1' },
    });

    expect(parsed.data).toEqual({ challenge_id: 'c1', user_token: 'u1', encryption_key: 'k1' });
  });

  it('ignores camelCase keys, which the api does not send', () => {
    const parsed = walletChallengeResponseSchema.parse({
      data: { challengeId: 'c1', userToken: 'u1', encryptionKey: 'k1' },
    });

    expect(parsed.data.challenge_id).toBe('');
  });
});
