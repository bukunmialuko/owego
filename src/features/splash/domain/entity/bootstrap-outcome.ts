import type { SplashProfile } from '../port/splash-port';

export type BootstrapDestination =
  'auth' | 'kyc' | 'create-wallet' | 'secure-session' | 'unlock' | 'home';

export type BootstrapStep =
  'restoring-session' | 'refreshing-token' | 'loading-profile' | 'loading-wallets' | 'finishing';

export type BootstrapOutcome = {
  destination: BootstrapDestination;
  profile?: SplashProfile;
  resumeTo?: Extract<BootstrapDestination, 'secure-session' | 'kyc' | 'home'>;
  offline: boolean;
};

export const STEP_PROGRESS: Record<BootstrapStep, number> = {
  'restoring-session': 0.15,
  'refreshing-token': 0.35,
  'loading-profile': 0.6,
  'loading-wallets': 0.85,
  finishing: 1,
};
