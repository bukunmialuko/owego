import {
  EMPTY_DRAFT,
  appendDecimal,
  appendDigit,
  deleteLast,
  formatDraft,
  fromMinor,
  fromNumber,
  isEmpty,
  toMinor,
  toNumber,
  type AmountDraft,
} from './amount-draft';

const USD_DIGITS = 2;
const VND_DIGITS = 0;

function type(keys: string, maxFractionDigits = USD_DIGITS): AmountDraft {
  return [...keys].reduce(
    (draft, key) =>
      key === '.'
        ? appendDecimal(draft, maxFractionDigits)
        : key === '<'
          ? deleteLast(draft)
          : appendDigit(draft, key, maxFractionDigits),
    EMPTY_DRAFT,
  );
}

describe('typing whole digits', () => {
  it('builds the whole part and leaves the fraction inactive', () => {
    expect(type('50')).toEqual({ whole: '50', fraction: null });
  });

  it('never activates decimals on its own, however many digits are typed', () => {
    expect(type('123456').fraction).toBeNull();
  });

  it('collapses a leading zero rather than keeping "05"', () => {
    expect(type('05')).toEqual({ whole: '5', fraction: null });
  });

  it('keeps a single zero as a value in its own right', () => {
    expect(type('00')).toEqual({ whole: '0', fraction: null });
  });

  it('ignores a non-digit', () => {
    expect(appendDigit(EMPTY_DRAFT, 'a', USD_DIGITS)).toEqual(EMPTY_DRAFT);
  });

  it('stops at twelve whole digits rather than overflowing the display', () => {
    expect(type('9999999999999').whole).toHaveLength(12);
  });
});

describe('the decimal key', () => {
  it('is the only thing that activates decimals', () => {
    expect(type('50').fraction).toBeNull();
    expect(type('50.').fraction).toBe('');
  });

  it('leads with a zero when the field is untouched', () => {
    expect(type('.')).toEqual({ whole: '0', fraction: '' });
  });

  it('does nothing when pressed twice', () => {
    expect(type('50..')).toEqual({ whole: '50', fraction: '' });
    expect(type('50.2.')).toEqual({ whole: '50', fraction: '2' });
  });

  it('routes every later digit into the fraction', () => {
    expect(type('50.25')).toEqual({ whole: '50', fraction: '25' });
  });

  it('ignores a digit past the currency precision rather than rewriting the whole part', () => {
    expect(type('50.259')).toEqual({ whole: '50', fraction: '25' });
  });

  it('is rejected outright by a zero-decimal currency', () => {
    expect(type('50.25', VND_DIGITS)).toEqual({ whole: '5025', fraction: null });
  });
});

describe('deleting', () => {
  it('peels the fraction right to left', () => {
    expect(type('50.25<')).toEqual({ whole: '50', fraction: '2' });
  });

  it('leaves the point in place, then removes it on the next press', () => {
    expect(type('50.25<<')).toEqual({ whole: '50', fraction: '' });
    expect(type('50.25<<<')).toEqual({ whole: '50', fraction: null });
  });

  it('lands back on the digits that were typed, not one short of them', () => {
    expect(toNumber(type('50.25<<<'))).toBe(50);
  });

  it('then peels the whole part', () => {
    expect(type('50.25<<<<')).toEqual({ whole: '5', fraction: null });
  });

  it('does nothing on an empty draft', () => {
    expect(deleteLast(EMPTY_DRAFT)).toEqual(EMPTY_DRAFT);
  });
});

describe('toNumber', () => {
  it.each([
    ['', 0],
    ['0', 0],
    ['50', 50],
    ['50.', 50],
    ['50.2', 50.2],
    ['50.25', 50.25],
    ['.05', 0.05],
  ])('reads %p as %p', (keys, expected) => {
    expect(toNumber(type(keys))).toBe(expected);
  });
});

describe('fromNumber', () => {
  it('round-trips through toNumber', () => {
    expect(toNumber(fromNumber(5136.98, USD_DIGITS))).toBe(5136.98);
  });

  it('activates decimals, because the cents came with the value', () => {
    expect(fromNumber(100, USD_DIGITS)).toEqual({ whole: '100', fraction: '00' });
  });

  it.each([
    [10.999, '10', '99'],
    [0.005, '0', '00'],
    [2568.499, '2568', '49'],
  ])('truncates %p toward zero rather than rounding', (value, whole, fraction) => {
    expect(fromNumber(value, USD_DIGITS)).toEqual({ whole, fraction });
  });

  it('does not lose a cent to binary representation', () => {
    expect(fromNumber(5136.98, USD_DIGITS)).toEqual({ whole: '5136', fraction: '98' });
  });

  it('leaves the fraction inactive for a zero-decimal currency', () => {
    expect(fromNumber(9500, VND_DIGITS)).toEqual({ whole: '9500', fraction: null });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %p', (value) => {
    expect(fromNumber(value, USD_DIGITS)).toEqual(EMPTY_DRAFT);
  });
});

