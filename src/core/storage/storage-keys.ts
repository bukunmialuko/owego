export const SecureKey = {
  AuthToken: 'auth_token',
  AppLockPinHash: 'app_lock_pin_hash',
  SessionKeyBiometric: 'session_key_biometric',
  SessionKeyPinSealed: 'session_key_pin_sealed',
  SessionPublicKey: 'session_public_key',
  RefreshTokenSealed: 'refresh_token_sealed',
  RefreshTokenBiometric: 'refresh_token_biometric',
  RefreshTokenPinSealed: 'refresh_token_pin_sealed',
  PinSalt: 'pin_salt',
  UnlockAttempts: 'unlock_attempts',
  PinSigninEnabled: 'pin_signin_enabled',
  BiometricSigninEnabled: 'biometric_signin_enabled',
} as const;

export type SecureKey = (typeof SecureKey)[keyof typeof SecureKey];

export const CacheKey = {
  UserProfile: 'user_profile',
  AvatarPreferences: 'avatar_preferences',
  VerificationStatus: 'verification_status',
  WalletList: 'wallet_list',
  DepositWalletList: 'deposit_wallet_list',
  BankList: 'bank_list',
  RecipientDirectory: 'recipient_directory',
  Notifications: 'notifications',
  RegisteredPushToken: 'registered_push_token',
} as const;

export type CacheKey = (typeof CacheKey)[keyof typeof CacheKey];

export const PreferenceKey = {
  ThemePreference: 'theme_preference',
  BalanceHidden: 'balance_hidden',
  CreditActivated: 'credit_activated',
  KycSkipped: 'kyc_skipped',
  SelectedCountry: 'selected_country',
  DisplayCurrency: 'display_currency',
  LastTransferCurrency: 'last_transfer_currency',
  WealthTermsAccepted: 'wealth_terms_accepted',
} as const;

export type PreferenceKey = (typeof PreferenceKey)[keyof typeof PreferenceKey];

export const CLEARED_ON_SIGN_OUT: readonly string[] = [
  ...Object.values(SecureKey),
  ...Object.values(CacheKey),
];
