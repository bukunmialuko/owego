import type { AppError } from '@/core/errors/app-error';
import { fromDecimal, toApiMinor, type CurrencyCode } from '@/core/money/money';
import { ok, type Result } from '@/core/result/result';
import { DOLLAR_STABLECOINS } from '@/core/wallet/available-balance';
import type { Wallet, WalletBalancePort } from '@/core/wallet/wallet';
import type { PendingTransactionsPort } from '../port/pending-transactions-port';
import type { AccountRepository } from '../repository/account-repository';

type Dependencies = {
  walletBalancePort: WalletBalancePort;
  pendingTransactionsPort: PendingTransactionsPort;
  accountRepository: AccountRepository;
};

export type DeletionBlocker = {
  type: 'funds' | 'pending';
  amountMinor: number;
  currency: CurrencyCode;
};

type DeleteAccountOutcome = { type: 'deleted' } | { type: 'blocked'; blockers: DeletionBlocker[] };

const ACCOUNT_CURRENCY: CurrencyCode = 'USD';

export interface DeleteAccountUseCase {
  findBlockers(): Promise<Result<DeletionBlocker[], AppError>>;
  execute(): Promise<Result<DeleteAccountOutcome, AppError>>;
}

export function createDeleteAccountUseCase({
  walletBalancePort,
  pendingTransactionsPort,
  accountRepository,
}: Dependencies): DeleteAccountUseCase {
  async function findBlockers(): Promise<Result<DeletionBlocker[], AppError>> {
    const wallets = await walletBalancePort.listWallets();
    if (!wallets.ok) return wallets;

    const pending = await pendingTransactionsPort.listPending();
    if (!pending.ok) return pending;

    const blockers: DeletionBlocker[] = [];
    const funds = heldMinor(wallets.value);

    if (funds > 0) blockers.push({ type: 'funds', amountMinor: funds, currency: ACCOUNT_CURRENCY });

    const inFlight = pending.value.reduce((sum, entry) => sum + entry.amountMinor, 0);

    if (inFlight > 0) {
      blockers.push({ type: 'pending', amountMinor: inFlight, currency: ACCOUNT_CURRENCY });
    }

    return ok(blockers);
  }

  return {
    findBlockers,

    async execute() {
      const blockers = await findBlockers();
      if (!blockers.ok) return blockers;

      if (blockers.value.length > 0) return ok({ type: 'blocked', blockers: blockers.value });

      const removed = await accountRepository.deleteAccount();
      if (!removed.ok) return removed;

      return ok({ type: 'deleted' });
    },
  };
}

function heldMinor(wallets: Wallet[]): number {
  return wallets
    .flatMap((wallet) => wallet.balances)
    .filter((entry) => DOLLAR_STABLECOINS.includes(entry.symbol))
    .reduce((sum, entry) => sum + toApiMinor(fromDecimal(entry.amount, ACCOUNT_CURRENCY)), 0);
}
