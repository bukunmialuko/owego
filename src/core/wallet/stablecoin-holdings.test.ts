import { stablecoinHoldings } from './stablecoin-holdings';
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

describe('stablecoinHoldings', () => {
  it('adds the same token across every wallet, to the micro-unit', () => {
    const wallets = [
      wallet([{ symbol: 'USDC', amount: '30.828566' }]),
      wallet([{ symbol: 'USDC', amount: '30.828566' }], 'wallet-2'),
    ];

    expect(stablecoinHoldings(wallets)).toEqual([{ symbol: 'USDC', amount: '61.657132' }]);
  });

  it('lists USDC before USDT whatever order the wallets hold them in', () => {
    const wallets = [
      wallet([
        { symbol: 'USDT', amount: '1' },
        { symbol: 'USDC', amount: '2' },
      ]),
    ];

    expect(stablecoinHoldings(wallets).map((holding) => holding.symbol)).toEqual(['USDC', 'USDT']);
  });

  it('leaves out a token the available balance does not count', () => {
    const wallets = [
      wallet([
        { symbol: 'USDC', amount: '2' },
        { symbol: 'SOL', amount: '9' },
      ]),
    ];

    expect(stablecoinHoldings(wallets)).toEqual([{ symbol: 'USDC', amount: '2' }]);
  });

  it('keeps a stablecoin the account holds none of', () => {
    expect(stablecoinHoldings([wallet([{ symbol: 'USDT', amount: '0' }])])).toEqual([
      { symbol: 'USDT', amount: '0' },
    ]);
  });

  it('has no row for a stablecoin no wallet carries', () => {
    expect(stablecoinHoldings([wallet([{ symbol: 'USDC', amount: '1' }])])).toEqual([
      { symbol: 'USDC', amount: '1' },
    ]);
  });

  it('reads an amount that is not a plain decimal as nothing', () => {
    expect(stablecoinHoldings([wallet([{ symbol: 'USDC', amount: 'abc' }])])).toEqual([
      { symbol: 'USDC', amount: '0' },
    ]);
  });
});
