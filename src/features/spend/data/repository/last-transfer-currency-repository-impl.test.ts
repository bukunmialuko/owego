import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { createLastTransferCurrencyRepositoryImpl } from './last-transfer-currency-repository-impl';

function setup() {
  const cache = createKeyValueStorage('last-transfer-currency-test');

  return { cache, repository: createLastTransferCurrencyRepositoryImpl({ cache }) };
}

describe('last transfer currency repository', () => {
  it('has nothing before any transfer', () => {
    expect(setup().repository.read()).toBeUndefined();
  });

  it('reads back the currency it remembered', () => {
    const { repository } = setup();

    repository.remember('KES');
    repository.remember('NGN');

    expect(repository.read()).toBe('NGN');
  });

  it.each(['', 'naira', 'NG', 'NGNX', '₦'])(
    'ignores a stored value that is not a currency code: %p',
    (stored) => {
      const { cache, repository } = setup();
      cache.setString(PreferenceKey.LastTransferCurrency, stored);

      expect(repository.read()).toBeUndefined();
    },
  );
});
