import { darkColors, lightColors, type ColorTokens } from './tokens/semantic/color';
import { elevations, type ElevationTokens } from './tokens/semantic/elevation';
import { gradients, type GradientTokens } from './tokens/semantic/gradient';
import {
  borderWidth,
  opacity,
  radius,
  size,
  spacing,
  zIndex,
  type BorderWidth,
  type Opacity,
  type Radius,
  type Size,
  type Spacing,
  type ZIndex,
} from './tokens/semantic/layout';
import { motion, type Motion } from './tokens/semantic/motion';
import { typography, type Typography } from './tokens/semantic/typography';
import type { ThemeMode } from './theme-mode';

export type { ThemeMode };

export type Theme = {
  mode: ThemeMode;
  color: ColorTokens;
  typography: Typography;
  spacing: Spacing;
  radius: Radius;
  size: Size;
  borderWidth: BorderWidth;
  opacity: Opacity;
  elevation: ElevationTokens;
  motion: Motion;
  gradient: GradientTokens;
  zIndex: ZIndex;
};

const SHARED = { typography, spacing, radius, size, borderWidth, opacity, motion, zIndex };

export const lightTheme: Theme = {
  mode: 'light',
  color: lightColors,
  elevation: elevations.light,
  gradient: gradients.light,
  ...SHARED,
};

export const darkTheme: Theme = {
  mode: 'dark',
  color: darkColors,
  elevation: elevations.dark,
  gradient: gradients.dark,
  ...SHARED,
};

export const themes: Record<ThemeMode, Theme> = { light: lightTheme, dark: darkTheme };
