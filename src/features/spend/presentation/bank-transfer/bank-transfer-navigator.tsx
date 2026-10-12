import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AmountScreen } from './amount-screen';
import { BankDetailsScreen } from './bank-details-screen';
import { ConfirmScreen } from './confirm-screen';
import { MerchantAmountScreen } from './merchant-amount-screen';
import { RecipientScreen } from './recipient-screen';
import { SuccessScreen } from './success-screen';
import type { BankTransferParamList } from './bank-transfer-param-list';

const Stack = createNativeStackNavigator<BankTransferParamList>();

export function BankTransferNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Recipient" component={RecipientScreen} />
      <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
      <Stack.Screen name="Amount" component={AmountScreen} />
      <Stack.Screen name="MerchantAmount" component={MerchantAmountScreen} />
      <Stack.Screen name="Confirm" component={ConfirmScreen} />
      <Stack.Screen name="Success" component={SuccessScreen} options={{ gestureEnabled: false }} />
    </Stack.Navigator>
  );
}
