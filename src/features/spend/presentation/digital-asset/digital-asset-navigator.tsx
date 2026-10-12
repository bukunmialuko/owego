import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ConfirmPaymentScreen } from './confirm-payment-screen';
import { PaymentSuccessScreen } from './payment-success-screen';
import { SendAmountScreen } from './send-amount-screen';
import { SendAssetScreen } from './send-asset-screen';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const Stack = createNativeStackNavigator<DigitalAssetParamList>();

export function DigitalAssetNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Recipient" component={SendAssetScreen} />
      <Stack.Screen name="Amount" component={SendAmountScreen} />
      <Stack.Screen name="Confirm" component={ConfirmPaymentScreen} />
      <Stack.Screen
        name="Success"
        component={PaymentSuccessScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
