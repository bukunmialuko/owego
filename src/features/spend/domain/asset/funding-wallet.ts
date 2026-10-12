import { decimalToMinorFloor } from '@/core/money/money';
import type { Wallet } from '@/core/wallet/wallet';

export type FundingWallet = {
  walletId: string;
  walletAddress: string;
  tokenId: string;
};

export function findFundingWallet(wallets: Wallet[], symbol: string): FundingWallet | undefined {
  let best: { wallet: FundingWallet; balanceMinor: number } | undefined;

  for (const wallet of wallets) {
    const row = wallet.balances.find((balance) => balance.symbol === symbol);
    const balanceMinor = row === undefined ? undefined : decimalToMinorFloor(row.amount);

    if (row === undefined || balanceMinor === undefined) continue;
    if (wallet.id === '' || wallet.address === '' || row.tokenId === '') continue;
    if (best !== undefined && best.balanceMinor >= balanceMinor) continue;

    best = {
      wallet: { walletId: wallet.id, walletAddress: wallet.address, tokenId: row.tokenId },
      balanceMinor,
    };
  }

  return best?.wallet;
}
