import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, map, ok, type Result } from '@/core/result/result';
import { toKycState, type KycState } from '@/core/session/onboarding-gate';
import type { VerificationFailureReason, VerificationOutcome } from '../entity/kyc-entity';
import type { DiditPort, KycProfilePort } from '../port/didit-port';
import type { KycRepository } from '../repository/kyc-repository';

type Dependencies = {
  kycRepository: KycRepository;
  diditPort: DiditPort;
  profilePort: KycProfilePort;
};

type VerificationResult =
  | { type: 'completed'; state: KycState }
  | { type: 'cancelled' }
  | { type: 'failed'; reason: VerificationFailureReason };

export interface StartVerificationUseCase {
  execute(): Promise<Result<VerificationResult, AppError>>;
}

export function createStartVerificationUseCase({
  kycRepository,
  diditPort,
  profilePort,
}: Dependencies): StartVerificationUseCase {
  async function resolve(
    outcome: VerificationOutcome,
  ): Promise<Result<VerificationResult, AppError>> {
    if (outcome.type !== 'completed') return ok(outcome);

    const reloaded = await profilePort.reloadKycState();

    return map(reloaded, (raw) => ({ type: 'completed' as const, state: toKycState(raw) }));
  }

  return {
    async execute() {
      const session = await kycRepository.createSession();
      if (!session.ok) return session;

      if (session.value.sessionToken === '') {
        return err(unknownError('The KYC session came back without a token.'));
      }

      const outcome = await diditPort.verify(session.value.sessionToken);
      if (!outcome.ok) return outcome;

      return resolve(outcome.value);
    },
  };
}
