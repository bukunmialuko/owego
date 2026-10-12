import { StyleSheet } from 'react-native';

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export type Spacing = typeof spacing;

export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  sheet: 32,
  pill: 999,
} as const;

export type Radius = typeof radius;

export const size = {
  control: { sm: 40, md: 48, lg: 56 },
  icon: { xs: 16, sm: 18, md: 22, lg: 26, xl: 48 },
  avatar: { sm: 32, swatch: 36, md: 40, row: 52, lg: 56 },
  swatchRing: 44,
  fab: 56,
  toggle: { width: 56, height: 32, knob: 26 },
} as const;

export type Size = typeof size;

export const borderWidth = {
  none: 0,
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  thick: 2,
} as const;

export type BorderWidth = typeof borderWidth;

export const opacity = {
  full: 1,
  disabled: 0.4,
  pressed: 0.85,
  scrim: 0.6,
} as const;

export type Opacity = typeof opacity;

export const zIndex = {
  base: 0,
  raised: 1,
  sticky: 10,
  overlay: 100,
  toast: 1000,
} as const;

export type ZIndex = typeof zIndex;