describe('toMinor', () => {
  it.each([
    ['', 0],
    ['0', 0],
    ['5', 500],
    ['5.', 500],
    ['5.1', 510],
    ['.05', 5],
    ['5136.98', 513698],
    ['999999999999.99', 99999999999999],
  ])('reads %p as %p cents', (keys, expected) => {
    expect(toMinor(type(keys), USD_DIGITS)).toBe(expected);
  });

  it('reads a zero-decimal currency in whole units', () => {
    expect(toMinor(type('9500', VND_DIGITS), VND_DIGITS)).toBe(9500);
  });
});

describe('fromMinor', () => {
  it.each([
    [513, '5', '13'],
    [5, '0', '05'],
    [500, '5', '00'],
    [513698, '5136', '98'],
  ])('writes %p cents as %p.%p', (minor, whole, fraction) => {
    expect(fromMinor(minor, USD_DIGITS)).toEqual({ whole, fraction });
  });

  it('round-trips through toMinor', () => {
    expect(toMinor(fromMinor(513698, USD_DIGITS), USD_DIGITS)).toBe(513698);
  });

  it('leaves the fraction inactive for a zero-decimal currency', () => {
    expect(fromMinor(9500, VND_DIGITS)).toEqual({ whole: '9500', fraction: null });
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 10 ** 15])('rejects %p', (minor) => {
    expect(fromMinor(minor, USD_DIGITS)).toEqual(EMPTY_DRAFT);
  });
});

describe('isEmpty', () => {
  it('separates an untouched field from one holding zero', () => {
    expect(isEmpty(EMPTY_DRAFT)).toBe(true);
    expect(isEmpty(type('0'))).toBe(false);
    expect(isEmpty(type('.'))).toBe(false);
  });
});

describe('formatDraft', () => {
  const format = (keys: string) => formatDraft(type(keys), 'en-US', 'USD');

  it('reads $0.00 when untouched', () => {
    expect(format('')).toMatchObject({ prefix: '$', whole: '0', fraction: '00', suffix: '' });
  });

  it('pads the cents the user has not typed', () => {
    expect(format('50')).toMatchObject({ whole: '50', fraction: '00' });
    expect(format('50.2')).toMatchObject({ whole: '50', fraction: '20' });
  });

  it('drops fraction digits a zero-decimal currency cannot show', () => {
    const xof = formatDraft(fromNumber(100, 2), 'en-US', 'XOF');

    expect(xof).toMatchObject({ whole: '100', fraction: '', decimalSeparator: '' });
    expect(xof.typedFractionDigits).toBe(0);
  });

  it('reports how many cents were actually typed', () => {
    expect(format('50').typedFractionDigits).toBe(0);
    expect(format('50.').typedFractionDigits).toBe(0);
    expect(format('50.2').typedFractionDigits).toBe(1);
    expect(format('50.25').typedFractionDigits).toBe(2);
  });

  it('reports the decimal key press even before a cent is typed', () => {
    expect(format('50').isDecimalActive).toBe(false);
    expect(format('50.').isDecimalActive).toBe(true);
  });

  it('groups the whole part without storing the separators', () => {
    expect(format('5136').whole).toBe('5,136');
    expect(type('5136').whole).toBe('5136');
  });

  it('drops the fraction entirely for a zero-decimal currency', () => {
    expect(formatDraft(type('9500', VND_DIGITS), 'en-US', 'VND')).toMatchObject({
      fraction: '',
      decimalSeparator: '',
    });
  });

  it('puts the symbol where the locale puts it', () => {
    const french = formatDraft(type('5136'), 'fr-FR', 'USD');

    expect(french.prefix).toBe('');
    expect(french.suffix.trim()).toBe('$');
  });

  it.each([
    ['NGN', '₦'],
    ['KES', 'KSh\u00a0'],
    ['ARS', 'AR$'],
  ] as const)('leads a %s amount with %p', (currency, prefix) => {
    expect(formatDraft(type('5136'), 'en-US', currency)).toMatchObject({
      prefix,
      whole: '5,136',
      suffix: '',
    });
  });
});

describe('a draft that is not digits only', () => {
  it.each([
    ['a negative whole part', { whole: '-5', fraction: null }],
    ['a negative fraction', { whole: '5', fraction: '-1' }],
    ['an exponent', { whole: '5e3', fraction: null }],
  ])('reads %s as nothing', (_, draft: AmountDraft) => {
    expect(toMinor(draft, USD_DIGITS)).toBe(0);
    expect(toNumber(draft)).toBe(0);
  });

  it('takes no minus sign as a key', () => {
    expect(type('-5')).toEqual({ whole: '5', fraction: null });
  });
});
