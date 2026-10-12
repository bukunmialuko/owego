import { unknownError } from '@/core/errors/app-error';
import { andThen, err, ok } from '@/core/result/result';
import type { TransferChallengeRepository } from '../../domain/repository/transfer-challenge-repository';
import type { TransferChallengeRemoteDataSource } from '../datasource/transfer-challenge-remote-datasource';
import { toTransferChallenge, toTransferChallengeBody } from '../mapper/transfer-challenge-mapper';

export function createTransferChallengeRepositoryImpl({
  remoteDataSource,
}: {
  remoteDataSource: TransferChallengeRemoteDataSource;
}): TransferChallengeRepository {
  return {
    async create(request) {
      const response = await remoteDataSource.create(toTransferChallengeBody(request));

      return andThen(response, (dto) => {
        const challenge = toTransferChallenge(dto);

        const isUsable =
          challenge.challengeId !== '' &&
          challenge.userToken !== '' &&
          challenge.encryptionKey !== '';

        return isUsable
          ? ok(challenge)
          : err(unknownError('Transfer challenge incomplete: the backend returned a blank field.'));
      });
    },
  };
}
