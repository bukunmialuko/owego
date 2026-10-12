import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

export type TokenBalance = {
  tokenId: string;
  symbol: string;
  amount: string;
  decimals: number;
};

export type Wallet = {
  id: string;
  address: string;
  blockchain: string;
  balances: TokenBalance[];
};

export function isUsableWallet(wallet: Pick<Wallet, 'id' | 'address'>): boolean {
  return wallet.id !== '' && wallet.address !== '';
}

export interface WalletBalancePort {
  listWallets(): Promise<Result<Wallet[], AppError>>;
}
