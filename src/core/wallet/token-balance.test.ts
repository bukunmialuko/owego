import { tokenBalanceOf } from './token-balance';
import type { Wallet } from './wallet';

function walletHolding(amount: string, blockchain = 'SOL-DEVNET'): Wallet {
  return {
    id: `wallet-${blockchain}`,
    address: 'address',
    blockchain,
    balances: [{ tokenId: `usdc-${blockchain}`, symbol: 'USDC', amount, decimals: 6 }],
  };
}

describe('tokenBalanceOf', () => {
  it('floors a fractional balance so Max never exceeds what is held', () => {
    expect(tokenBalanceOf([walletHolding('5.136')], 'USDC')).toEqual({
      amountMinor: 513,
      currency: 'USD',
    });
  });

  it('sums each wallet’s floored holding', () => {
    expect(
      tokenBalanceOf(
        [walletHolding('5.139', 'SOL-DEVNET'), walletHolding('1.005', 'BASE-SEPOLIA')],
        'USDC',
      ),
    ).toEqual({ amountMinor: 613, currency: 'USD' });
  });

  it('reads a malformed amount as nothing rather than guessing', () => {
    expect(tokenBalanceOf([walletHolding('1e3')], 'USDC')).toEqual({
      amountMinor: 0,
      currency: 'USD',
    });
  });

  it('reports a token that is not held as undefined, not zero', () => {
    expect(tokenBalanceOf([walletHolding('5')], 'USDT')).toBeUndefined();
  });
});
