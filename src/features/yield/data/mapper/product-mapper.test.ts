import { toProducts } from './product-mapper';

describe('toProducts', () => {
  it('lists every vault of every token as a product', () => {
    expect(
      toProducts([
        {
          address: 'usdc-mint',
          symbol: 'USDC',
          vaults: [{ address: 'vault-usdc', totalRate: 4.1, stakeable: true }],
        },
        {
          address: 'usdt-mint',
          symbol: 'USDT',
          vaults: [{ address: 'vault-usdt', totalRate: undefined, stakeable: false }],
        },
      ]),
    ).toEqual([
      {
        id: 'vault-usdc',
        tokenSymbol: 'USDC',
        tokenMint: 'usdc-mint',
        apyPercent: 4.1,
        provider: 'jupiter',
        isStakeable: true,
      },
      {
        id: 'vault-usdt',
        tokenSymbol: 'USDT',
        tokenMint: 'usdt-mint',
        provider: 'jupiter',
        isStakeable: false,
      },
    ]);
  });

  it('lists nothing for a token with no vaults', () => {
    expect(toProducts([{ address: 'm', symbol: 'SOL', vaults: [] }])).toEqual([]);
  });
});
