import { formatApy } from './format-apy';

describe('formatApy', () => {
  it.each([
    [4.1, '4.10%'],
    [3.3, '3.30%'],
    [3.77, '3.77%'],
    [12, '12.00%'],
  ])('prints %p as %p', (percent, expected) => {
    expect(formatApy(percent, 'en')).toBe(expected);
  });
});
