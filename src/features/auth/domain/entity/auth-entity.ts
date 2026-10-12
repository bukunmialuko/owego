import type { AuthTokens } from '@/core/network/auth-tokens';

/** @public */
export type AuthProvider = 'google' | 'apple' | 'email';

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  isBusiness: boolean;
  businessName: string;
  pictureUrl: string;
  kycState: string;
};

export type VerificationStatus = {
  kycVerified: boolean;
  isPinSet: boolean;
};

export type Session = {
  user: UserProfile;
  tokens: AuthTokens;
  verification: VerificationStatus;
};

export type OAuthCredential = {
  idToken: string;
  givenName?: string;
  familyName?: string;
};
