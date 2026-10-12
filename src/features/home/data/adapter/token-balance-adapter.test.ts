import { ok } from '@/core/result/result';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import { createTokenBalanceAdapter } from './token-balance-adapter';

function adapterOver(wallets: Wallet[]) {
  const walletBalancePort: WalletBalancePort = { listWallets: () => Promise.resolve(ok(wallets)) };

  return createTokenBalanceAdapter(walletBalancePort);
}

function walletHolding(amount: string, blockchain = 'SOL-DEVNET'): Wallet {
  return {
    id: `wallet-${blockchain}`,
    address: 'address',
    blockchain,
    balances: [{ tokenId: `usdc-${blockchain}`, symbol: 'USDC', amount, decimals: 6 }],
  };
}

describe('token balance adapter', () => {
  it('answers with the token summed across the account’s wallets', async () => {
    const result = await adapterOver([
      walletHolding('5.139', 'SOL-DEVNET'),
      walletHolding('1.005', 'BASE-SEPOLIA'),
    ]).getBalance('USDC');

    expect(result).toEqual(ok({ amountMinor: 613, currency: 'USD' }));
  });

  it('reports a token that is not held as undefined, not zero', async () => {
    const result = await adapterOver([walletHolding('5')]).getBalance('USDT');

    expect(result).toEqual(ok(undefined));
  });
});
