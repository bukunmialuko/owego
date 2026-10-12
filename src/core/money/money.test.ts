import {
  apiMinorToField,
  compare,
  decimalToMinorFloor,
  decimalToUnitsFloor,
  fieldMinorToApi,
  format,
  formatDeltaPercent,
  formatMinor,
  formatMinorExact,
  formatMinorTrimmed,
  fromDecimal,
  isCurrencyCode,
  isSameCurrency,
  minorToDecimalString,
  splitAmount,
  toApiDecimal,
  toApiMinor,
  toDecimalNumber,
  unitsToDecimalString,
} from './money';

describe('Money', () => {
  describe('fromDecimal', () => {
    it('keeps a two-decimal amount exact', () => {
      expect(toDecimalNumber(fromDecimal(5136.98, 'USD'))).toBe(5136.98);
    });

    it('survives the arithmetic that breaks floats', () => {
      const tenth = fromDecimal(0.1, 'USD');
      const fifth = fromDecimal(0.2, 'USD');

      expect(toApiMinor(tenth) + toApiMinor(fifth)).toBe(30);
    });

    it('accepts a decimal string from the backend without going through a float', () => {
      expect(toApiMinor(fromDecimal('182.16', 'USD'))).toBe(18216);
    });

    it('rounds a sub-minor-unit amount rather than truncating', () => {
      expect(toApiMinor(fromDecimal(0.005, 'USD'))).toBe(1);
    });
  });

  describe('toApiMinor', () => {
    it('scales by a fixed 100 for two-decimal currencies', () => {
      expect(toApiMinor(fromDecimal(12.5, 'USD'))).toBe(1250);
      expect(toApiMinor(fromDecimal(12.5, 'NGN'))).toBe(1250);
    });

    it('scales by a fixed 100 for zero-decimal currencies too', () => {
      expect(toApiMinor(fromDecimal(50, 'XOF'))).toBe(5000);
      expect(toApiMinor(fromDecimal(10000, 'VND'))).toBe(1000000);
    });

    it('always returns an integer', () => {
      expect(Number.isInteger(toApiMinor(fromDecimal(0.1, 'USD')))).toBe(true);
      expect(Number.isInteger(toApiMinor(fromDecimal(1234.567, 'KES')))).toBe(true);
    });
  });

  describe('between an amount field and the API', () => {
    it('leaves a two-decimal amount at the scale it was typed', () => {
      expect(fieldMinorToApi(1001, 'USD')).toBe(1001);
      expect(apiMinorToField(1001, 'USD')).toBe(1001);
    });

    it("scales a zero-decimal amount up to the API's hundredths", () => {
      expect(fieldMinorToApi(6005, 'XOF')).toBe(600500);
    });

    it('rounds hundredths to the nearest whole unit a zero-decimal currency can hold', () => {
      expect(apiMinorToField(600549, 'XOF')).toBe(6005);
      expect(apiMinorToField(600550, 'XOF')).toBe(6006);
    });
  });

  describe('the qr-pay wire convention', () => {
    it('sends a raw decimal to qr-pay', () => {
      expect(toApiDecimal(fromDecimal(25.0, 'VND'))).toBe(25);
      expect(toApiDecimal(fromDecimal(0.6, 'BRL'))).toBe(0.6);
    });
  });

  describe('minorToDecimalString', () => {
    it.each([
      [500, '5'],
      [10, '0.1'],
      [1, '0.01'],
      [18216, '182.16'],
      [513698, '5136.98'],
      [0, '0'],
      [99999999999999, '999999999999.99'],
    ])('writes %p cents as %p', (minor, expected) => {
      expect(minorToDecimalString(minor)).toBe(expected);
    });

    it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('refuses %p', (minor) => {
      expect(() => minorToDecimalString(minor)).toThrow(RangeError);
    });
  });

  describe('unitsToDecimalString', () => {
    it.each([
      [61657132, 6, '61.657132'],
      [30820000, 6, '30.82'],
      [1, 6, '0.000001'],
      [5000000, 6, '5'],
      [0, 6, '0'],
      [18216, 2, '182.16'],
    ])('writes %p units at %p places as %p', (units, places, expected) => {
      expect(unitsToDecimalString(units, places)).toBe(expected);
    });

    it.each([-1, 1.5, Number.NaN])('refuses %p', (units) => {
      expect(() => unitsToDecimalString(units, 6)).toThrow(RangeError);
    });
  });

  describe('decimalToMinorFloor', () => {
    it.each([
      ['5.136', 513],
      ['5136.98', 513698],
      ['0.009', 0],
      ['10', 1000],
      ['0', 0],
      ['12.5', 1250],
      ['007.10', 710],
    ])('reads %p as %p cents', (decimal, expected) => {
      expect(decimalToMinorFloor(decimal)).toBe(expected);
    });

    it.each(['1e3', '-1', '', '.5', '1.', ' 1', '1,000.00', 'NaN', '99999999999999999'])(
      'refuses %p',
      (decimal) => {
        expect(decimalToMinorFloor(decimal)).toBeUndefined();
      },
    );
  });

  describe('decimalToUnitsFloor', () => {
    it.each([
      ['30.828566', 6, 30_828_566],
      ['30.8285669', 6, 30_828_566],
      ['0.005', 6, 5_000],
      ['10', 6, 10_000_000],
      ['5.136', 2, 513],
      ['5.9', 0, 5],
    ])('reads %p at %p places as %p', (decimal, places, expected) => {
      expect(decimalToUnitsFloor(decimal, places)).toBe(expected);
    });

    it.each(['1e3', '-1', '', '.5', '1.', '1,000.00', '99999999999.000000'])(
      'refuses %p',
      (decimal) => {
        expect(decimalToUnitsFloor(decimal, 6)).toBeUndefined();
      },
    );
  });

  describe('format', () => {
    it('renders a two-decimal currency', () => {
      expect(format(fromDecimal(5136.98, 'USD'), 'en-US')).toBe('$5,136.98');
    });

    it('renders a zero-decimal currency without cents', () => {
      const formatted = format(fromDecimal(10000, 'VND'), 'en-US');

      expect(formatted).toContain('10,000');
      expect(formatted).not.toContain('.00');
    });

    it('falls back to the code for a currency with no symbol', () => {
      expect(format(fromDecimal(150000, 'XOF'), 'en-US')).toContain('150,000');
    });
  });

  describe('compare', () => {
    it('orders amounts within the same currency', () => {
      const fifty = fromDecimal(50, 'NGN');

      expect(compare(fifty, fromDecimal(2000000, 'NGN'))).toBe(-1);
      expect(compare(fromDecimal(2000000, 'NGN'), fifty)).toBe(1);
      expect(compare(fifty, fromDecimal(50, 'NGN'))).toBe(0);
    });

    it('refuses to compare across currencies', () => {
      expect(() => compare(fromDecimal(1, 'USD'), fromDecimal(1, 'NGN'))).toThrow(/same currency/i);
    });
  });

  it('reports whether two amounts share a currency', () => {
    expect(isSameCurrency(fromDecimal(1, 'USD'), fromDecimal(2, 'USD'))).toBe(true);
    expect(isSameCurrency(fromDecimal(1, 'USD'), fromDecimal(2, 'KES'))).toBe(false);
  });
});

