import type { TextStyle } from 'react-native';
import { typeface } from '../primitives/typeface';

const TABULAR = { fontVariant: ['tabular-nums'] as TextStyle['fontVariant'] };
export const typography = {
  'display.2xl': {
    fontFamily: typeface.display,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.12,
  },
  'display.xl': {
    fontFamily: typeface.display,
    fontSize: 48,
    lineHeight: 52,
    letterSpacing: -0.96,
  },
  'display.l': { fontFamily: typeface.display, fontSize: 40, lineHeight: 44, letterSpacing: -0.6 },

  'heading.h1': {
    fontFamily: typeface.heading,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.32,
  },
  'heading.h2': {
    fontFamily: typeface.heading,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.28,
  },
  'heading.h3': {
    fontFamily: typeface.heading,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.12,
  },
  'heading.h4': { fontFamily: typeface.heading, fontSize: 20, lineHeight: 24 },
  'heading.h5': { fontFamily: typeface.heading, fontSize: 18, lineHeight: 22 },
  'heading.h6': { fontFamily: typeface.heading, fontSize: 16, lineHeight: 20 },

  'numeric.xl': {
    fontFamily: typeface.bold,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -0.8,
    ...TABULAR,
  },
  'numeric.xlLoose': {
    fontFamily: typeface.bold,
    fontSize: 40,
    lineHeight: 52,
    letterSpacing: 0.2,
    ...TABULAR,
  },
  'numeric.xxlLoose': {
    fontFamily: typeface.bold,
    fontSize: 44,
    lineHeight: 57,
    letterSpacing: 0.2,
    ...TABULAR,
  },
  'numeric.lLoose': {
    fontFamily: typeface.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0.2,
    ...TABULAR,
  },
  'numeric.l': {
    fontFamily: typeface.bold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -0.48,
    ...TABULAR,
  },
  'numeric.m': {
    fontFamily: typeface.bold,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.24,
    ...TABULAR,
  },
  'numeric.s': { fontFamily: typeface.semibold, fontSize: 16, lineHeight: 20, ...TABULAR },

  'body.l': { fontFamily: typeface.regular, fontSize: 18, lineHeight: 28 },
  'body.m': { fontFamily: typeface.regular, fontSize: 16, lineHeight: 24 },
  'body.mMedium': { fontFamily: typeface.medium, fontSize: 16, lineHeight: 24 },
  'body.mEmphasis': { fontFamily: typeface.semibold, fontSize: 16, lineHeight: 24 },
  'body.s': { fontFamily: typeface.regular, fontSize: 14, lineHeight: 20 },
  'body.sMedium': { fontFamily: typeface.medium, fontSize: 14, lineHeight: 20 },
  'body.sEmphasis': { fontFamily: typeface.semibold, fontSize: 14, lineHeight: 20 },
  'body.xs': { fontFamily: typeface.regular, fontSize: 12, lineHeight: 18 },

  'label.l': { fontFamily: typeface.medium, fontSize: 16, lineHeight: 20 },
  'label.m': { fontFamily: typeface.medium, fontSize: 14, lineHeight: 20 },
  'label.s': { fontFamily: typeface.medium, fontSize: 12, lineHeight: 16 },

  'caption.m': { fontFamily: typeface.regular, fontSize: 12, lineHeight: 16 },
  'caption.mMedium': { fontFamily: typeface.medium, fontSize: 12, lineHeight: 16 },

  'overline.m': { fontFamily: typeface.medium, fontSize: 11, lineHeight: 16, letterSpacing: 0.88 },

  'mono.m': { fontFamily: typeface.mono, fontSize: 14, lineHeight: 20 },
  'mono.s': { fontFamily: typeface.mono, fontSize: 12, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export type Typography = typeof typography;

export type TypographyVariant = keyof Typography;

export const MAX_FONT_SCALE: Partial<Record<TypographyVariant, number>> = {
  'display.2xl': 1.3,
  'display.xl': 1.3,
  'display.l': 1.3,
  'numeric.xl': 1.3,
  'numeric.xlLoose': 1.3,
  'numeric.xxlLoose': 1.3,
  'numeric.lLoose': 1.3,
  'numeric.l': 1.4,
  'numeric.m': 1.5,
};
