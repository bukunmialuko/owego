import { nigerianAccountFrom } from './nigerian-account';

describe('nigerianAccountFrom', () => {
  it('reads a ten-digit account number', () => {
    expect(nigerianAccountFrom('0123456789')).toBe('0123456789');
  });

  it('ignores the whitespace a scan carries', () => {
    expect(nigerianAccountFrom('  0123456789 ')).toBe('0123456789');
  });

  describe('refuses anything that is not exactly ten digits', () => {
    it.each([
      ['nine digits', '012345678'],
      ['eleven digits', '01234567890'],
      ['seven digits, which v1 accepted', '1234567'],
      ['a grouped number', '0123 456 789'],
      ['a hyphenated number', '0123-456-789'],
      ['digits with a suffix', '0123456789x'],
      ['digits with a prefix', 'x0123456789'],
      ['a phone number', '+2250701234567'],
      ['an amount', '10000.00'],
      ['an empty string', ''],
      ['whitespace', '   '],
    ])('%s', (_case, input) => {
      expect(nigerianAccountFrom(input)).toBeUndefined();
    });
  });
});
