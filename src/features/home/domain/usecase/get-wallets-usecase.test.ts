import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { createGetSpendableBalanceUseCase } from './get-wallets-usecase';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';

const solana: Wallet = {
  id: 'w1',
  address: '4k3D',
  blockchain: 'SOL',
  balances: [
    { tokenId: 'usdc-sol', symbol: 'USDC', amount: '5136.98', decimals: 6 },
    { tokenId: 'usdt-sol', symbol: 'USDT', amount: '10.00', decimals: 6 },
  ],
};

const base: Wallet = {
  id: 'w2',
  address: '0xb249',
  blockchain: 'BASE',
  balances: [{ tokenId: 'usdc-base', symbol: 'USDC', amount: '20.00', decimals: 6 }],
};

function build(result: Awaited<ReturnType<WalletBalancePort['listWallets']>>) {
  return createGetSpendableBalanceUseCase({ listWallets: () => Promise.resolve(result) });
}

describe('GetSpendableBalanceUseCase', () => {
  it('finds the requested token', async () => {
    const useCase = build(ok([solana]));

    await expect(useCase.execute('USDC')).resolves.toEqual(
      ok({ tokenId: 'usdc-sol', symbol: 'USDC', amount: '5136.98', decimals: 6 }),
    );
  });

  it('matches the symbol regardless of case', async () => {
    const useCase = build(ok([solana]));

    await expect(useCase.execute('usdc')).resolves.toEqual(expect.objectContaining({ ok: true }));
  });

  it('searches across every wallet', async () => {
    const useCase = build(ok([base, solana]));

    const result = await useCase.execute('USDT');

    expect(result.ok && result.value?.tokenId).toBe('usdt-sol');
  });

  it('resolves to undefined when the token is not held', async () => {
    const useCase = build(ok([solana]));

    await expect(useCase.execute('DAI')).resolves.toEqual(ok(undefined));
  });

  it('resolves to undefined when there are no wallets', async () => {
    const useCase = build(ok([]));

    await expect(useCase.execute('USDC')).resolves.toEqual(ok(undefined));
  });

  it('propagates a failure rather than reporting an empty balance', async () => {
    const useCase = build(err(offline()));

    await expect(useCase.execute('USDC')).resolves.toEqual(err(offline()));
  });
});
