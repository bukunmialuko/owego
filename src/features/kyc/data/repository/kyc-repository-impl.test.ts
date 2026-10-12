import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { KycRemoteDataSource } from '../datasource/kyc-remote-datasource';
import { diditSessionSchema } from '../model/didit-session-model';
import { createKycRepositoryImpl } from './kyc-repository-impl';

const sessionDto = diditSessionSchema.parse({
  session_id: 's1',
  session_token: 'token-1',
  url: 'https://verify.didit.me/s1',
  status: 'Not Started',
});

function build(remote: Partial<KycRemoteDataSource> = {}) {
  const remoteDataSource = {
    createSession: jest.fn().mockResolvedValue(ok(sessionDto)),
    ...remote,
  } satisfies KycRemoteDataSource;

  return { repository: createKycRepositoryImpl(remoteDataSource), remoteDataSource };
}

describe('KycRepository', () => {
  it('maps the wire payload onto the domain session', async () => {
    const { repository } = build();

    await expect(repository.createSession()).resolves.toEqual({
      ok: true,
      value: {
        sessionId: 's1',
        sessionToken: 'token-1',
        url: 'https://verify.didit.me/s1',
        status: 'Not Started',
      },
    });
  });

  it('passes a failure through untouched', async () => {
    const { repository } = build({ createSession: jest.fn().mockResolvedValue(err(offline())) });

    await expect(repository.createSession()).resolves.toEqual({ ok: false, error: offline() });
  });

  it('never caches the session', async () => {
    const { repository, remoteDataSource } = build();

    await repository.createSession();
    await repository.createSession();

    expect(remoteDataSource.createSession).toHaveBeenCalledTimes(2);
  });
});
