import { useStore } from 'zustand';
import { useResolve } from '@/core/di/container-provider';
import { isCurrencyCode } from '@/core/money/money';
import { displayCurrencyFixture } from '@/core/reference-data/reference-data';
import type { DisplayCurrencyDto } from '@/core/reference-data/reference-data-model';

export function useDisplayCurrency() {
  const store = useResolve('displayCurrencyStore');
  const code = useStore(store, (state) => state.code);
  const select = useStore(store, (state) => state.select);

  return { code, select };
}

export function displayCurrencies(): DisplayCurrencyDto[] {
  const result = displayCurrencyFixture.read();

  return result.ok ? result.value.filter((entry) => isCurrencyCode(entry.code)) : [];
}

export function displayCurrencyCountry(code: string): string | undefined {
  return displayCurrencies().find((currency) => currency.code === code)?.country_code;
}
