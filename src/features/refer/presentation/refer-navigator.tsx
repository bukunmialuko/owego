import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EarningsScreen } from './earnings-screen';
import { ReferScreen } from './refer-screen';
import type { ReferParamList } from './refer-param-list';

const Stack = createNativeStackNavigator<ReferParamList>();

export function ReferNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Invite" component={ReferScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
    </Stack.Navigator>
  );
}
