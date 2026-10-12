import { findCountry, type CountryDto } from '@/core/reference-data/reference-data';

type Dependencies = {
  cachedProfileCountry: () => string | undefined;
  selectedCountry: () => string | undefined;
  deviceRegion: () => string | undefined;
  countries: CountryDto[];
};

export interface ResolveCountryUseCase {
  execute(): string | undefined;
}

export function createResolveCountryUseCase({
  cachedProfileCountry,
  selectedCountry,
  deviceRegion,
  countries,
}: Dependencies): ResolveCountryUseCase {
  function supported(code: string | undefined): string | undefined {
    const normalized = code?.trim().toLowerCase();
    if (normalized === undefined || normalized === '') return undefined;

    return findCountry(countries, normalized)?.code;
  }

  return {
    execute() {
      return (
        supported(cachedProfileCountry()) ??
        supported(selectedCountry()) ??
        supported(deviceRegion())
      );
    },
  };
}
