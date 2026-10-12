import type { AppError } from '@/core/errors/app-error';
import { ok, type Result } from '@/core/result/result';
import type { WalletBalancePort } from '@/core/wallet/wallet';
import { isSendableToken, sendNetworkFor } from '../asset/send-networks';
import { findSendableAsset, sendableBalanceMinor } from '../asset/sendable-asset';
import type { NotSentReason, SendOutcome } from '../entity/send-outcome';
import type { TransferSigningPort } from '../port/transfer-signing-port';
import type { TransferChallengeRepository } from '../repository/transfer-challenge-repository';
import { SIGNING_TIMEOUT_MS, signTransfer } from './sign-transfer-usecase';
import { validateSendAddress } from './validate-send-address-usecase';

export type SendAssetRequest = {
  networkCode: string;
  tokenSymbol: string;
  destinationAddress: string;
  amountMinor: number;
};

type Dependencies = {
  walletBalancePort: WalletBalancePort;
  transferChallengeRepository: TransferChallengeRepository;
  transferSigningPort: TransferSigningPort;
  signingTimeoutMs?: number;
};

export interface SendAssetUseCase {
  execute(request: SendAssetRequest): Promise<Result<SendOutcome, AppError>>;
}

export function createSendAssetUseCase({
  walletBalancePort,
  transferChallengeRepository,
  transferSigningPort,
  signingTimeoutMs = SIGNING_TIMEOUT_MS,
}: Dependencies): SendAssetUseCase {
  return {
    async execute(request) {
      const destinationAddress = request.destinationAddress.trim();
      const { tokenSymbol, amountMinor } = request;
      const network = sendNetworkFor(request.networkCode);

      if (
        !isSendableToken(tokenSymbol) ||
        network === undefined ||
        !validateSendAddress(destinationAddress, network.code).valid ||
        !Number.isSafeInteger(amountMinor) ||
        amountMinor <= 0
      ) {
        return notSent('invalidRequest');
      }

      const wallets = await walletBalancePort.listWallets();
      if (!wallets.ok) return wallets;

      const asset = findSendableAsset(wallets.value, network.code, tokenSymbol);
      const balanceMinor = sendableBalanceMinor(wallets.value, network.code, tokenSymbol);

      if (asset === undefined || balanceMinor === undefined || amountMinor > balanceMinor) {
        return notSent('insufficientBalance');
      }

      const challenge = await transferChallengeRepository.create({
        walletId: asset.walletId,
        tokenId: asset.tokenId,
        destinationAddress,
        amountMinor,
      });
      if (!challenge.ok) return challenge;

      return ok(await signTransfer(transferSigningPort, challenge.value, signingTimeoutMs));
    },
  };
}

function notSent(reason: NotSentReason): Result<SendOutcome, AppError> {
  return ok({ type: 'notSent', reason });
}
