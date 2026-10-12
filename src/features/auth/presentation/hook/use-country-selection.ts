import { useCallback, useMemo, useState } from 'react';
import { useResolve } from '@/core/di/container-provider';
import { countryFixture, findCountry, type CountryDto } from '@/core/reference-data/reference-data';
import { unwrapOr } from '@/core/result/result';
import { PreferenceKey } from '@/core/storage/storage-keys';

export function useCountrySelection() {
  const cache = useResolve('cache');
  const resolveCountry = useResolve('resolveCountryUseCase');
  const [selected, setSelected] = useState<string | undefined>(() => resolveCountry.execute());

  const countries = useMemo(() => unwrapOr(countryFixture.read(), []), []);

  const options = useMemo(() => sortWithSelectedFirst(countries, selected), [countries, selected]);

  const select = useCallback(
    (code: string) => {
      cache.setString(PreferenceKey.SelectedCountry, code);
      setSelected(code);
    },
    [cache],
  );

  return {
    selected,
    selectedCountry: selected === undefined ? undefined : findCountry(countries, selected),
    options,
    select,
  };
}

function sortWithSelectedFirst(countries: CountryDto[], selected: string | undefined) {
  const byName = [...countries].sort((a, b) => a.name.localeCompare(b.name));
  if (selected === undefined) return byName;

  const index = byName.findIndex((country) => country.code === selected);
  if (index < 0) return byName;

  return [byName[index]!, ...byName.slice(0, index), ...byName.slice(index + 1)];
}
