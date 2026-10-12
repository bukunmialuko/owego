import { serverError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import type { YieldProduct } from '../entity/yield-entity';
import type { YieldRepository } from '../repository/yield-repository';
import { createLoadYieldProductsUseCase } from './load-yield-products-usecase';

const USDC_VAULT: YieldProduct = {
  id: 'vault-usdc',
  tokenSymbol: 'USDC',
  tokenMint: 'usdc-mint',
  apyPercent: 4.1,
  provider: 'jupiter',
  isStakeable: false,
};

function wallet(blockchain: string, balances: Record<string, string>): Wallet {
  return {
    id: `wallet-${blockchain}`,
    address: `address-${blockchain}`,
    blockchain,
    balances: Object.entries(balances).map(([symbol, amount]) => ({
      tokenId: `${symbol}-${blockchain}`,
      symbol,
      amount,
      decimals: 6,
    })),
  };
}

function load({
  products = ok([USDC_VAULT]),
  wallets,
}: {
  products?: Result<YieldProduct[], AppError>;
  wallets: Result<Wallet[], AppError>;
}) {
  const yieldRepository: YieldRepository = {
    getProducts: () => Promise.resolve(products),
    quote: () => Promise.reject(new Error('not used')),
    initiate: () => Promise.reject(new Error('not used')),
    broadcast: () => Promise.reject(new Error('not used')),
  };
  const walletBalancePort: WalletBalancePort = { listWallets: () => Promise.resolve(wallets) };

  return createLoadYieldProductsUseCase({ yieldRepository, walletBalancePort }).execute();
}

describe('load the yield products', () => {
  it('gives each product the Solana wallet’s holding of its token, floored to the cent', async () => {
    await expect(
      load({ wallets: ok([wallet('SOL-DEVNET', { USDC: '77.90459', USDT: '3' })]) }),
    ).resolves.toEqual(ok([{ ...USDC_VAULT, walletBalanceMinor: 7_790 }]));
  });

  it('does not count USDC held on another network', async () => {
    await expect(
      load({
        wallets: ok([wallet('MATIC-AMOY', { USDC: '50' }), wallet('SOL-DEVNET', { USDT: '3' })]),
      }),
    ).resolves.toEqual(ok([{ ...USDC_VAULT, walletBalanceMinor: 0 }]));
  });

  it('reads no Solana wallet as holding nothing', async () => {
    await expect(load({ wallets: ok([]) })).resolves.toEqual(
      ok([{ ...USDC_VAULT, walletBalanceMinor: 0 }]),
    );
  });

  it.each([
    ['the wallets cannot be read', err(serverError(503))],
    ['the holding cannot be read', ok([wallet('SOL', { USDC: 'n/a' })])],
  ] as const)('leaves the balance unknown when %s', async (_case, wallets) => {
    await expect(load({ wallets })).resolves.toEqual(ok([USDC_VAULT]));
  });

  it('passes on a failure to read the products', async () => {
    const failure = serverError(502);

    await expect(load({ products: err(failure), wallets: ok([]) })).resolves.toEqual(err(failure));
  });
});
