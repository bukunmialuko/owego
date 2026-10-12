import {
  OWEGO_API_BASE_URL,
  OWEGO_CIRCLE_APP_ID,
  OWEGO_ENV,
  OWEGO_GOOGLE_IOS_CLIENT_ID,
  OWEGO_GOOGLE_WEB_CLIENT_ID,
  OWEGO_PREVIEW_DATA,
  OWEGO_SENTRY_DSN,
  OWEGO_SENTRY_TRACES_SAMPLE_RATE,
  OWEGO_SOLANA_CLUSTER,
  OWEGO_SOLANA_RPC_URL,
} from '@env';

export function readRuntimeConfig(): Record<string, unknown> {
  return {
    environment: OWEGO_ENV ?? 'development',
    apiBaseUrl: OWEGO_API_BASE_URL ?? 'http://localhost:8000/api/v1',
    sentryTracesSampleRate: Number(OWEGO_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    usePreviewData: OWEGO_PREVIEW_DATA === 'true',
    googleWebClientId: OWEGO_GOOGLE_WEB_CLIENT_ID,
    googleIosClientId: OWEGO_GOOGLE_IOS_CLIENT_ID,
    circleAppId: OWEGO_CIRCLE_APP_ID,
    solanaCluster: OWEGO_SOLANA_CLUSTER,
    solanaRpcUrl: OWEGO_SOLANA_RPC_URL,
    ...(OWEGO_SENTRY_DSN === undefined ? {} : { sentryDsn: OWEGO_SENTRY_DSN }),
  };
}
