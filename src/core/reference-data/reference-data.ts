import { createFixtureDataSource } from '@/core/fixtures/fixture-datasource';
import chainsJson from './fixtures/chains.json';
import countriesJson from './fixtures/countries.json';
import currenciesJson from './fixtures/currencies.json';
import displayCurrenciesJson from './fixtures/display-currencies.json';
import networksJson from './fixtures/networks.json';
import {
  chainListSchema,
  countryListSchema,
  currencyListSchema,
  displayCurrencyListSchema,
  networkListSchema,
  type ChainDto,
  type CountryDto,
  type CurrencyDto,
  type NetworkDto,
} from './reference-data-model';

export const currencyFixture = createFixtureDataSource(currenciesJson, currencyListSchema);
export const displayCurrencyFixture = createFixtureDataSource(
  displayCurrenciesJson,
  displayCurrencyListSchema,
);
export const countryFixture = createFixtureDataSource(countriesJson, countryListSchema);
export const networkFixture = createFixtureDataSource(networksJson, networkListSchema);
export const chainFixture = createFixtureDataSource(chainsJson, chainListSchema);

export function endpointFor(
  currency: CurrencyDto,
): '/transaction/wallet-to-bank' | '/transaction/qr-pay' {
  switch (currency.payment_method) {
    case 'bank':
    case 'mobile_money':
    case 'zelle':
      return '/transaction/wallet-to-bank';
    case 'qr_scan':
      return '/transaction/qr-pay';
  }
}

export function isSelectable(currency: CurrencyDto): boolean {
  return !currency.coming_soon;
}

export function findCurrency(currencies: CurrencyDto[], code: string): CurrencyDto | undefined {
  return currencies.find((currency) => currency.code === code);
}

export function findCountry(countries: CountryDto[], code: string): CountryDto | undefined {
  return countries.find((country) => country.code === code);
}

export function findChain(chains: ChainDto[], key: string): ChainDto | undefined {
  return chains.find((chain) => chain.key === key);
}

export type { ChainDto, CountryDto, CurrencyDto };

/** @public */
export type { NetworkDto };
