import { resolveFundingToken, type FundingOption } from './funding-token';

const USDC: FundingOption = { symbol: 'USDC', balanceMinor: 513_698 };
const USDT: FundingOption = { symbol: 'USDT', balanceMinor: 1_250 };

describe('resolveFundingToken', () => {
  it('keeps the chosen token while the account still holds it', () => {
    expect(resolveFundingToken([USDC, USDT], 'USDT')).toBe('USDT');
  });

  it('falls back to USDC when the chosen token is not held', () => {
    expect(resolveFundingToken([USDC], 'USDT')).toBe('USDC');
  });

  it('opens on USDC when nothing has been chosen yet', () => {
    expect(resolveFundingToken([USDT, USDC])).toBe('USDC');
  });

  it('opens on the only held token when the account has no USDC', () => {
    expect(resolveFundingToken([USDT])).toBe('USDT');
  });

  it('keeps an empty wallet the user chose, since zero is still a wallet they hold', () => {
    expect(resolveFundingToken([USDC, { symbol: 'USDT', balanceMinor: 0 }], 'USDT')).toBe('USDT');
  });

  it('ignores a chosen symbol this flow does not send', () => {
    expect(resolveFundingToken([USDT], 'SOL')).toBe('USDT');
  });

  it('is undefined when the account holds neither token', () => {
    expect(resolveFundingToken([], 'USDC')).toBeUndefined();
  });
});
