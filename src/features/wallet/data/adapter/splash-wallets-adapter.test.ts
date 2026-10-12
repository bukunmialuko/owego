import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { createKeyValueStorage } from '@/core/storage/mmkv-key-value-storage';
import { CacheKey } from '@/core/storage/storage-keys';
import type { WalletRepository } from '../../domain/repository/wallet-repository';
import { createSplashWalletsAdapter } from './splash-wallets-adapter';

const usable = { id: 'w1', address: 'So1ana', blockchain: 'SOL', balances: [] };
const addressless = { id: 'w2', address: '', blockchain: 'SOL', balances: [] };

function repository(result: Awaited<ReturnType<WalletRepository['getWallets']>>) {
  return {
    getWallets: () => Promise.resolve(result),
    createChallenge: jest.fn(),
    createPinChangeChallenge: jest.fn(),
  } satisfies WalletRepository;
}

describe('splashWalletsAdapter', () => {
  it('counts only usable wallets', async () => {
    const cache = createKeyValueStorage('splash-wallets-count');
    const adapter = createSplashWalletsAdapter(repository(ok([usable, addressless])), cache);

    await expect(adapter.countWallets()).resolves.toEqual(ok(1));
  });

  it('passes a failure through rather than counting zero', async () => {
    const cache = createKeyValueStorage('splash-wallets-failure');
    const adapter = createSplashWalletsAdapter(repository(err(offline())), cache);

    await expect(adapter.countWallets()).resolves.toEqual(err(offline()));
  });

  it('counts only usable cached wallets', () => {
    const cache = createKeyValueStorage('splash-wallets-cached');
    cache.setObject(CacheKey.WalletList, [usable, addressless]);
    const adapter = createSplashWalletsAdapter(repository(ok([])), cache);

    expect(adapter.cachedWalletCount()).toBe(1);
  });

  it('reports no cached count when the cache cannot be read', () => {
    const cache = createKeyValueStorage('splash-wallets-corrupt');
    cache.setString(CacheKey.WalletList, '{not json');
    const adapter = createSplashWalletsAdapter(repository(ok([])), cache);

    expect(adapter.cachedWalletCount()).toBeUndefined();
  });

  it('reports no cached count when nothing was cached', () => {
    const cache = createKeyValueStorage('splash-wallets-empty');
    const adapter = createSplashWalletsAdapter(repository(ok([])), cache);

    expect(adapter.cachedWalletCount()).toBeUndefined();
  });
});
