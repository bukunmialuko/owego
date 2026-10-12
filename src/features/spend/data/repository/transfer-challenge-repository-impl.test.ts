import { offline, unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type {
  TransferChallengeBody,
  TransferChallengeRemoteDataSource,
} from '../datasource/transfer-challenge-remote-datasource';
import type { TransferChallengeDto } from '../model/transfer-challenge-model';
import { createTransferChallengeRepositoryImpl } from './transfer-challenge-repository-impl';

const REQUEST = {
  walletId: 'sol-wallet',
  tokenId: 'usdt-sol',
  destinationAddress: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
  amountMinor: 10,
};

function repositoryOver(result: Awaited<ReturnType<TransferChallengeRemoteDataSource['create']>>) {
  const bodies: TransferChallengeBody[] = [];
  const remoteDataSource: TransferChallengeRemoteDataSource = {
    create: (body) => {
      bodies.push(body);
      return Promise.resolve(result);
    },
  };

  return { repository: createTransferChallengeRepositoryImpl({ remoteDataSource }), bodies };
}

const DTO: TransferChallengeDto = {
  challenge_id: 'chal_1',
  user_token: 'utok_1',
  encryption_key: 'key_1',
};

describe('transfer challenge repository', () => {
  it('sends the request as the wire body', async () => {
    const { repository, bodies } = repositoryOver(ok(DTO));

    await repository.create(REQUEST);

    expect(bodies).toEqual([
      {
        wallet_id: 'sol-wallet',
        amount: '0.1',
        destination_address: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
        token_id: 'usdt-sol',
      },
    ]);
  });

  it('returns the challenge', async () => {
    const { repository } = repositoryOver(ok(DTO));

    await expect(repository.create(REQUEST)).resolves.toEqual(
      ok({ challengeId: 'chal_1', userToken: 'utok_1', encryptionKey: 'key_1' }),
    );
  });

  it.each(['challenge_id', 'user_token', 'encryption_key'] as const)(
    'refuses a challenge with a blank %s before it reaches Circle',
    async (field) => {
      const { repository } = repositoryOver(ok({ ...DTO, [field]: '' }));

      const result = await repository.create(REQUEST);

      expect(result).toEqual(
        err(unknownError('Transfer challenge incomplete: the backend returned a blank field.')),
      );
    },
  );

  it('passes a failed request through', async () => {
    const { repository } = repositoryOver(err(offline()));

    await expect(repository.create(REQUEST)).resolves.toEqual(err(offline()));
  });
});
