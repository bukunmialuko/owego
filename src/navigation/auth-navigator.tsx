import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthLandingScreen } from '@/features/auth/presentation/auth-landing-screen';
import type { AuthStackParamList } from './param-list';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AuthLanding" component={AuthLandingScreen} />
    </Stack.Navigator>
  );
}
