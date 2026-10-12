import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { NameAndRegistrationPair } from 'awilix';
import type { ReactElement, ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { AppConfig } from '@/core/config/app-config';
import { ContainerProvider } from '@/core/di/container-provider';
import type { AppCradle } from '@/core/di/container';
import { createComposedContainer } from '@/composition/app-container';
import { ThemeProvider, type ThemePreference } from '@/core/design-system/theme-provider';
import { I18nProvider } from '@/core/i18n/i18n-provider';
import { testAppConfig } from './test-config';

const testConfig: AppConfig = { ...testAppConfig, usePreviewData: true };

export function createTestContainer(
  overrides: NameAndRegistrationPair<Partial<AppCradle>> = {},
  config: AppConfig = testConfig,
) {
  return createComposedContainer(config, overrides);
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

export function renderWithProviders(
  ui: ReactElement,
  options: {
    container?: ReturnType<typeof createTestContainer>;
    queryClient?: QueryClient;
    theme?: ThemePreference;
    withNavigation?: boolean;
  } = {},
) {
  const container = options.container ?? createTestContainer();
  const queryClient = options.queryClient ?? createTestQueryClient();

  function Providers({ children }: { children: ReactNode }) {
    const tree =
      options.withNavigation === true ? (
        <NavigationContainer>{children}</NavigationContainer>
      ) : (
        children
      );

    return (
      <GestureHandlerRootView>
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <ContainerProvider container={container}>
            <QueryClientProvider client={queryClient}>
              <I18nProvider>
                <ThemeProvider initialPreference={options.theme ?? 'light'}>{tree}</ThemeProvider>
              </I18nProvider>
            </QueryClientProvider>
          </ContainerProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return render(ui, { wrapper: Providers });
}
