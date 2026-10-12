import {
  chainFixture,
  countryFixture,
  currencyFixture,
  endpointFor,
  findChain,
  findCurrency,
  isSelectable,
  networkFixture,
  type ChainDto,
  type CurrencyDto,
} from './reference-data';

function chains(): ChainDto[] {
  const result = chainFixture.read();
  if (!result.ok) throw new Error('chain fixture failed to parse');
  return result.value;
}

function currencies(): CurrencyDto[] {
  const result = currencyFixture.read();
  if (!result.ok) throw new Error('currency fixture failed to parse');
  return result.value;
}

describe('reference data fixtures', () => {
  describe('parse against their schemas', () => {
    it('currencies', () => {
      expect(currencyFixture.read().ok).toBe(true);
    });

    it('countries', () => {
      expect(countryFixture.read().ok).toBe(true);
    });

    it('networks', () => {
      expect(networkFixture.read().ok).toBe(true);
    });

    it('chains', () => {
      expect(chainFixture.read().ok).toBe(true);
    });
  });

  it('ships all twelve currencies, not the five the designs show', () => {
    expect(
      currencies()
        .map((currency) => currency.code)
        .sort(),
    ).toEqual(['ARS', 'BRL', 'COP', 'IDR', 'KES', 'KHR', 'NGN', 'PHP', 'THB', 'USD', 'VND', 'XOF']);
  });

  it('ships every supported country', () => {
    const result = countryFixture.read();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(55);
  });
});

describe('payment rails', () => {
  it('routes bank, mobile money and zelle to wallet-to-bank', () => {
    for (const code of ['NGN', 'XOF', 'KES', 'USD']) {
      const currency = findCurrency(currencies(), code);
      expect(currency).toBeDefined();
      expect(endpointFor(currency!)).toBe('/transaction/wallet-to-bank');
    }
  });

  it('routes qr_scan currencies to qr-pay', () => {
    for (const code of ['VND', 'PHP', 'KHR', 'THB', 'BRL', 'ARS']) {
      const currency = findCurrency(currencies(), code);
      expect(currency).toBeDefined();
      expect(endpointFor(currency!)).toBe('/transaction/qr-pay');
    }
  });
});

describe('currency metadata', () => {
  it('carries per-currency limits spanning four orders of magnitude', () => {
    expect(findCurrency(currencies(), 'BRL')?.min_amount).toBe(0.6);
    expect(findCurrency(currencies(), 'VND')?.max_amount).toBe(9_500_000);
  });

  it('opens every corridor in the catalogue', () => {
    const comingSoon = currencies().filter((currency) => !isSelectable(currency));

    expect(comingSoon).toEqual([]);
  });

  it('has an empty symbol for XOF', () => {
    expect(findCurrency(currencies(), 'XOF')?.symbol).toBe('');
  });
});

describe('chains are the wire-only shape', () => {
  it('finds a chain by its wire key', () => {
    expect(findChain(chains(), 'BASE')?.blockchain).toBe('BASE-SEPOLIA');
  });

  it('carries no display, fee or ETA fields', () => {
    for (const chain of chains()) {
      expect(Object.keys(chain).sort()).toEqual(['blockchain', 'enabled', 'key']);
    }
  });

  it('never lists the native chain', () => {
    expect(findChain(chains(), 'SOL')).toBeUndefined();
  });
});

describe('country codes are a backend contract', () => {
  it('keeps fixture casing untouched', () => {
    const result = countryFixture.read();
    if (!result.ok) throw new Error('country fixture failed to parse');

    for (const country of result.value) {
      expect(country.code).toBe(country.code.toLowerCase());
    }
  });

  it('does not reconcile with the uppercase country_code on currencies', () => {
    expect(findCurrency(currencies(), 'USD')?.country_code).toBe('US');
    expect(findCurrency(currencies(), 'XOF')?.country_code).toBe('CI');
  });
});
