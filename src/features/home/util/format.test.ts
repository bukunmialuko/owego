import { formatAmountMinor, formatRateFigure, splitAmount } from './format';

describe('formatAmountMinor', () => {
  it('formats minor units in the transaction currency', () => {
    expect(formatAmountMinor(5000, 'USD', 'en-US')).toBe('$50.00');
  });

  it('falls back to dollars for an unsupported currency', () => {
    expect(formatAmountMinor(5000, 'ZWL', 'en-US')).toBe('$50.00');
  });
});

describe('splitAmount', () => {
  it('splits the cents off so they can be set a tier down', () => {
    expect(splitAmount('$5,136.98')).toEqual({ major: '$5,136', minor: '.98' });
  });

  it('handles a locale that separates with a comma', () => {
    expect(splitAmount('5.136,98 €')).toEqual({ major: '5.136', minor: ',98 €' });
  });

  it('leaves a whole amount alone', () => {
    expect(splitAmount('¥5136')).toEqual({ major: '¥5136', minor: '' });
  });
});

describe('formatRateFigure', () => {
  it('drops zero cents so the rate line reads as one', () => {
    expect(formatRateFigure(1, 'USD', 'en-US')).toBe('$1');
  });

  it.each([
    [1550.5, 'NGN', '₦1,550.50'],
    [129.25, 'KES', 'KSh\u00a0129.25'],
  ])('writes %p %s with its symbol, never its code', (rate, currency, expected) => {
    expect(formatRateFigure(rate, currency, 'en')).toBe(expected);
  });
});
