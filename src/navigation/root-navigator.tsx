import { NavigationContainer } from '@react-navigation/native';
import { useEffect, useMemo } from 'react';
import { useTheme } from '@/core/design-system/theme-provider';
import { useResolve } from '@/core/di/container-provider';
import { useSession } from '@/core/session/use-session';
import { SplashScreen } from '@/features/splash/presentation/splash-screen';
import { AppNavigator } from './app-navigator';
import { AuthNavigator } from './auth-navigator';
import { OnboardingNavigator, isOnboardingStage } from './onboarding-navigator';
import { UnlockScreen } from '@/features/auth/presentation/unlock-screen';
import { createDeferredLinking } from './linking';
import { navigationTheme } from './navigation-theme';
import { createPushLinkSource } from './push-link-source';

export function RootNavigator() {
  const { status, stage } = useSession();
  const theme = useTheme();
  const messaging = useResolve('pushMessagingPort');

  const isReady = status === 'authenticated' && stage === 'ready';

  const deferred = useMemo(
    () => createDeferredLinking(createPushLinkSource(messaging)),
    [messaging],
  );
  useEffect(() => {
    deferred.setReady(isReady);
  }, [deferred, isReady]);

  if (status === 'booting') return <SplashScreen />;

  return (
    <NavigationContainer theme={navigationTheme(theme)} linking={deferred.options}>
      {status === 'authenticated' ? authenticatedTree(stage) : <AuthNavigator />}
    </NavigationContainer>
  );
}

function authenticatedTree(stage: ReturnType<typeof useSession>['stage']) {
  if (stage === 'locked') return <UnlockScreen />;
  if (isOnboardingStage(stage)) return <OnboardingNavigator stage={stage} />;

  return <AppNavigator />;
}
