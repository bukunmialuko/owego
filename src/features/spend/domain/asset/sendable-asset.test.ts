import type { Wallet } from '@/core/wallet/wallet';
import { findSendableAsset, sendableBalanceMinor, sendableOptions } from './sendable-asset';

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
    { tokenId: 'sol-native', symbol: 'SOL', amount: '2', decimals: 9 },
    { tokenId: 'usdc-sol', symbol: 'USDC', amount: '5136.98', decimals: 6 },
    { tokenId: 'usdt-sol', symbol: 'USDT', amount: '12.5', decimals: 6 },
  ],
};

describe('findSendableAsset', () => {
  it('picks the wallet on the chosen network, not the first wallet', () => {
    const asset = findSendableAsset([BASE_WALLET, SOLANA_WALLET], 'SOL', 'USDC');

    expect(asset).toEqual({
      walletId: 'sol-wallet',
      tokenId: 'usdc-sol',
      symbol: 'USDC',
      amount: '5136.98',
    });
  });

  it("takes the token row's own id for USDT", () => {
    const asset = findSendableAsset([BASE_WALLET, SOLANA_WALLET], 'SOL', 'USDT');

    expect(asset).toEqual({
      walletId: 'sol-wallet',
      tokenId: 'usdt-sol',
      symbol: 'USDT',
      amount: '12.5',
    });
  });

  it('is undefined when the wallet holds no row for the token', () => {
    const usdcOnly: Wallet = {
      ...SOLANA_WALLET,
      balances: SOLANA_WALLET.balances.filter((balance) => balance.symbol !== 'USDT'),
    };

    expect(findSendableAsset([usdcOnly], 'SOL', 'USDT')).toBeUndefined();
  });

  it('is undefined when no wallet is on the network', () => {
    expect(findSendableAsset([BASE_WALLET], 'SOL', 'USDC')).toBeUndefined();
  });

  it('is undefined for an account with no wallets', () => {
    expect(findSendableAsset([], 'SOL', 'USDC')).toBeUndefined();
  });

  it('refuses a wallet with a blank id', () => {
    expect(findSendableAsset([{ ...SOLANA_WALLET, id: '' }], 'SOL', 'USDC')).toBeUndefined();
  });

  it('refuses a token row with a blank id', () => {
    const blankToken: Wallet = {
      ...SOLANA_WALLET,
      balances: [{ tokenId: '', symbol: 'USDC', amount: '5', decimals: 6 }],
    };

    expect(findSendableAsset([blankToken], 'SOL', 'USDC')).toBeUndefined();
  });
});

describe('sendableBalanceMinor', () => {
  it('is the Solana row floored to the cent, not the token summed across wallets', () => {
    expect(sendableBalanceMinor([BASE_WALLET, SOLANA_WALLET], 'SOL', 'USDC')).toBe(513_698);
  });

  it('floors a balance with more places than a cent', () => {
    const fractional: Wallet = {
      ...SOLANA_WALLET,
      balances: [{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '5.136', decimals: 6 }],
    };

    expect(sendableBalanceMinor([fractional], 'SOL', 'USDC')).toBe(513);
  });

  it('is undefined when the wallet holds no row for the token', () => {
    expect(sendableBalanceMinor([BASE_WALLET], 'SOL', 'USDC')).toBeUndefined();
  });

  it('is undefined for an amount that is not a plain decimal, rather than a guess', () => {
    const malformed: Wallet = {
      ...SOLANA_WALLET,
      balances: [{ tokenId: 'usdc-sol', symbol: 'USDC', amount: '1e3', decimals: 6 }],
    };

    expect(sendableBalanceMinor([malformed], 'SOL', 'USDC')).toBeUndefined();
  });
});

describe('sendableOptions', () => {
  it('lists each stablecoin the send-network wallet holds, with its spendable balance', () => {
    expect(sendableOptions([BASE_WALLET, SOLANA_WALLET], 'SOL')).toEqual([
      { symbol: 'USDC', balanceMinor: 513_698 },
      { symbol: 'USDT', balanceMinor: 1_250 },
    ]);
  });

  it('leaves out a token the wallet holds no row for', () => {
    const usdcOnly: Wallet = {
      ...SOLANA_WALLET,
      balances: SOLANA_WALLET.balances.filter((balance) => balance.symbol !== 'USDT'),
    };

    expect(sendableOptions([usdcOnly], 'SOL')).toEqual([{ symbol: 'USDC', balanceMinor: 513_698 }]);
  });

  it('keeps an empty row, listed at zero', () => {
    const emptyUsdt: Wallet = {
      ...SOLANA_WALLET,
      balances: [{ tokenId: 'usdt-sol', symbol: 'USDT', amount: '0', decimals: 6 }],
    };

    expect(sendableOptions([emptyUsdt], 'SOL')).toEqual([{ symbol: 'USDT', balanceMinor: 0 }]);
  });

  it('never offers native SOL, which pays for gas and is not sent', () => {
    expect(sendableOptions([SOLANA_WALLET], 'SOL').map((option) => option.symbol)).not.toContain(
      'SOL',
    );
  });

  it('ignores stablecoins held on another chain', () => {
    expect(sendableOptions([BASE_WALLET], 'SOL')).toEqual([]);
  });

  it('leaves out a row no payment could be built from', () => {
    const unpayable: Wallet = {
      ...SOLANA_WALLET,
      balances: [
        { tokenId: '', symbol: 'USDC', amount: '5', decimals: 6 },
        { tokenId: 'usdt-sol', symbol: 'USDT', amount: '1e3', decimals: 6 },
      ],
    };

    expect(sendableOptions([unpayable], 'SOL')).toEqual([]);
  });
});
