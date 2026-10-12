import { countryFixture } from '@/core/reference-data/reference-data';
import { createResolveCountryUseCase } from './resolve-country-usecase';

const countries = (() => {
  const read = countryFixture.read();
  if (!read.ok) throw new Error('the country fixture must parse');
  return read.value;
})();

function build(
  sources: {
    cachedProfileCountry?: string | undefined;
    selectedCountry?: string | undefined;
    deviceRegion?: string | undefined;
  } = {},
) {
  return createResolveCountryUseCase({
    countries,
    cachedProfileCountry: () => sources.cachedProfileCountry,
    selectedCountry: () => sources.selectedCountry,
    deviceRegion: () => sources.deviceRegion,
  });
}

describe('ResolveCountryUseCase', () => {
  describe('precedence', () => {
    it('prefers the country on the cached profile', () => {
      const resolve = build({
        cachedProfileCountry: 'NG',
        selectedCountry: 'ke',
        deviceRegion: 'US',
      });

      expect(resolve.execute()).toBe('ng');
    });

    it('falls back to the country picked on this device', () => {
      const resolve = build({ selectedCountry: 'ke', deviceRegion: 'US' });

      expect(resolve.execute()).toBe('ke');
    });

    it('falls back to the device region', () => {
      const resolve = build({ deviceRegion: 'US' });

      expect(resolve.execute()).toBe('us');
    });

    it('resolves to nothing when no source has an answer', () => {
      expect(build().execute()).toBeUndefined();
    });
  });

  describe('casing', () => {
    it('accepts an uppercase profile country', () => {
      expect(build({ cachedProfileCountry: 'NG' }).execute()).toBe('ng');
    });

    it('accepts a mixed-case device region', () => {
      expect(build({ deviceRegion: 'Us' }).execute()).toBe('us');
    });

    it('always answers in the fixture casing', () => {
      const resolved = build({ cachedProfileCountry: 'GB' }).execute();

      expect(resolved).toBe('gb');
      expect(countries.some((country) => country.code === resolved)).toBe(true);
    });
  });

  describe('unsupported values fall through rather than winning', () => {
    it('skips a profile country outside the fixture', () => {
      expect(build({ cachedProfileCountry: 'zz', deviceRegion: 'US' }).execute()).toBe('us');
    });

    it('skips a stored preference outside the fixture', () => {
      expect(build({ selectedCountry: 'zz', deviceRegion: 'US' }).execute()).toBe('us');
    });

    it('resolves to nothing when the device region is unsupported', () => {
      expect(build({ deviceRegion: 'zz' }).execute()).toBeUndefined();
    });
  });

  describe('absent values', () => {
    it('treats an empty string as no answer', () => {
      expect(
        build({ cachedProfileCountry: '', selectedCountry: '', deviceRegion: 'US' }).execute(),
      ).toBe('us');
    });

    it('treats a blank string as no answer', () => {
      expect(build({ cachedProfileCountry: '  ', deviceRegion: 'US' }).execute()).toBe('us');
    });
  });
});
