import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { YieldAmountScreen } from './yield-amount-screen';
import { YieldConfirmScreen } from './yield-confirm-screen';
import { YieldScreen } from './yield-screen';
import { YieldSuccessScreen } from './yield-success-screen';
import type { YieldParamList } from './yield-param-list';

const Stack = createNativeStackNavigator<YieldParamList>();

export function YieldNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={YieldScreen} />
      <Stack.Screen name="Amount" component={YieldAmountScreen} />
      <Stack.Screen name="Confirm" component={YieldConfirmScreen} />
      <Stack.Screen name="Success" component={YieldSuccessScreen} />
    </Stack.Navigator>
  );
}
