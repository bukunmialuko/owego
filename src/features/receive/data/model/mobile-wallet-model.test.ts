import {
  authorizationResultSchema,
  signAndSendResultSchema,
  walletErrorSchema,
} from './mobile-wallet-model';

describe('mobile wallet models', () => {
  it("reads a wallet's authorisation: its first account and the token", () => {
    expect(
      authorizationResultSchema.parse({
        accounts: [{ address: 'AAAA', label: 'Main', chains: ['solana:devnet'] }],
        auth_token: 'token',
        wallet_uri_base: 'https://wallet.example',
      }),
    ).toEqual({ accounts: [{ address: 'AAAA' }], auth_token: 'token' });
  });

  it.each([
    ['no accounts', { accounts: [], auth_token: 'token' }],
    ['no token', { accounts: [{ address: 'AAAA' }], auth_token: '' }],
    ['nothing at all', {}],
  ])('refuses an authorisation with %s', (_, payload) => {
    expect(authorizationResultSchema.safeParse(payload).success).toBe(false);
  });

  it('reads the signatures a wallet sends back', () => {
    expect(signAndSendResultSchema.parse({ signatures: ['c2ln'] })).toEqual({
      signatures: ['c2ln'],
    });
  });

  it('reads the code off either kind of adapter error', () => {
    expect(walletErrorSchema.parse({ code: 'ERROR_WALLET_NOT_FOUND', message: 'x' })).toEqual({
      code: 'ERROR_WALLET_NOT_FOUND',
    });
    expect(walletErrorSchema.parse({ code: -3, jsonRpcMessageId: 0 })).toEqual({ code: -3 });
  });

  it('finds no code on an error that carries none', () => {
    expect(walletErrorSchema.safeParse(new Error('boom')).success).toBe(false);
  });
});
