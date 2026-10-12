import type { AppConfig } from '@/core/config/app-config';

export const testAppConfig: AppConfig = {
  environment: 'development',
  apiBaseUrl: 'https://api.test/api/v1',
  sentryTracesSampleRate: 0,
  googleWebClientId: 'test-web.apps.googleusercontent.com',
  googleIosClientId: 'test-ios.apps.googleusercontent.com',
  circleAppId: 'test-circle-app-id',
  solanaCluster: 'devnet',
  solanaRpcUrl: 'https://rpc.solana.test',
  usePreviewData: false,
};
