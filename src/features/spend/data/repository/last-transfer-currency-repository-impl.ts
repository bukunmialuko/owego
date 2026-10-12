import type { KeyValueStorage } from '@/core/storage/key-value-storage';
import { PreferenceKey } from '@/core/storage/storage-keys';
import type { LastTransferCurrencyRepository } from '../../domain/repository/last-transfer-currency-repository';

const CURRENCY_CODE = /^[A-Z]{3}$/;

export function createLastTransferCurrencyRepositoryImpl({
  cache,
}: {
  cache: KeyValueStorage;
}): LastTransferCurrencyRepository {
  return {
    read() {
      const stored = cache.getString(PreferenceKey.LastTransferCurrency);

      return stored !== undefined && CURRENCY_CODE.test(stored) ? stored : undefined;
    },
    remember(currency) {
      cache.setString(PreferenceKey.LastTransferCurrency, currency);
    },
  };
}
