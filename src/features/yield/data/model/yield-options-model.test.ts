import { yieldOptionsResponseSchema } from './yield-options-model';

const DOCUMENTED_EXAMPLE = {
  error: false,
  data: [
    {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      balance: '77.90459',
      decimals: 6,
      symbol: 'USDC',
      vaults: [
        {
          address: '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D',
          name: 'jupiter  lend USDC',
          symbol: 'jlUSDC',
          uiSymbol: 'jlUSDC',
          supplyRate: 3.76,
          rewardsRate: 0.34,
          totalRate: 4.1,
          stakeable: true,
          totalAssets: '527521064984286',
        },
      ],
    },
  ],
};

describe('yieldOptionsResponseSchema', () => {
  it('reads each token, its mint, and the vaults that take it', () => {
    expect(yieldOptionsResponseSchema.parse(DOCUMENTED_EXAMPLE).data).toEqual([
      {
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        symbol: 'USDC',
        vaults: [
          {
            address: '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D',
            totalRate: 4.1,
            stakeable: true,
          },
        ],
      },
    ]);
  });

  it('parses an empty payload as no products', () => {
    expect(yieldOptionsResponseSchema.parse({})).toEqual({ data: [] });
  });

  it('reads a vault with no stakeable flag as not stakeable', () => {
    const [token] = yieldOptionsResponseSchema.parse({
      data: [{ symbol: 'USDT', vaults: [{ address: 'vault-usdt', totalRate: 3.77 }] }],
    }).data;

    expect(token?.vaults[0]?.stakeable).toBe(false);
  });

  it('reads a vault with no rate as having none', () => {
    const [token] = yieldOptionsResponseSchema.parse({
      data: [{ symbol: 'USDC', vaults: [{ address: 'v' }] }],
    }).data;

    expect(token?.vaults[0]?.totalRate).toBeUndefined();
  });
});
