import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccountDeletedScreen } from '@/features/profile/presentation/account-deleted-screen';
import { SignInPinScreen } from '@/features/profile/presentation/sign-in-pin-screen';
import { DeleteAccountScreen } from '@/features/profile/presentation/delete-account-screen';
import { EditProfileScreen } from '@/features/profile/presentation/edit-profile-screen';
import { ProfileScreen } from '@/features/profile/presentation/profile-screen';
import { AllTransactionsScreen } from '@/features/home/presentation/all-transactions/all-transactions-screen';
import { TransactionDetailsScreen } from '@/features/home/presentation/transaction-details/transaction-details-screen';
import { ReceiveMethodScreen } from '@/features/receive/presentation/receive-method-screen';
import { ReceiveScreen } from '@/features/receive/presentation/receive-screen';
import { ExternalWalletDepositNavigator } from '@/features/receive/presentation/external-wallet/external-wallet-deposit-navigator';
import { NewLoanScreen } from '@/features/credit/presentation/new-loan-screen';
import { RepayLoanScreen } from '@/features/credit/presentation/repay-loan-screen';
import { CreditScreen } from '@/features/credit/presentation/credit-screen';
import { ReferNavigator } from '@/features/refer/presentation/refer-navigator';
import { YieldNavigator } from '@/features/yield/presentation/yield-navigator';
import { EsimCatalogScreen } from '@/features/travel/presentation/esim/esim-catalog-screen';
import { EsimPurchasedScreen } from '@/features/travel/presentation/esim/esim-purchased-screen';
import { InsuranceNavigator } from '@/features/travel/presentation/insurance/insurance-navigator';
import { PoliciesScreen } from '@/features/travel/presentation/policies-screen';
import { BankTransferNavigator } from '@/features/spend/presentation/bank-transfer/bank-transfer-navigator';
import { BeneficiariesNavigator } from '@/features/spend/presentation/beneficiaries/beneficiaries-navigator';
import { DigitalAssetNavigator } from '@/features/spend/presentation/digital-asset/digital-asset-navigator';
import { PaymentMethodScreen } from '@/features/spend/presentation/payment-method-screen';
import { ScanToPayScreen } from '@/features/spend/presentation/scan/scan-to-pay-screen';
import type { AppStackParamList } from './param-list';
import { appScreenLayout } from './screen-error-boundary';
import { TabsNavigator } from './tabs-navigator';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} screenLayout={appScreenLayout}>
      <Stack.Screen name="Tabs" component={TabsNavigator} />
      <Stack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
      <Stack.Screen name="AllTransactions" component={AllTransactionsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
      <Stack.Screen name="SignInPin" component={SignInPinScreen} />
      <Stack.Screen
        name="AccountDeleted"
        component={AccountDeletedScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="Receive"
        component={ReceiveMethodScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="DepositAddress"
        component={ReceiveScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="ExternalWalletDeposit"
        component={ExternalWalletDepositNavigator}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="Payment"
        component={PaymentMethodScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="NewLoan" component={NewLoanScreen} />
      <Stack.Screen name="RepayLoan" component={RepayLoanScreen} />
      <Stack.Screen name="CreditScore" component={CreditScreen} />
      <Stack.Screen name="Yield" component={YieldNavigator} />
      <Stack.Screen name="Refer" component={ReferNavigator} />
      <Stack.Screen name="EsimCatalog" component={EsimCatalogScreen} />
      <Stack.Screen name="EsimPurchased" component={EsimPurchasedScreen} />
      <Stack.Screen name="TravelPolicies" component={PoliciesScreen} />
      <Stack.Screen name="Insurance" component={InsuranceNavigator} />
      <Stack.Screen
        name="ScanToPay"
        component={ScanToPayScreen}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="SendAsset"
        component={DigitalAssetNavigator}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="BankTransfer"
        component={BankTransferNavigator}
        options={{ presentation: 'fullScreenModal' }}
      />
      <Stack.Screen
        name="Beneficiaries"
        component={BeneficiariesNavigator}
        options={{ presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  );
}
