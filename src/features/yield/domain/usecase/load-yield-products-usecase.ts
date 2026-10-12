import type { AppError } from '@/core/errors/app-error';
import { decimalToMinorFloor } from '@/core/money/money';
import { NATIVE_CHAIN_CODE } from '@/core/reference-data/chain-metadata';
import { ok, type Result } from '@/core/result/result';
import { isOnChain } from '@/core/wallet/chain';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import type { YieldProduct } from '../entity/yield-entity';
import type { YieldRepository } from '../repository/yield-repository';

export interface LoadYieldProductsUseCase {
  execute(): Promise<Result<YieldProduct[], AppError>>;
}

export function createLoadYieldProductsUseCase({
  yieldRepository,
  walletBalancePort,
}: {
  yieldRepository: YieldRepository;
  walletBalancePort: WalletBalancePort;
}): LoadYieldProductsUseCase {
  return {
    async execute() {
      const [products, wallets] = await Promise.all([
        yieldRepository.getProducts(),
        walletBalancePort.listWallets(),
      ]);
      if (!products.ok) return products;
      if (!wallets.ok) return ok(products.value);

      const solana = wallets.value.find((wallet) =>
        isOnChain(wallet.blockchain, NATIVE_CHAIN_CODE),
      );

      return ok(
        products.value.map((product) => {
          const walletBalanceMinor = holdingMinor(solana, product.tokenSymbol);

          return walletBalanceMinor === undefined ? product : { ...product, walletBalanceMinor };
        }),
      );
    },
  };
}

function holdingMinor(wallet: Wallet | undefined, symbol: string): number | undefined {
  const held = wallet?.balances.find((balance) => balance.symbol === symbol);

  return held === undefined ? 0 : decimalToMinorFloor(held.amount);
}
