import {
  startVerification,
  type VerificationErrorType,
  type VerificationResult as DiditResult,
} from '@didit-protocol/sdk-react-native';
import { unknownError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type {
  VerificationFailureReason,
  VerificationOutcome,
} from '../../domain/entity/kyc-entity';
import type { DiditPort } from '../../domain/port/didit-port';

export function createDiditSdkAdapter(): DiditPort {
  return {
    async verify(sessionToken: string): Promise<Result<VerificationOutcome, AppError>> {
      try {
        const result = await startVerification(sessionToken, { loggingEnabled: false });

        return ok(toOutcome(result));
      } catch (cause) {
        return err(unknownError('Didit verification could not run.', cause));
      }
    },
  };
}

function toOutcome(result: DiditResult): VerificationOutcome {
  switch (result.type) {
    case 'completed':
      return { type: 'completed' };
    case 'cancelled':
      return { type: 'cancelled' };
    case 'failed':
      return { type: 'failed', reason: toReason(result.error.type) };
  }
}

function toReason(type: VerificationErrorType): VerificationFailureReason {
  switch (type) {
    case 'cameraAccessDenied':
      return 'camera-access-denied';
    case 'sessionExpired':
      return 'session-expired';
    case 'retryBlocked':
      return 'retry-blocked';
    case 'networkError':
      return 'network';
    case 'notInitialized':
    case 'apiError':
    case 'unknown':
      return 'unknown';
  }
}
