import axios, {
  type AxiosAdapter,
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';
import { devLog } from '@/core/log/dev-log';
import { fromHttp } from '@/core/errors/from-http';
import { fromUnknown, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import { shouldAttemptRefresh, shouldAttemptSessionRefreshForStatus } from './auth-refresh-policy';
import type { RefreshTokenService } from './refresh-token-service';
import type { TokenStore } from './auth-tokens';

type AuthConfig = {
  tokenStore: TokenStore;
  refreshService: RefreshTokenService;
  onSessionExpired: () => void;
};

export type HttpClientOptions = {
  baseUrl: string;
  timeoutMs?: number;
  adapter?: AxiosAdapter;
  auth?: AuthConfig;
};

type RequestOptions = {
  skipAuthRefresh?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
  headers?: Record<string, string>;
};

export interface HttpClient {
  get<T>(url: string, options?: RequestOptions): Promise<Result<T, AppError>>;
  post<T>(url: string, body?: unknown, options?: RequestOptions): Promise<Result<T, AppError>>;
  put<T>(url: string, body?: unknown, options?: RequestOptions): Promise<Result<T, AppError>>;
  patch<T>(url: string, body?: unknown, options?: RequestOptions): Promise<Result<T, AppError>>;
  delete<T>(url: string, options?: RequestOptions): Promise<Result<T, AppError>>;
}

type InternalConfig = AxiosRequestConfig & {
  skipAuthRefresh?: boolean;
};

const DEFAULT_TIMEOUT_MS = 300_000;

export function createHttpClient(options: HttpClientOptions): HttpClient {
  const instance = axios.create({
    baseURL: options.baseUrl,
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    ...(options.adapter === undefined ? {} : { adapter: options.adapter }),
    validateStatus: () => true,
  });

  const send: (config: InternalConfig) => Promise<AxiosResponse<unknown>> = options.auth
    ? authenticatedSender(instance, options.auth)
    : (config) => instance.request(config);

  async function request<T>(config: InternalConfig): Promise<Result<T, AppError>> {
    const label = `${config.method} ${(config.url ?? '').split('?')[0] ?? ''}`;
    const startedAt = Date.now();
    const elapsed = () => Date.now() - startedAt;

    try {
      const response = await send(config);

      if (response.status >= 200 && response.status < 300) {
        devLog('http', label, { status: response.status, ms: elapsed() });

        return ok(response.data as T);
      }

      const failure = fromHttp({
        status: response.status,
        data: response.data,
        headers: normalizeHeaders(response.headers),
      });
      devLog('http', label, { status: response.status, code: failure.code, ms: elapsed() });

      return err(failure);
    } catch (cause) {
      const failure = toTransportError(cause);
      devLog('http', `${label} failed`, { code: failure.code, ms: elapsed() });

      return err(failure);
    }
  }

  return {
    get: (url, opts) => request({ method: 'GET', url, ...toConfig(opts) }),
    post: (url, body, opts) => request({ method: 'POST', url, data: body, ...toConfig(opts) }),
    put: (url, body, opts) => request({ method: 'PUT', url, data: body, ...toConfig(opts) }),
    patch: (url, body, opts) => request({ method: 'PATCH', url, data: body, ...toConfig(opts) }),
    delete: (url, opts) => request({ method: 'DELETE', url, ...toConfig(opts) }),
  };
}

function authenticatedSender(instance: AxiosInstance, auth: AuthConfig) {
  let signedOut = false;

  return async function send(config: InternalConfig): Promise<AxiosResponse<unknown>> {
    const attempt = async (accessToken?: string): Promise<AxiosResponse<unknown>> => {
      const access = accessToken ?? (await auth.tokenStore.read())?.access;

      return instance.request({
        ...config,
        headers: {
          ...(access === undefined ? {} : { Authorization: `Bearer ${access}` }),
          ...config.headers,
        },
      });
    };

    const response = await attempt();

    if (!shouldAttemptSessionRefreshForStatus(response.status)) return response;
    if (!shouldAttemptRefresh({ url: config.url ?? '', ...pickRefreshFlags(config) })) {
      return response;
    }

    const outcome = await auth.refreshService.refresh();

    if (outcome.type === 'invalid-session') {
      if (!signedOut) {
        signedOut = true;
        auth.onSessionExpired();
      }
      return response;
    }

    if (outcome.type === 'transient') return response;

    return attempt(outcome.tokens.access);
  };
}

function pickRefreshFlags(config: InternalConfig) {
  return config.skipAuthRefresh === undefined ? {} : { skipAuthRefresh: config.skipAuthRefresh };
}

function toConfig(options?: RequestOptions): Partial<InternalConfig> {
  if (options === undefined) return {};

  return {
    ...(options.skipAuthRefresh === undefined ? {} : { skipAuthRefresh: options.skipAuthRefresh }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
    ...(options.timeoutMs === undefined ? {} : { timeout: options.timeoutMs }),
    ...(options.headers === undefined ? {} : { headers: options.headers }),
  };
}

function toTransportError(cause: unknown): AppError {
  const axiosError = cause as AxiosError;

  if (axiosError.isAxiosError === true) {
    return fromHttp({
      isTimeout: axiosError.code === 'ECONNABORTED',
      isCancelled: axiosError.code === 'ERR_CANCELED',
    });
  }

  return fromUnknown(cause);
}

function normalizeHeaders(headers: unknown): Record<string, string | undefined> {
  if (typeof headers !== 'object' || headers === null) return {};

  return Object.fromEntries(
    Object.entries(headers as Record<string, unknown>).map(([key, value]) => [
      key.toLowerCase(),
      typeof value === 'string' ? value : undefined,
    ]),
  );
}
