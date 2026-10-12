import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, type ReactElement, type ReactNode } from 'react';
import { useResolve } from '@/core/di/container-provider';
import { fromUnknown } from '@/core/errors/app-error';
import { ErrorBoundary, ScreenFailure } from '@/shared/ui';
import type { AppStackParamList, TabParamList } from './param-list';

type LayoutArgs<Navigation> = {
  route: { name: string };
  navigation: Navigation;
  children: ReactElement;
};

type StackNavigation = Pick<NativeStackNavigationProp<AppStackParamList>, 'popTo'>;
type TabNavigation = Pick<BottomTabNavigationProp<TabParamList>, 'navigate' | 'addListener'>;

export function appScreenLayout({ route, navigation, children }: LayoutArgs<StackNavigation>) {
  return (
    <ReportingBoundary
      routeName={route.name}
      fallback={(retry) => (
        <ScreenFailure
          onGoHome={() => {
            if (route.name === 'Tabs') {
              retry();
              return;
            }

            navigation.popTo('Tabs', { screen: 'Home' });
          }}
        />
      )}
    >
      {children}
    </ReportingBoundary>
  );
}

export function tabScreenLayout({ route, navigation, children }: LayoutArgs<TabNavigation>) {
  return (
    <ReportingBoundary
      routeName={route.name}
      fallback={(retry) => (
        <TabFailure routeName={route.name} navigation={navigation} retry={retry} />
      )}
    >
      {children}
    </ReportingBoundary>
  );
}

function TabFailure({
  routeName,
  navigation,
  retry,
}: {
  routeName: string;
  navigation: TabNavigation;
  retry: () => void;
}) {
  useEffect(() => navigation.addListener('focus', retry), [navigation, retry]);

  return (
    <ScreenFailure
      onGoHome={() => {
        if (routeName === 'Home') {
          retry();
          return;
        }

        navigation.navigate('Home');
      }}
    />
  );
}

function ReportingBoundary({
  routeName,
  fallback,
  children,
}: {
  routeName: string;
  fallback: (retry: () => void) => ReactNode;
  children: ReactElement;
}) {
  const telemetry = useResolve('telemetry');

  return (
    <ErrorBoundary
      onError={(error) => {
        telemetry.captureError(fromUnknown(error), { route: routeName });
      }}
      fallback={fallback}
    >
      {children}
    </ErrorBoundary>
  );
}
