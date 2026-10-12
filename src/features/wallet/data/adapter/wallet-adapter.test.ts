import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { WalletRepository } from '../../domain/repository/wallet-repository';
import { createWalletBalanceAdapter } from './wallet-balance-adapter';
import { createWalletProvisioningAdapter } from './wallet-provisioning-adapter';

const wallet = { id: 'w1', address: '4k3D', blockchain: 'SOL', balances: [] };

function repository(result: Awaited<ReturnType<WalletRepository['getWallets']>>) {
  return {
    getWallets: () => Promise.resolve(result),
    createChallenge: jest.fn(),
  } as unknown as WalletRepository;
}

describe('walletProvisioningAdapter', () => {
  it('reports a provisioned wallet', async () => {
    const adapter = createWalletProvisioningAdapter(repository(ok([wallet])));

    await expect(adapter.hasProvisionedWallet()).resolves.toEqual(ok(true));
  });

  it('reports an empty list as not provisioned', async () => {
    const adapter = createWalletProvisioningAdapter(repository(ok([])));

    await expect(adapter.hasProvisionedWallet()).resolves.toEqual(ok(false));
  });

  it('does not report a wallet that has no address as provisioned', async () => {
    const adapter = createWalletProvisioningAdapter(repository(ok([{ ...wallet, address: '' }])));

    await expect(adapter.hasProvisionedWallet()).resolves.toEqual(ok(false));
  });

  it('passes a failure through rather than answering false', async () => {
    const adapter = createWalletProvisioningAdapter(repository(err(offline())));

    await expect(adapter.hasProvisionedWallet()).resolves.toEqual(err(offline()));
  });
});

describe('walletBalanceAdapter', () => {
  it('hands the wallets to home unchanged', async () => {
    const adapter = createWalletBalanceAdapter(repository(ok([wallet])));

    await expect(adapter.listWallets()).resolves.toEqual(ok([wallet]));
  });

  it('passes a failure through', async () => {
    const adapter = createWalletBalanceAdapter(repository(err(offline())));

    await expect(adapter.listWallets()).resolves.toEqual(err(offline()));
  });
});
