import { useQueries } from '@tanstack/react-query';
import { useResolve } from '@/core/di/container-provider';
import { AppErrorException } from '@/core/errors/app-error-exception';
import type { FieldOption, FieldOptionSource } from '../../domain/entity/beneficiary-form';

const OPTIONS_STALE_MS = 24 * 60 * 60 * 1000;

const lookupKey = {
  options: (source: FieldOptionSource, countryCode: string) =>
    ['spend', 'lookup', 'options', source, countryCode] as const,
};

export function useFieldOptions(sources: readonly FieldOptionSource[], countryCode: string) {
  const corridorLookupRepository = useResolve('corridorLookupRepository');

  const results = useQueries({
    queries: sources.map((source) => ({
      queryKey: lookupKey.options(source, countryCode),
      queryFn: async (): Promise<readonly FieldOption[]> => {
        const result = await corridorLookupRepository.getOptions(source, { countryCode });
        if (!result.ok) throw new AppErrorException(result.error);

        return result.value;
      },
      staleTime: OPTIONS_STALE_MS,
    })),
  });

  const optionsBySource: Partial<Record<FieldOptionSource, readonly FieldOption[]>> = {};
  sources.forEach((source, index) => {
    optionsBySource[source] = results[index]?.data ?? [];
  });

  return { optionsBySource, isPending: results.some((result) => result.isPending) };
}

export function optionSourcesOf(
  fields: readonly { optionsFrom?: FieldOptionSource }[],
): FieldOptionSource[] {
  return [...new Set(fields.flatMap((field) => (field.optionsFrom ? [field.optionsFrom] : [])))];
}
