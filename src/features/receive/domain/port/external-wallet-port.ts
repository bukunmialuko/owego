import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';
import type {
  DepositSubmission,
  DepositTransfer,
  RecentBlockhash,
} from '../entity/external-deposit';
import type { ConnectOutcome, ExternalWalletAccount } from '../entity/external-wallet';

export interface ExternalWalletPort {
  connect(): Promise<Result<ConnectOutcome, AppError>>;

  signAndSend(
    account: ExternalWalletAccount,
    transfer: DepositTransfer,
    blockhash: RecentBlockhash,
  ): Promise<Result<DepositSubmission, AppError>>;
}
