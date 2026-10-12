import { z } from 'zod';
import { fromZodError, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';

const API_PATH_PREFIX = '/api/v1';

const appConfigSchema = z.object({
  environment: z.enum(['development', 'staging', 'production']),
  apiBaseUrl: z
    .url({ protocol: /^https?$/ })
    .refine((url) => url.replace(/\/+$/, '').endsWith(API_PATH_PREFIX), {
      error: `must end with the api path prefix ${API_PATH_PREFIX}, e.g. https://host${API_PATH_PREFIX}`,
    }),
  sentryDsn: z.string().optional(),
  sentryTracesSampleRate: z.number().min(0).max(1).default(0),
  googleWebClientId: z.string().min(1),
  googleIosClientId: z.string().min(1),
  circleAppId: z.string().min(1),
  solanaCluster: z.enum(['devnet', 'mainnet-beta']),
  solanaRpcUrl: z.url({ protocol: /^https$/ }),
  usePreviewData: z.boolean().default(false),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
/** @public */
export type Environment = AppConfig['environment'];
export type SolanaCluster = AppConfig['solanaCluster'];

export function loadAppConfig(source: unknown): Result<AppConfig, AppError> {
  const parsed = appConfigSchema.safeParse(source);

  return parsed.success ? ok(parsed.data) : err(fromZodError(parsed.error));
}
