import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ExternalWalletDepositResultScreen } from './external-wallet-deposit-result-screen';
import { ExternalWalletDepositScreen } from './external-wallet-deposit-screen';
import type { ExternalWalletDepositParamList } from './external-wallet-deposit-param-list';

const Stack = createNativeStackNavigator<ExternalWalletDepositParamList>();

export function ExternalWalletDepositNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Deposit" component={ExternalWalletDepositScreen} />
      <Stack.Screen
        name="Result"
        component={ExternalWalletDepositResultScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
