import { minorToDecimalString } from '@/core/money/money';
import type {
  TransferChallenge,
  TransferChallengeRequest,
} from '../../domain/entity/transfer-challenge';
import type { TransferChallengeBody } from '../datasource/transfer-challenge-remote-datasource';
import type { TransferChallengeDto } from '../model/transfer-challenge-model';

export function toTransferChallengeBody(request: TransferChallengeRequest): TransferChallengeBody {
  return {
    wallet_id: request.walletId,
    amount: minorToDecimalString(request.amountMinor),
    destination_address: request.destinationAddress,
    token_id: request.tokenId,
  };
}

export function toTransferChallenge(dto: TransferChallengeDto): TransferChallenge {
  return {
    challengeId: dto.challenge_id,
    userToken: dto.user_token,
    encryptionKey: dto.encryption_key,
  };
}
