import { currencyFixture } from '@/core/reference-data/reference-data';
import { alphaFromNumeric } from './iso4217-numeric';

describe('alphaFromNumeric', () => {
  it.each([
    ['704', 'VND'],
    ['608', 'PHP'],
    ['116', 'KHR'],
    ['764', 'THB'],
    ['986', 'BRL'],
    ['032', 'ARS'],
    ['840', 'USD'],
    ['566', 'NGN'],
    ['952', 'XOF'],
    ['404', 'KES'],
    ['834', 'TZS'],
    ['170', 'COP'],
    ['710', 'ZAR'],
    ['156', 'CNY'],
  ])('reads %s as %s', (numeric, alpha) => {
    expect(alphaFromNumeric(numeric)).toBe(alpha);
  });

  it('covers every currency the app offers', () => {
    const parsed = currencyFixture.read();
    expect(parsed.ok).toBe(true);

    const offered = parsed.ok ? parsed.value.map((currency) => currency.code) : [];
    expect(offered.length).toBeGreaterThan(0);

    const reachable = new Set(
      Array.from({ length: 1000 }, (_unused, index) =>
        alphaFromNumeric(String(index).padStart(3, '0')),
      ),
    );

    for (const code of offered) {
      expect(reachable).toContain(code);
    }
  });

  it('answers undefined for a number ISO has not assigned', () => {
    expect(alphaFromNumeric('001')).toBeUndefined();
    expect(alphaFromNumeric('000')).toBeUndefined();
  });

  it('names the codes ISO assigns to non-currencies rather than hiding them', () => {
    expect(alphaFromNumeric('999')).toBe('XXX');
    expect(alphaFromNumeric('959')).toBe('XAU');
  });

  it.each(['', '  ', '84', '0840', 'USD', '12a'])('answers undefined for %p', (input) => {
    expect(alphaFromNumeric(input)).toBeUndefined();
  });
});
