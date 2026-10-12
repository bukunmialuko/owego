import { isAppError, type AppError } from './app-error';

export class AppErrorException extends Error {
  readonly appError: AppError;

  constructor(appError: AppError) {
    super(appError.code);
    this.name = 'AppErrorException';
    this.appError = appError;
  }
}

export function toAppError(thrown: unknown): AppError | undefined {
  if (thrown instanceof AppErrorException) return thrown.appError;

  return isAppError(thrown) ? thrown : undefined;
}
