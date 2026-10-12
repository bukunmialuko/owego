import type { ViewStyle } from 'react-native';
import { palette } from '../primitives/palette';
import type { ThemeMode } from '../../theme-mode';

export type ElevationTokens = {
  none: ViewStyle;
  card: ViewStyle;
  raised: ViewStyle;
  floating: ViewStyle;
  sheet: ViewStyle;
};

const NONE: ViewStyle = {
  elevation: 0,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
};

const lightElevation: ElevationTokens = {
  none: NONE,
  card: {
    elevation: 2,
    shadowColor: palette.neutral1000,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  raised: {
    elevation: 4,
    shadowColor: palette.neutral1000,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  floating: {
    elevation: 8,
    shadowColor: palette.neutral1000,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  sheet: {
    elevation: 16,
    shadowColor: palette.neutral1000,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
  },
};

const darkElevation: ElevationTokens = {
  none: NONE,
  card: {
    elevation: 2,
    shadowColor: palette.ink1000,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  raised: {
    elevation: 4,
    shadowColor: palette.ink1000,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  floating: {
    elevation: 8,
    shadowColor: palette.ink1000,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  sheet: {
    elevation: 16,
    shadowColor: palette.ink1000,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
  },
};

export const elevations: Record<ThemeMode, ElevationTokens> = {
  light: lightElevation,
  dark: darkElevation,
};