describe('currency symbols', () => {
  it.each([
    ['USD', '$1,500.00'],
    ['GBP', '£1,500.00'],
    ['NGN', '₦1,500.00'],
    ['KES', 'KSh\u00a01,500.00'],
    ['XOF', 'CFA\u00a01,500'],
    ['VND', '₫1,500'],
    ['PHP', '₱1,500.00'],
    ['KHR', '៛1,500.00'],
    ['THB', '฿1,500.00'],
    ['BRL', 'R$1,500.00'],
    ['ARS', 'AR$1,500.00'],
    ['COP', 'COL$1,500.00'],
  ])('writes %s as %s', (currency, expected) => {
    expect(formatMinor(150_000, currency, 'en-US')).toBe(expected);
  });

  it('puts the sign before the symbol', () => {
    expect(formatMinor(-150_000, 'NGN', 'en-US')).toBe('-₦1,500.00');
  });

  it('uses the symbol in the trimmed form too', () => {
    expect(formatMinorTrimmed(150_000, 'NGN', 'en-US')).toBe('₦1,500');
    expect(formatMinorTrimmed(150_050, 'NGN', 'en-US')).toBe('₦1,500.50');
  });

  it('keeps the symbol where the locale puts it', () => {
    expect(formatMinor(150_000, 'NGN', 'fr-FR')).toMatch(/^1\s500,00\s₦$/);
  });
});

