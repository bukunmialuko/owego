import { formatTokenAmount } from './format-token-amount';

describe('formatTokenAmount', () => {
  it.each([
    ['30.828566', 'USDC', '30.82 USDC'],
    ['5136.98', 'USDC', '5,136.98 USDC'],
    ['0', 'USDT', '0.00 USDT'],
    ['12.5', 'USDT', '12.50 USDT'],
  ])('shows %p %s as %p, never rounded up', (amount, symbol, expected) => {
    expect(formatTokenAmount(amount, symbol, 'en')).toBe(expected);
  });

  it('shows an amount it cannot read as nothing rather than a guess', () => {
    expect(formatTokenAmount('abc', 'USDC', 'en')).toBe('0.00 USDC');
  });

  it('groups digits the way the locale does', () => {
    expect(formatTokenAmount('5136.98', 'USDC', 'de')).toBe('5.136,98 USDC');
  });
});
