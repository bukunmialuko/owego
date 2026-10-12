import type { Wallet } from '@/core/wallet/wallet';
import { findFundingWallet } from './funding-wallet';

const BASE_WALLET: Wallet = {
  id: 'base-wallet',
  address: '0xb249111111111111111111111111111111113901',
  blockchain: 'BASE-SEPOLIA',
  balances: [{ tokenId: 'usdc-base', symbol: 'USDC', amount: '900', decimals: 6 }],
};

const SOLANA_WALLET: Wallet = {
  id: 'sol-wallet',
  address: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
  blockchain: 'SOL-DEVNET',
  balances: [
    { tokenId: 'usdc-sol', symbol: 'USDC', amount: '5136.98', decimals: 6 },
    { tokenId: 'usdt-sol', symbol: 'USDT', amount: '12.5', decimals: 6 },
  ],
};

describe('findFundingWallet', () => {
  it('pays from the wallet holding the most of the token, not the first wallet', () => {
    expect(findFundingWallet([BASE_WALLET, SOLANA_WALLET], 'USDC')).toEqual({
      walletId: 'sol-wallet',
      walletAddress: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
      tokenId: 'usdc-sol',
    });
  });

  it("takes that token row's own id", () => {
    expect(findFundingWallet([BASE_WALLET, SOLANA_WALLET], 'USDT')?.tokenId).toBe('usdt-sol');
  });

  it('answers nothing when no wallet holds the token', () => {
    expect(findFundingWallet([BASE_WALLET], 'USDT')).toBeUndefined();
  });

  describe('passes over a wallet it could not name in a payment', () => {
    it.each([
      ['a blank wallet id', { ...SOLANA_WALLET, id: '' }],
      ['a blank address', { ...SOLANA_WALLET, address: '' }],
      [
        'a blank token id',
        {
          ...SOLANA_WALLET,
          balances: [{ tokenId: '', symbol: 'USDC', amount: '5136.98', decimals: 6 }],
        },
      ],
    ])('%s', (_case, unusable: Wallet) => {
      expect(findFundingWallet([unusable, BASE_WALLET], 'USDC')?.walletId).toBe('base-wallet');
    });
  });

  it('passes over a balance it cannot read rather than guessing at it', () => {
    const unreadable: Wallet = {
      ...SOLANA_WALLET,
      balances: [{ tokenId: 'usdc-sol', symbol: 'USDC', amount: 'lots', decimals: 6 }],
    };

    expect(findFundingWallet([unreadable, BASE_WALLET], 'USDC')?.walletId).toBe('base-wallet');
  });
});
