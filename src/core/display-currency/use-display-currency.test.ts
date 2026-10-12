import { displayCurrencies, displayCurrencyCountry } from './use-display-currency';

describe('display currencies', () => {
  it('starts with US Dollar and offers no British Pound', () => {
    const codes = displayCurrencies().map((currency) => currency.code);

    expect(codes[0]).toBe('USD');
    expect(codes).not.toContain('GBP');
  });

  it.each([
    ['NGN', 'NG'],
    ['XOF', 'CI'],
    ['USD', 'US'],
  ])('flags %p with the country %p', (code, country) => {
    expect(displayCurrencyCountry(code)).toBe(country);
  });

  it('has no country for a currency it does not offer', () => {
    expect(displayCurrencyCountry('GBP')).toBeUndefined();
  });
});
