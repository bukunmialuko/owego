import { NATIVE_SOLANA_CHAIN } from './receive-entity';

describe('NATIVE_SOLANA_CHAIN', () => {
  it('is Solana, native, and enabled', () => {
    expect(NATIVE_SOLANA_CHAIN.code).toBe('SOL');
    expect(NATIVE_SOLANA_CHAIN.name).toBe('Solana');
    expect(NATIVE_SOLANA_CHAIN.isNative).toBe(true);
    expect(NATIVE_SOLANA_CHAIN.isEnabled).toBe(true);
  });

  it('accepts both USDC and USDT, unlike a bridged chain', () => {
    expect(NATIVE_SOLANA_CHAIN.supportedTokens).toEqual(['USDC', 'USDT']);
  });
});
