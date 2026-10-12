import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { Wallet } from '@/core/wallet/wallet';
import { createDeleteAccountUseCase } from './delete-account-usecase';

function wallet(balances: Wallet['balances']): Wallet {
  return { id: 'w1', address: 'addr', blockchain: 'SOL', balances };
}

const usdc = (amount: string) => ({ tokenId: 't', symbol: 'USDC', amount, decimals: 6 });

function build({
  wallets = [wallet([usdc('0')])],
  pending = [] as { amountMinor: number; currency: string }[],
  deleteFails = false,
} = {}) {
  const remove = jest.fn(() => Promise.resolve(deleteFails ? err(offline()) : ok(undefined)));

  const usecase = createDeleteAccountUseCase({
    walletBalancePort: { listWallets: () => Promise.resolve(ok(wallets)) },
    pendingTransactionsPort: { listPending: () => Promise.resolve(ok(pending)) },
    accountRepository: { deleteAccount: remove },
  });

  return { usecase, remove };
}

describe('checking whether the account can go', () => {
  it('finds nothing in the way of an empty, settled account', async () => {
    const { usecase } = build();

    await expect(usecase.findBlockers()).resolves.toEqual(ok([]));
  });

  it('reports funds that would be lost', async () => {
    const { usecase } = build({ wallets: [wallet([usdc('134.56')])] });

    await expect(usecase.findBlockers()).resolves.toEqual(
      ok([{ type: 'funds', amountMinor: 13456, currency: 'USD' }]),
    );
  });

  it('reports a transaction still in flight', async () => {
    const { usecase } = build({ pending: [{ amountMinor: 2340, currency: 'USD' }] });

    await expect(usecase.findBlockers()).resolves.toEqual(
      ok([{ type: 'pending', amountMinor: 2340, currency: 'USD' }]),
    );
  });

  it('reports both, in the order the designs list them', async () => {
    const { usecase } = build({
      wallets: [wallet([usdc('134.56')])],
      pending: [{ amountMinor: 2340, currency: 'USD' }],
    });

    await expect(usecase.findBlockers()).resolves.toEqual(
      ok([
        { type: 'funds', amountMinor: 13456, currency: 'USD' },
        { type: 'pending', amountMinor: 2340, currency: 'USD' },
      ]),
    );
  });

  it('passes a failed balance read through rather than reporting nothing in the way', async () => {
    const usecase = createDeleteAccountUseCase({
      walletBalancePort: { listWallets: () => Promise.resolve(err(offline())) },
      pendingTransactionsPort: { listPending: () => Promise.resolve(ok([])) },
      accountRepository: { deleteAccount: jest.fn() },
    });

    await expect(usecase.findBlockers()).resolves.toEqual(err(offline()));
  });
});

describe('deleting', () => {
  it('deletes when nothing is in the way', async () => {
    const { usecase, remove } = build();

    await expect(usecase.execute()).resolves.toEqual(ok({ type: 'deleted' }));
    expect(remove).toHaveBeenCalled();
  });

  it('refuses before calling the endpoint when something is in the way', async () => {
    const { usecase, remove } = build({ wallets: [wallet([usdc('134.56')])] });

    await expect(usecase.execute()).resolves.toEqual(
      ok({
        type: 'blocked',
        blockers: [{ type: 'funds', amountMinor: 13456, currency: 'USD' }],
      }),
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it('passes a failed delete through', async () => {
    const { usecase } = build({ deleteFails: true });

    await expect(usecase.execute()).resolves.toEqual(err(offline()));
  });
});