describe('supported currencies', () => {
  it('recognises a code it supports and rejects one it does not', () => {
    expect(isCurrencyCode('GBP')).toBe(true);
    expect(isCurrencyCode('XYZ')).toBe(false);
  });

  it('formats GBP with its symbol and both decimals', () => {
    expect(format(fromDecimal('3801.37', 'GBP'), 'en-GB')).toBe('£3,801.37');
  });
});

describe('formatMinorTrimmed', () => {
  it('drops the cents of a round amount', () => {
    expect(formatMinorTrimmed(1500, 'USD', 'en-US')).toBe('$15');
  });

  it('keeps both decimals otherwise', () => {
    expect(formatMinorTrimmed(18216, 'USD', 'en-US')).toBe('$182.16');
  });

  it('never leaves a single decimal', () => {
    expect(formatMinorTrimmed(1450, 'USD', 'en-US')).toBe('$14.50');
  });

  it('falls back to the given currency for a code it does not support', () => {
    expect(formatMinorTrimmed(1500, 'USDC', 'en-US')).toBe('$15');
  });
});

describe('formatMinorExact', () => {
  it('formats a supported currency exactly as formatMinor does', () => {
    expect(formatMinorExact(12_500, 'NGN', 'en-US')).toBe(formatMinor(12_500, 'NGN', 'en-US'));
  });

  it('keeps the currency of a code this build does not support', () => {
    expect(formatMinorExact(12_500, 'GHS', 'en-US')).toMatch(/^GHS\s125\.00$/);
  });

  it('names a code Intl cannot format rather than throwing', () => {
    expect(formatMinorExact(12_500, 'GH', 'en-US')).toBe('125.00 GH');
  });

  it('trims a round amount when asked, and never to one decimal', () => {
    expect(formatMinorExact(1500, 'USD', 'en-US', { trim: true })).toBe('$15');
    expect(formatMinorExact(1450, 'USD', 'en-US', { trim: true })).toBe('$14.50');
    expect(formatMinorExact(12_500, 'GHS', 'en-US', { trim: true })).toMatch(/^GHS\s125$/);
  });
});

describe('splitAmount', () => {
  it('splits the cents off a grouped amount', () => {
    expect(splitAmount('$5,136.98')).toEqual({ major: '$5,136', minor: '.98' });
  });

  it('finds the decimal separator, not the grouping one', () => {
    expect(splitAmount('5.136,98 €')).toEqual({ major: '5.136', minor: ',98 €' });
  });

  it('leaves a zero-decimal amount whole', () => {
    expect(splitAmount('₦500,000')).toEqual({ major: '₦500,000', minor: '' });
  });
});

describe('formatDeltaPercent', () => {
  it('shows the sign on a gain', () => {
    expect(formatDeltaPercent(2.2, 'en-US')).toBe('+2.2%');
  });

  it('shows the sign on a loss', () => {
    expect(formatDeltaPercent(-1.75, 'en-US')).toBe('-1.75%');
  });

  it('leaves a flat window unsigned', () => {
    expect(formatDeltaPercent(0, 'en-US')).toBe('0.0%');
  });
});
