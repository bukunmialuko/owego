import type { AppError } from '@/core/errors/app-error';
import type { Result } from '@/core/result/result';

type DiditSession = {
  sessionId: string;
  sessionToken: string;
  url: string;
  status: string;
};

export interface KycRepository {
  createSession(): Promise<Result<DiditSession, AppError>>;
}
