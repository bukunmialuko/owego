import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ChooseCoverScreen } from './choose-cover-screen';
import { InsuranceTripScreen } from './insurance-trip-screen';
import { PolicyIssuedScreen } from './policy-issued-screen';
import { ReviewPayScreen } from './review-pay-screen';
import type { InsuranceParamList } from './insurance-param-list';

const Stack = createNativeStackNavigator<InsuranceParamList>();

export function InsuranceNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Trip" component={InsuranceTripScreen} />
      <Stack.Screen name="Cover" component={ChooseCoverScreen} />
      <Stack.Screen name="Review" component={ReviewPayScreen} />
      <Stack.Screen name="Issued" component={PolicyIssuedScreen} />
    </Stack.Navigator>
  );
}
