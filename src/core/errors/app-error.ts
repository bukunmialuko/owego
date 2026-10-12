import type { ZodError } from 'zod';
import type { TranslationKey } from '@/core/i18n/translation-key';

export type AppError = {
  readonly code: ErrorCode;
  readonly category: ErrorCategory;
  readonly titleKey: TranslationKey;
  readonly detail?: string;
  readonly httpStatus?: number;
  readonly traceId?: string;
  readonly fieldErrors?: Readonly<Record<string, string>>;
  readonly retryable: boolean;
  readonly retryAfterSeconds?: number;
  readonly cause?: unknown;
};

export const ErrorCategory = {
  Network: 'network',
  Auth: 'auth',
  Validation: 'validation',
  Domain: 'domain',
  Server: 'server',
  Unknown: 'unknown',
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

export const ErrorCode = {
  NetworkOffline: 'network/offline',
  NetworkTimeout: 'network/timeout',
  NetworkCancelled: 'network/cancelled',
  ServerInternal: 'server/internal',
  RateLimited: 'common/rate-limited',
  Unknown: 'common/unknown',
  Unauthenticated: 'auth/unauthenticated',
  Forbidden: 'auth/forbidden',
  KycNotCompleted: 'auth/kyc-not-completed',
  WalletNotCreated: 'wallet/not-created',
  InvalidInput: 'validation/invalid-input',
  CountryNotSelected: 'validation/country-not-selected',
  SignInCancelled: 'auth/sign-in-cancelled',
  PromptCancelled: 'auth/prompt-cancelled',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export function isAppError(value: unknown): value is AppError {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<AppError>;
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.category === 'string' &&
    typeof candidate.titleKey === 'string' &&
    typeof candidate.retryable === 'boolean'
  );
}

export const offline = (): AppError => ({
  code: ErrorCode.NetworkOffline,
  category: ErrorCategory.Network,
  titleKey: 'errors.network.offline',
  retryable: true,
});

export const timeout = (): AppError => ({
  code: ErrorCode.NetworkTimeout,
  category: ErrorCategory.Network,
  titleKey: 'errors.network.timeout',
  retryable: true,
});

export const cancelled = (): AppError => ({
  code: ErrorCode.NetworkCancelled,
  category: ErrorCategory.Network,
  titleKey: 'errors.network.cancelled',
  retryable: false,
});

export const serverError = (httpStatus = 500, detail?: string): AppError => ({
  code: ErrorCode.ServerInternal,
  category: ErrorCategory.Server,
  titleKey: 'errors.server.internal',
  httpStatus,
  retryable: true,
  ...(detail === undefined ? {} : { detail }),
});

export const rateLimited = (retryAfterSeconds?: number): AppError => ({
  code: ErrorCode.RateLimited,
  category: ErrorCategory.Network,
  titleKey: 'errors.common.rateLimited',
  httpStatus: 429,
  retryable: true,
  ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
});

export const unauthenticated = (): AppError => ({
  code: ErrorCode.Unauthenticated,
  category: ErrorCategory.Auth,
  titleKey: 'errors.auth.unauthenticated',
  httpStatus: 401,
  retryable: false,
});

export const forbidden = (): AppError => ({
  code: ErrorCode.Forbidden,
  category: ErrorCategory.Auth,
  titleKey: 'errors.auth.forbidden',
  httpStatus: 403,
  retryable: false,
});

export const kycNotCompleted = (): AppError => ({
  code: ErrorCode.KycNotCompleted,
  category: ErrorCategory.Domain,
  titleKey: 'errors.auth.kycNotCompleted',
  retryable: false,
});

export const walletNotCreated = (): AppError => ({
  code: ErrorCode.WalletNotCreated,
  category: ErrorCategory.Domain,
  titleKey: 'errors.wallet.notCreated',
  retryable: false,
});

export const countryNotSelected = (): AppError => ({
  code: ErrorCode.CountryNotSelected,
  category: ErrorCategory.Validation,
  titleKey: 'errors.validation.countryRequired',
  retryable: false,
});

export const signInCancelled = (): AppError => ({
  code: ErrorCode.SignInCancelled,
  category: ErrorCategory.Auth,
  titleKey: 'errors.auth.signInCancelled',
  retryable: false,
});

export const promptCancelled = (cause?: unknown): AppError => ({
  code: ErrorCode.PromptCancelled,
  category: ErrorCategory.Auth,
  titleKey: 'errors.auth.promptCancelled',
  retryable: true,
  ...(cause === undefined ? {} : { cause }),
});

export const unknownError = (detail?: string, cause?: unknown): AppError => ({
  code: ErrorCode.Unknown,
  category: ErrorCategory.Unknown,
  titleKey: 'errors.common.unknown',
  retryable: false,
  ...(detail === undefined ? {} : { detail }),
  ...(cause === undefined ? {} : { cause }),
});

export function fromUnknown(cause: unknown): AppError {
  if (isAppError(cause)) return cause;
  if (cause instanceof Error) return unknownError(cause.message, cause);
  return unknownError(typeof cause === 'string' ? cause : JSON.stringify(cause), cause);
}

export function isServerRefusal(error: AppError): boolean {
  return error.code === ErrorCode.InvalidInput && error.httpStatus !== undefined;
}

export function fromZodError(error: ZodError): AppError {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.issues) {
    const path = issue.path.join('.');
    fieldErrors[path] ??= issue.message;
  }

  return {
    code: ErrorCode.InvalidInput,
    category: ErrorCategory.Validation,
    titleKey: 'errors.validation.invalidInput',
    retryable: false,
    fieldErrors,
    cause: error,
  };
}
