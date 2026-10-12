import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { themes, type Theme, type ThemeMode } from './theme';

export type ThemePreference = ThemeMode | 'system';

export type ThemePreferenceStore = {
  read(): ThemePreference | undefined;
  write(preference: ThemePreference): void;
};

type ThemeContextValue = {
  theme: Theme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({
  children,
  initialPreference = 'system',
  store,
}: {
  children: ReactNode;
  initialPreference?: ThemePreference;
  store?: ThemePreferenceStore;
}) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(
    () => store?.read() ?? initialPreference,
  );

  const ownsChoice = store !== undefined;

  useEffect(() => {
    if (!ownsChoice) return;

    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [ownsChoice, preference]);

  const value = useMemo<ThemeContextValue>(() => {
    const systemMode: ThemeMode = systemScheme === 'dark' ? 'dark' : 'light';
    const mode: ThemeMode = preference === 'system' ? systemMode : preference;

    return {
      theme: themes[mode],
      preference,
      setPreference: (next) => {
        store?.write(next);
        setPreferenceState(next);
      },
    };
  }, [preference, systemScheme, store]);

  return (
    <ThemeContext.Provider value={value}>
      <SystemBars style={value.theme.mode === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeScope({ mode, children }: { mode: ThemeMode; children: ReactNode }) {
  const outer = useThemeContext();
  const value = useMemo<ThemeContextValue>(
    () => ({ ...outer, theme: themes[mode] }),
    [outer, mode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useThemeContext().theme;
}

export function useThemePreference() {
  const { preference, setPreference } = useThemeContext();

  return { preference, setPreference };
}

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used inside a ThemeProvider.');
  }

  return context;
}
