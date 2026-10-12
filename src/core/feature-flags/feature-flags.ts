export const FeatureFlag = {
  Credit: 'feature.credit',
  Travel: 'feature.travel',
  TravelEsim: 'feature.travel.esim',
  EmailOtpSignIn: 'feature.auth.emailOtp',
} as const;

export type FeatureFlag = (typeof FeatureFlag)[keyof typeof FeatureFlag];

export interface FeatureFlags {
  isEnabled(flag: FeatureFlag): boolean;
}

export function createStaticFeatureFlags(
  overrides: Partial<Record<FeatureFlag, boolean>> = {},
): FeatureFlags {
  return {
    isEnabled(flag) {
      return overrides[flag] ?? DEFAULTS[flag];
    },
  };
}

const DEFAULTS: Record<FeatureFlag, boolean> = {
  [FeatureFlag.Credit]: false,
  [FeatureFlag.Travel]: false,
  [FeatureFlag.TravelEsim]: false,
  [FeatureFlag.EmailOtpSignIn]: false,
};
