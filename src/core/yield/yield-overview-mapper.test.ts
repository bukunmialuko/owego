import { toYieldOverview } from './yield-overview-mapper';
import type { StakedVaultDto, YieldSummaryDto } from './yield-overview-model';

const SUMMARY: YieldSummaryDto = {
  total_staked_usdc: 150.8547,
  total_deposited_usdc: 150,
  total_profit_usdc: 0.8547,
  total_profit_percent: 0.57,
};

const VAULT: StakedVaultDto = {
  vault_address: '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D',
  token: 'USDC',
  token_id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  staked_usdc: 100.2547,
  deposited_usdc: 100,
  profit_usdc: 0.2547,
  profit_percent: 0.25,
  total_rate: 4.1,
};

function overviewOf(summary: YieldSummaryDto, products: StakedVaultDto[] = []) {
  return toYieldOverview({ summary, products });
}

describe('toYieldOverview', () => {
  it('reports the staked total, interest included, in dollars', () => {
    expect(overviewOf(SUMMARY)).toEqual({
      valueMinor: 15_085,
      currency: 'USD',
      change: { percent: 0.57, amountMinor: 85 },
      positions: [],
    });
  });

  it.each([
    [150.8547, 15_085],
    [100.29, 10_029],
    [5136.989, 513_698],
    [0.0099, 0],
    [0, 0],
  ])('reads %p USDC staked as %p cents, rounded down', (usdc, cents) => {
    expect(overviewOf({ ...SUMMARY, total_staked_usdc: usdc }).valueMinor).toBe(cents);
  });

  it.each([
    [0.8547, 85],
    [0.855, 86],
    [-4.1, -410],
  ])('reads a %p USDC return as %p cents, rounded to the nearest', (usdc, cents) => {
    expect(overviewOf({ ...SUMMARY, total_profit_usdc: usdc }).change?.amountMinor).toBe(cents);
  });

  it('keeps the sign of a loss', () => {
    expect(
      overviewOf({ ...SUMMARY, total_profit_usdc: -4.1, total_profit_percent: -1.2 }).change,
    ).toEqual({ percent: -1.2, amountMinor: -410 });
  });

  it('reports no change until a deposit is on record', () => {
    const overview = overviewOf({
      total_staked_usdc: 42.1,
      total_deposited_usdc: 0,
      total_profit_usdc: 0,
      total_profit_percent: 0,
    });

    expect(overview.valueMinor).toBe(4_210);
    expect(overview).not.toHaveProperty('change');
  });

  it('reports a flat return once a deposit is on record', () => {
    expect(
      overviewOf({ ...SUMMARY, total_profit_usdc: 0, total_profit_percent: 0 }).change,
    ).toEqual({ percent: 0, amountMinor: 0 });
  });

  it('reports each staked vault as a position, by the same rules', () => {
    expect(overviewOf(SUMMARY, [VAULT]).positions).toEqual([
      {
        id: '9BEcn9aPEmhSPbPQeFGjidRiEKki46fVQDyPpSQXPA2D',
        tokenSymbol: 'USDC',
        tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        valueMinor: 10_025,
        currency: 'USD',
        apyPercent: 4.1,
        contributedMinor: 10_000,
        change: { percent: 0.25, amountMinor: 25 },
      },
    ]);
  });

  it('leaves out a rate the vault did not report', () => {
    const [position] = overviewOf(SUMMARY, [{ ...VAULT, total_rate: undefined }]).positions;

    expect(position).not.toHaveProperty('apyPercent');
  });

  it('reports no return on a vault staked only from outside owego', () => {
    const [position] = overviewOf(SUMMARY, [
      { ...VAULT, deposited_usdc: 0, profit_usdc: 0, profit_percent: 0 },
    ]).positions;

    expect(position).not.toHaveProperty('change');
    expect(position).not.toHaveProperty('contributedMinor');
  });
});
