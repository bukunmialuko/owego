import { yieldOverviewResponseSchema } from './yield-overview-model';

const DOCUMENTED_EXAMPLE = {
  error: false,
  data: {
    summary: {
      total_staked_usdc: 150.8547,
      total_deposited_usdc: 150.0,
      total_profit_usdc: 0.8547,
      total_profit_percent: 0.57,
      vault_count: 2,
    },
    products: [
      {
        vault_address: '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D',
        vault_symbol: 'jlUSDC',
        token: 'USDC',
        token_id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
        shares: '94052500',
        staked_usdc: 100.2547,
        deposited_usdc: 100.0,
        profit_usdc: 0.2547,
        profit_percent: 0.25,
        supply_rate: 3.76,
        rewards_rate: 0.34,
        total_rate: 4.1,
      },
    ],
  },
};

describe('yieldOverviewResponseSchema', () => {
  it('reads the summary the endpoint documents', () => {
    expect(yieldOverviewResponseSchema.parse(DOCUMENTED_EXAMPLE).data.summary).toEqual({
      total_staked_usdc: 150.8547,
      total_deposited_usdc: 150,
      total_profit_usdc: 0.8547,
      total_profit_percent: 0.57,
    });
  });

  it('reads each staked vault, keeping only what a position shows', () => {
    expect(yieldOverviewResponseSchema.parse(DOCUMENTED_EXAMPLE).data.products).toEqual([
      {
        vault_address: '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D',
        token: 'USDC',
        token_id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        staked_usdc: 100.2547,
        deposited_usdc: 100,
        profit_usdc: 0.2547,
        profit_percent: 0.25,
        total_rate: 4.1,
      },
    ]);
  });

  it('reads a vault with no rate as having none', () => {
    const [vault] = yieldOverviewResponseSchema.parse({
      data: { summary: {}, products: [{ vault_address: 'v' }] },
    }).data.products;

    expect(vault?.total_rate).toBeUndefined();
  });

  it('parses an empty payload, with no summary and no vaults', () => {
    expect(yieldOverviewResponseSchema.parse({})).toEqual({
      data: { summary: null, products: [] },
    });
  });

  it('reads a null envelope as one with no summary', () => {
    expect(yieldOverviewResponseSchema.parse({ data: null })).toEqual({
      data: { summary: null, products: [] },
    });
  });

  it('reads a missing total as zero, the backend’s own zero value', () => {
    expect(
      yieldOverviewResponseSchema.parse({ data: { summary: { total_staked_usdc: 12.5 } } }).data
        .summary,
    ).toEqual({
      total_staked_usdc: 12.5,
      total_deposited_usdc: 0,
      total_profit_usdc: 0,
      total_profit_percent: 0,
    });
  });

  it('rejects a total sent as a string', () => {
    expect(
      yieldOverviewResponseSchema.safeParse({ data: { summary: { total_staked_usdc: '150.85' } } })
        .success,
    ).toBe(false);
  });
});
