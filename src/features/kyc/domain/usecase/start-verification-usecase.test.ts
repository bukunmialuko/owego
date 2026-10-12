import { offline, unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import { KycState } from '@/core/session/onboarding-gate';
import type { DiditPort, KycProfilePort } from '../port/didit-port';
import type { KycRepository } from '../repository/kyc-repository';
import { createStartVerificationUseCase } from './start-verification-usecase';

const session = { sessionId: 's1', sessionToken: 'token-1', url: 'https://didit', status: 'open' };

function build(
  overrides: {
    createSession?: KycRepository['createSession'];
    verify?: DiditPort['verify'];
    reloadKycState?: KycProfilePort['reloadKycState'];
  } = {},
) {
  const verify = jest.fn(
    overrides.verify ?? (() => Promise.resolve(ok({ type: 'completed' as const }))),
  );
  const reloadKycState = jest.fn(
    overrides.reloadKycState ?? (() => Promise.resolve(ok(KycState.Approved))),
  );

  const usecase = createStartVerificationUseCase({
    kycRepository: {
      createSession: overrides.createSession ?? (() => Promise.resolve(ok(session))),
    },
    diditPort: { verify },
    profilePort: { reloadKycState },
  });

  return { usecase, verify, reloadKycState };
}

describe('StartVerificationUseCase', () => {
  it('hands the session token to the sdk', async () => {
    const { usecase, verify } = build();

    await usecase.execute();

    expect(verify).toHaveBeenCalledWith('token-1');
  });

  it('never opens the sdk when the session could not be created', async () => {
    const { usecase, verify } = build({ createSession: () => Promise.resolve(err(offline())) });

    await expect(usecase.execute()).resolves.toEqual(err(offline()));
    expect(verify).not.toHaveBeenCalled();
  });

  describe('when the flow completes', () => {
    it('reports the re-read state', async () => {
      const { usecase } = build({ reloadKycState: () => Promise.resolve(ok('APPROVED')) });

      await expect(usecase.execute()).resolves.toEqual(
        ok({ type: 'completed', state: KycState.Approved }),
      );
    });

    it('reports pending when the documents are still under review', async () => {
      const { usecase } = build({ reloadKycState: () => Promise.resolve(ok('PENDING')) });

      await expect(usecase.execute()).resolves.toEqual(
        ok({ type: 'completed', state: KycState.Pending }),
      );
    });

    it('passes a failed profile re-read through', async () => {
      const { usecase } = build({ reloadKycState: () => Promise.resolve(err(offline())) });

      await expect(usecase.execute()).resolves.toEqual(err(offline()));
    });
  });

  describe('when the flow does not complete', () => {
    it('reports a cancellation without re-reading the profile', async () => {
      const { usecase, reloadKycState } = build({
        verify: () => Promise.resolve(ok({ type: 'cancelled' as const })),
      });

      await expect(usecase.execute()).resolves.toEqual(ok({ type: 'cancelled' }));
      expect(reloadKycState).not.toHaveBeenCalled();
    });

    it.each([
      'camera-access-denied',
      'session-expired',
      'retry-blocked',
      'network',
      'unknown',
    ] as const)('carries the %s reason through for the screen to act on', async (reason) => {
      const { usecase, reloadKycState } = build({
        verify: () => Promise.resolve(ok({ type: 'failed' as const, reason })),
      });

      await expect(usecase.execute()).resolves.toEqual({
        ok: true,
        value: { type: 'failed', reason },
      });
      expect(reloadKycState).not.toHaveBeenCalled();
    });

    it('carries the camera-permission reason through, which the screen acts on', async () => {
      const { usecase } = build({
        verify: () =>
          Promise.resolve(ok({ type: 'failed' as const, reason: 'camera-access-denied' as const })),
      });

      await expect(usecase.execute()).resolves.toEqual(
        ok({ type: 'failed', reason: 'camera-access-denied' }),
      );
    });

    it('passes an sdk failure through as an error', async () => {
      const { usecase } = build({ verify: () => Promise.resolve(err(unknownError('sdk'))) });

      const result = await usecase.execute();

      expect(result.ok).toBe(false);
    });
  });

  describe('when the session comes back without a token', () => {
    const tokenless = () =>
      Promise.resolve(ok({ sessionId: 's1', sessionToken: '', url: '', status: '' }));

    it('never opens the sdk', async () => {
      const { usecase, verify } = build({ createSession: tokenless });

      await usecase.execute();

      expect(verify).not.toHaveBeenCalled();
    });

    it('reports the failure where the cause is legible', async () => {
      const { usecase } = build({ createSession: tokenless });

      const result = await usecase.execute();

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error('expected a missing-token failure');
      expect(result.error.detail).toMatch(/without a token/i);
    });
  });

  it('never lets the session token escape the use case', async () => {
    const { usecase, verify } = build();

    const result = await usecase.execute();

    expect(verify).toHaveBeenCalledWith('token-1');
    expect(JSON.stringify(result)).not.toContain('token-1');
  });
});
