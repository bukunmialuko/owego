import { formatRewardAmount } from './format';

describe('formatRewardAmount', () => {
  it('prints a reward at full precision, cents included', () => {
    expect(formatRewardAmount(513_698, 'USD', 'en-US')).toBe('$5,136.98');
    expect(formatRewardAmount(50_00, 'USD', 'en-US')).toBe('$50.00');
  });

  it('falls back to dollars for a currency code it does not know', () => {
    expect(formatRewardAmount(50_00, 'ZZZ', 'en-US')).toBe('$50.00');
  });
});
