import { depositTokenFor, depositTokensFor, primaryDepositToken } from './deposit-token';

describe('depositTokensFor', () => {
  it("offers only USDC on devnet, at Circle's devnet mint", () => {
    expect(depositTokensFor('devnet')).toEqual([
      { symbol: 'USDC', mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', decimals: 6 },
    ]);
  });

  it('offers USDC and USDT on mainnet, at their mainnet mints', () => {
    expect(depositTokensFor('mainnet-beta')).toEqual([
      { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
      { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
    ]);
  });
});

describe('depositTokenFor', () => {
  it("finds a token on the build's cluster", () => {
    expect(depositTokenFor('mainnet-beta', 'USDT')?.mint).toBe(
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    );
  });

  it('has no USDT on devnet, so a devnet build can never ask for one', () => {
    expect(depositTokenFor('devnet', 'USDT')).toBeUndefined();
  });
});

describe('primaryDepositToken', () => {
  it.each(['devnet', 'mainnet-beta'] as const)('opens on USDC on %s', (cluster) => {
    expect(primaryDepositToken(cluster).symbol).toBe('USDC');
  });
});
