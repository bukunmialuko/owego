import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from '@react-navigation/native';
import type { Theme } from '@/core/design-system/theme';

export function navigationTheme(theme: Theme): NavigationTheme {
  const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    dark: theme.mode === 'dark',
    colors: {
      ...base.colors,
      primary: theme.color.fillBrand,
      background: theme.color.bgCanvas,
      card: theme.color.bgSurfaceRaised,
      text: theme.color.textPrimary,
      border: theme.color.borderSubtle,
      notification: theme.color.fillError,
    },
  };
}
