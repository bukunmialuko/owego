import { useState } from 'react';
import { useResolve } from '@/core/di/container-provider';
import { isPayableByForm, payoutCurrencies } from '../../../domain/corridor/registry';

export function useLastTransferCurrency(): string | undefined {
  const repository = useResolve('lastTransferCurrencyRepository');

  const [currency] = useState(() => {
    const code = repository.read();
    const known = payoutCurrencies().find((candidate) => candidate.code === code);

    return known !== undefined && isPayableByForm(known) ? known.code : undefined;
  });

  return currency;
}
