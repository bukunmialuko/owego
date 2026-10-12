import {
  ErrorCategory,
  ErrorCode,
  forbidden,
  cancelled,
  offline,
  rateLimited,
  serverError,
  timeout,
  unauthenticated,
  unknownError,
  type AppError,
} from './app-error';

export type HttpFailure = {
  status?: number;
  data?: unknown;
  headers?: Readonly<Record<string, string | undefined>>;
  isTimeout?: boolean;
  isCancelled?: boolean;
};

export function fromHttp(failure: HttpFailure): AppError {
  const { status, data, headers } = failure;

  if (status === undefined) {
    if (failure.isCancelled === true) return withContext(cancelled(), failure);

    return withContext(failure.isTimeout ? timeout() : offline(), failure);
  }

  switch (status) {
    case 401:
      return withContext(unauthenticated(), failure);
    case 403:
      return withContext(forbidden(), failure);
    case 429:
      return withContext(rateLimited(retryAfterSeconds(headers)), failure);
    default:
      break;
  }

  if (status >= 500) return withContext(serverError(status), failure);

  if (status === 400 || status === 422) {
    const invalidInput: AppError = {
      code: ErrorCode.InvalidInput,
      category: ErrorCategory.Validation,
      titleKey: 'errors.validation.invalidInput',
      httpStatus: status,
      retryable: false,
    };
    const fieldErrors = fieldErrorsFrom(data);

    return withContext(fieldErrors ? { ...invalidInput, fieldErrors } : invalidInput, failure);
  }

  return withContext({ ...unknownError(), httpStatus: status }, failure);
}

function withContext(error: AppError, failure: HttpFailure): AppError {
  const detail = detailFrom(failure.data);
  const traceId = failure.headers?.['x-request-id'] ?? failure.headers?.['x-trace-id'];

  return {
    ...error,
    ...(detail === undefined ? {} : { detail }),
    ...(traceId === undefined ? {} : { traceId }),
  };
}

function detailFrom(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined;

  const errors: unknown = data['errors'];
  if (Array.isArray(errors)) {
    const first: unknown = errors[0];
    if (isRecord(first) && typeof first['detail'] === 'string') return first['detail'];
  }

  if (typeof data['message'] === 'string') return data['message'];

  const devMessage = data['dev_msg'];
  if (typeof devMessage === 'string') {
    return unwrapEmbeddedJson(devMessage);
  }

  return typeof data['msg'] === 'string' ? data['msg'] : undefined;
}

function unwrapEmbeddedJson(value: string): string {
  try {
    const parsed: unknown = JSON.parse(value);
    if (isRecord(parsed) && typeof parsed['message'] === 'string') return parsed['message'];
  } catch {
    // Not JSON, which is the common case.
  }

  return value;
}

function fieldErrorsFrom(data: unknown): Record<string, string> | undefined {
  if (!isRecord(data) || !isRecord(data['errors'])) return undefined;

  const entries = Object.entries(data['errors']).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function retryAfterSeconds(headers: HttpFailure['headers']): number | undefined {
  const raw = headers?.['retry-after'];
  if (raw === undefined) return undefined;

  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
