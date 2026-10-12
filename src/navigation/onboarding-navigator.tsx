import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ComponentType } from 'react';
import { KycScreen } from '@/features/kyc/presentation/kyc-screen';
import { SecureSessionScreen } from '@/features/auth/presentation/secure-session-screen';
import { CreateWalletScreen } from '@/features/wallet/presentation/create-wallet-screen';
import { WalletProvisioningScreen } from '@/features/wallet/presentation/wallet-provisioning-screen';
import type { OnboardingStage } from '@/core/session/session-store';
import type { OnboardingStackParamList } from './param-list';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

const ROUTE = {
  kyc: 'Kyc',
  'create-wallet': 'CreateWallet',
  provisioning: 'WalletProvisioning',
  'secure-session': 'SecureSession',
} as const satisfies Partial<Record<OnboardingStage, keyof OnboardingStackParamList>>;

const SCREEN = {
  kyc: KycScreen,
  'create-wallet': CreateWalletScreen,
  provisioning: WalletProvisioningScreen,
  'secure-session': SecureSessionScreen,
} as const satisfies Record<keyof typeof ROUTE, ComponentType>;

type OnboardingRouteStage = keyof typeof ROUTE;

export function OnboardingNavigator({ stage }: { stage: OnboardingRouteStage }) {
  return (
    <Stack.Navigator key={stage} screenOptions={{ headerShown: false, gestureEnabled: false }}>
      <Stack.Screen name={ROUTE[stage]} component={SCREEN[stage]} />
    </Stack.Navigator>
  );
}

export function isOnboardingStage(stage: OnboardingStage): stage is OnboardingRouteStage {
  return stage in ROUTE;
}
