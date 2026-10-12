import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ContainerProvider } from '@/core/di/container-provider';
import { ThemeProvider } from '@/core/design-system/theme-provider';
import { I18nProvider } from '@/core/i18n/i18n-provider';
import { loadAppConfig } from '@/core/config/app-config';
import { createComposedContainer } from './app-container';
import { createThemePreferenceStore } from './theme-preference-store';

export function AppProviders({ children, config }: { children: ReactNode; config: unknown }) {
  const parsed = loadAppConfig(config);

  if (!parsed.ok) {
    throw new Error(describeConfigFailure(config, parsed.error.fieldErrors));
  }

  return <ConfiguredProviders config={parsed.value}>{children}</ConfiguredProviders>;
}

function describeConfigFailure(
  config: unknown,
  fieldErrors: Readonly<Record<string, string>> | undefined,
): string {
  if (config === undefined || config === null) {
    return 'Missing app config. Copy .env.example to .env and fill it in, then restart the bundler with --reset-cache.';
  }

  const problems = Object.entries(fieldErrors ?? {})
    .map(([field, message]) => `${field || '(root)'}: ${message}`)
    .join('; ');

  return `Invalid app config — ${problems}. Check the OWEGO_* keys in your .env, then restart the bundler with --reset-cache.`;
}

function ConfiguredProviders({
  children,
  config,
}: {
  children: ReactNode;
  config: Parameters<typeof createComposedContainer>[0];
}) {
  const container = useMemo(() => createComposedContainer(config), [config]);
  const queryClient = container.cradle.queryClient;
  const themePreferenceStore = useMemo(
    () => createThemePreferenceStore(container.cradle.cache),
    [container],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ContainerProvider container={container}>
          <QueryClientProvider client={queryClient}>
            <I18nProvider>
              <ThemeProvider store={themePreferenceStore}>{children}</ThemeProvider>
            </I18nProvider>
          </QueryClientProvider>
        </ContainerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
