declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';

  const content: FC<SvgProps>;
  export default content;
}

declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';

  const content: ImageSourcePropType;
  export default content;
}

declare module '*.jpg' {
  import type { ImageSourcePropType } from 'react-native';

  const content: ImageSourcePropType;
  export default content;
}

declare module '@env' {
  export const OWEGO_ENV: string | undefined;
  export const OWEGO_API_BASE_URL: string | undefined;
  export const OWEGO_SENTRY_DSN: string | undefined;
  export const OWEGO_SENTRY_TRACES_SAMPLE_RATE: string | undefined;
  export const OWEGO_PREVIEW_DATA: string | undefined;
  export const OWEGO_GOOGLE_WEB_CLIENT_ID: string | undefined;
  export const OWEGO_GOOGLE_IOS_CLIENT_ID: string | undefined;
  export const OWEGO_CIRCLE_APP_ID: string | undefined;
  export const OWEGO_SOLANA_CLUSTER: string | undefined;
  export const OWEGO_SOLANA_RPC_URL: string | undefined;
}
