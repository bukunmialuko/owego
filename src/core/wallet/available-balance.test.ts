import { identityQuote } from '@/core/fx/convert';
import type { FxQuote } from '@/core/fx/fx-rate';
import { availableBalance } from './available-balance';
import type { TokenBalance, Wallet } from './wallet';

function wallet(balances: Array<Pick<TokenBalance, 'symbol' | 'amount'>>, id = 'wallet-1'): Wallet {
  return {
    id,
    address: 'address',
    blockchain: 'SOL-DEVNET',
    balances: balances.map((balance) => ({
      ...balance,
      tokenId: `${id}-${balance.symbol}`,
      decimals: 6,
    })),
  };
}

function usdTo(quoteCurrency: string, rate: number): FxQuote {
  return { baseCurrency: 'USD', quoteCurrency, rate };
}

const DOLLARS = identityQuote('USD');

describe('availableBalance', () => {
  it('rounds down to the cent rather than up', () => {
    expect(availableBalance([wallet([{ symbol: 'USDC', amount: '30.828566' }])], DOLLARS)).toEqual({
      amountMinor: 3082,
      currency: 'USD',
    });
  });

  it('adds USDC and USDT across every wallet', () => {
    const wallets = [
      wallet([
        { symbol: 'USDC', amount: '5136.98' },
        { symbol: 'USDT', amount: '100.02' },
      ]),
      wallet([{ symbol: 'USDC', amount: '0.5' }], 'wallet-2'),
    ];

    expect(availableBalance(wallets, DOLLARS)).toEqual({ amountMinor: 523750, currency: 'USD' });
  });

  it('adds the fractions before rounding down, so two half-cents still make a cent', () => {
    const wallets = [
      wallet([
        { symbol: 'USDC', amount: '0.005' },
        { symbol: 'USDT', amount: '0.005' },
      ]),
    ];

    expect(availableBalance(wallets, DOLLARS)).toEqual({ amountMinor: 1, currency: 'USD' });
  });

  it('counts only the dollar stablecoins', () => {
    const wallets = [
      wallet([
        { symbol: 'USDC', amount: '10' },
        { symbol: 'SOL', amount: '3' },
      ]),
    ];

    expect(availableBalance(wallets, DOLLARS)).toEqual({ amountMinor: 1000, currency: 'USD' });
  });

  it('reads an amount it cannot parse as nothing', () => {
    expect(availableBalance([wallet([{ symbol: 'USDC', amount: 'abc' }])], DOLLARS)).toEqual({
      amountMinor: 0,
      currency: 'USD',
    });
  });

  it('converts at the rate and rounds down to the kobo', () => {
    expect(
      availableBalance([wallet([{ symbol: 'USDC', amount: '30.828566' }])], usdTo('NGN', 1550.5)),
    ).toEqual({ amountMinor: 4779969, currency: 'NGN' });
  });

  it.each([
    ['VND', 25_400.7, 78_306_700],
    ['XOF', 601.3, 1_853_700],
  ])('rounds %p down to a whole unit, the smallest it has', (currency, rate, expected) => {
    expect(
      availableBalance([wallet([{ symbol: 'USDC', amount: '30.828566' }])], usdTo(currency, rate)),
    ).toEqual({ amountMinor: expected, currency });
  });

  it('does not lose a cent to floating-point error', () => {
    expect(
      availableBalance([wallet([{ symbol: 'USDC', amount: '0.2' }])], usdTo('BRL', 1.15)),
    ).toEqual({ amountMinor: 23, currency: 'BRL' });
  });

  it('has no answer in a currency it cannot format', () => {
    expect(
      availableBalance([wallet([{ symbol: 'USDC', amount: '1' }])], usdTo('ZZZ', 2)),
    ).toBeUndefined();
  });
});
