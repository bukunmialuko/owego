import type { SolanaCluster } from '@/core/config/app-config';
import type { AppError } from '@/core/errors/app-error';
import { ok, type Result } from '@/core/result/result';
import { toTokenBaseUnits } from '../entity/deposit-amount';
import { depositTokenFor, type DepositTokenSymbol } from '../entity/deposit-token';
import type { DepositNotSentReason, DepositSubmission } from '../entity/external-deposit';
import type { ExternalWalletAccount } from '../entity/external-wallet';
import type { ExternalWalletPort } from '../port/external-wallet-port';
import type { SolanaWalletAddressPort } from '../port/solana-wallet-address-port';
import type { SolanaNetworkRepository } from '../repository/solana-network-repository';

export type ExternalDepositRequest = {
  account: ExternalWalletAccount;
  tokenSymbol: DepositTokenSymbol;
  amountMinor: number;
};

type Dependencies = {
  cluster: SolanaCluster;
  solanaWalletAddressPort: SolanaWalletAddressPort;
  solanaNetworkRepository: SolanaNetworkRepository;
  externalWalletPort: ExternalWalletPort;
};

export interface SubmitExternalDepositUseCase {
  execute(request: ExternalDepositRequest): Promise<Result<DepositSubmission, AppError>>;
}

export function createSubmitExternalDepositUseCase({
  cluster,
  solanaWalletAddressPort,
  solanaNetworkRepository,
  externalWalletPort,
}: Dependencies): SubmitExternalDepositUseCase {
  return {
    async execute({ account, tokenSymbol, amountMinor }) {
      const token = depositTokenFor(cluster, tokenSymbol);
      const amount =
        token === undefined ? undefined : toTokenBaseUnits(amountMinor, token.decimals);
      if (token === undefined || amount === undefined) return notSent('invalidRequest');

      const destination = await solanaWalletAddressPort.getSolanaAddress();
      if (!destination.ok) return destination;
      if (destination.value === undefined) return notSent('noDestination');
      if (destination.value === account.address) return notSent('invalidRequest');

      const blockhash = await solanaNetworkRepository.getRecentBlockhash();
      if (!blockhash.ok) return blockhash;

      return externalWalletPort.signAndSend(
        account,
        { token, source: account.address, destination: destination.value, amount },
        blockhash.value,
      );
    },
  };
}

function notSent(reason: DepositNotSentReason): Result<DepositSubmission, AppError> {
  return ok({ type: 'notSent', reason });
}
