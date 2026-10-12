import { formatLedgerAmount } from './format';

describe('formatLedgerAmount', () => {
  it('prints a portfolio value at full precision', () => {
    expect(formatLedgerAmount(513_698, 'USD', 'en')).toBe('$5,136.98');
  });
});
