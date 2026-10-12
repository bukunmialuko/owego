import type { NavigatorScreenParams } from '@react-navigation/native';
import type { DigitalAssetParamList } from '@/features/spend/presentation/digital-asset/digital-asset-param-list';
import type { BankTransferParamList } from '@/features/spend/presentation/bank-transfer/bank-transfer-param-list';
import type { BeneficiariesParamList } from '@/features/spend/presentation/beneficiaries/beneficiaries-param-list';
import type { ExternalWalletDepositParamList } from '@/features/receive/presentation/external-wallet/external-wallet-deposit-param-list';

export type TabParamList = {
  Home: undefined;
  Wealth: undefined;
  Travel: undefined;
};

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  TransactionDetails: { transactionId: string };
  AllTransactions: undefined;
  Profile: undefined;
  EditProfile: undefined;
  DeleteAccount: undefined;
  SignInPin: { mode: 'enable-pin' | 'disable-pin' | 'enable-biometrics' };
  AccountDeleted: undefined;
  Receive: undefined;
  DepositAddress: undefined;
  ExternalWalletDeposit: NavigatorScreenParams<ExternalWalletDepositParamList> | undefined;
  Payment: undefined;
  NewLoan: undefined;
  RepayLoan: undefined;
  CreditScore: undefined;
  Yield: undefined;
  EsimCatalog: undefined;
  EsimPurchased: { esimId: string };
  TravelPolicies: undefined;
  Insurance: undefined;
  Refer: undefined;
  ScanToPay: { fundingToken?: string } | undefined;
  SendAsset: NavigatorScreenParams<DigitalAssetParamList> | undefined;
  BankTransfer: NavigatorScreenParams<BankTransferParamList> | undefined;
  Beneficiaries: NavigatorScreenParams<BeneficiariesParamList> | undefined;
};

export type AuthStackParamList = {
  AuthLanding: undefined;
};

export type OnboardingStackParamList = {
  Kyc: undefined;
  CreateWallet: undefined;
  WalletProvisioning: undefined;
  SecureSession: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList
      extends AppStackParamList, AuthStackParamList, OnboardingStackParamList, TabParamList {}
  }
}
