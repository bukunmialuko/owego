import { createStorageCleanupTask } from '@/core/session/storage-cleanup-task';
import { createSecureStorage } from '@/core/storage/keychain-secure-storage';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { createDisplayCurrencyStore } from './display-currency-store';

function setup() {
  const cache = createKeyValueStorage('display-currency-store-test');
  cache.clearAll();

  return { cache, createStore: () => createDisplayCurrencyStore(cache) };
}

describe('display currency store', () => {
  it('starts at USD when nothing has been picked', () => {
    const { createStore } = setup();

    expect(createStore().getState().code).toBe('USD');
  });

  it('falls back to USD when the earlier pick is no longer offered', () => {
    const { cache, createStore } = setup();
    cache.setString(PreferenceKey.DisplayCurrency, 'GBP');

    expect(createStore().getState().code).toBe('USD');
  });

  it('starts from the currency picked on an earlier launch', () => {
    const { cache, createStore } = setup();
    cache.setString(PreferenceKey.DisplayCurrency, 'NGN');

    expect(createStore().getState().code).toBe('NGN');
  });

  it('remembers a pick on the device', () => {
    const { cache, createStore } = setup();
    const store = createStore();

    store.getState().select('NGN');

    expect(store.getState().code).toBe('NGN');
    expect(cache.getString(PreferenceKey.DisplayCurrency)).toBe('NGN');
  });

  it('ignores a code it cannot format', () => {
    const { cache, createStore } = setup();
    const store = createStore();

    store.getState().select('XYZ');

    expect(store.getState().code).toBe('USD');
    expect(cache.getString(PreferenceKey.DisplayCurrency)).toBeUndefined();
  });

  it('ignores a currency the sheet does not offer', () => {
    const { cache, createStore } = setup();
    const store = createStore();

    store.getState().select('GBP');

    expect(store.getState().code).toBe('USD');
    expect(cache.getString(PreferenceKey.DisplayCurrency)).toBeUndefined();
  });

  it('keeps the pick through a sign-out', async () => {
    const { cache, createStore } = setup();
    createStore().getState().select('NGN');

    await createStorageCleanupTask({ cache, secureStorage: createSecureStorage() }).run();

    expect(createStore().getState().code).toBe('NGN');
  });
});
