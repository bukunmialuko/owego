import { createStore, type StoreApi } from 'zustand/vanilla';
import { isCurrencyCode, type CurrencyCode } from '@/core/money/money';
import { displayCurrencyFixture } from '@/core/reference-data/reference-data';
import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { PreferenceKey } from '@/core/storage/storage-keys';

const DEFAULT_DISPLAY_CURRENCY: CurrencyCode = 'USD';

type DisplayCurrencyState = {
  code: CurrencyCode;
  select: (next: string) => void;
};

export type DisplayCurrencyStore = StoreApi<DisplayCurrencyState>;

function isOffered(code: string): code is CurrencyCode {
  const offered = displayCurrencyFixture.read();

  return isCurrencyCode(code) && offered.ok && offered.value.some((entry) => entry.code === code);
}

export function createDisplayCurrencyStore(cache: KeyValueStorage): DisplayCurrencyStore {
  const stored = cache.getString(PreferenceKey.DisplayCurrency);

  return createStore<DisplayCurrencyState>((set) => ({
    code: stored !== undefined && isOffered(stored) ? stored : DEFAULT_DISPLAY_CURRENCY,
    select(next) {
      if (!isOffered(next)) return;

      cache.setString(PreferenceKey.DisplayCurrency, next);
      set({ code: next });
    },
  }));
}
