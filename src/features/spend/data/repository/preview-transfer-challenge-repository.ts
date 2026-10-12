import { ok } from '@/core/result/result';
import type { TransferChallengeRepository } from '../../domain/repository/transfer-challenge-repository';

export function createPreviewTransferChallengeRepository(): TransferChallengeRepository {
  return {
    create: () =>
      Promise.resolve(
        ok({
          challengeId: 'preview-transfer-challenge',
          userToken: 'preview-user-token',
          encryptionKey: 'preview-encryption-key',
        }),
      ),
  };
}
