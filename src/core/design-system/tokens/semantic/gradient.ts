import { palette } from '../primitives/palette';
import { darkColors, lightColors } from './color';
import type { ThemeMode } from '../../theme-mode';

export type GradientToken = {
  colors: readonly string[];
  locations: readonly number[];
  start: { x: number; y: number };
  end: { x: number; y: number };
};

export type GradientTokens = {
  accentGold: GradientToken;
  bottomFade: GradientToken;
  bottomFadeSurface: GradientToken;
  successHeader: GradientToken;
  wealthHeader: GradientToken;
  referHeader: GradientToken;
  skeletonShimmer: GradientToken;
};

const VERTICAL = { start: { x: 0.5, y: 0 }, end: { x: 0.5, y: 1 } } as const;

function transparentOf(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

  return `rgba(${String(red)}, ${String(green)}, ${String(blue)}, 0)`;
}

function fadeInto(page: string): GradientToken {
  return { colors: [transparentOf(page), page], locations: [0, 1], ...VERTICAL };
}

function shimmerOf(peak: string): GradientToken {
  return {
    colors: [transparentOf(peak), peak, transparentOf(peak)],
    locations: [0, 0.5, 1],
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
  };
}

const ACCENT_GOLD: GradientToken = {
  colors: [
    palette.gold400,
    palette.gold600,
    palette.gold300,
    palette.gold500,
    palette.gold600,
    palette.gold300,
    palette.gold700,
  ],
  locations: [0, 0.132, 0.302, 0.729, 0.835, 0.96, 1],
  start: { x: 0, y: 0 },
  end: { x: 1.034, y: 0.568 },
};

const SUCCESS_HEADER_LIGHT: GradientToken = {
  colors: [palette.blue100, palette.blue25, lightColors.bgCanvas],
  locations: [0, 0.6, 1],
  ...VERTICAL,
};

const WEALTH_HEADER_LIGHT: GradientToken = {
  colors: ['#D4E0FF', lightColors.bgCanvas],
  locations: [0, 1],
  ...VERTICAL,
};

const REFER_HEADER_LIGHT: GradientToken = {
  colors: ['#D4E0FF', lightColors.bgSurface],
  locations: [0, 1],
  ...VERTICAL,
};

const lightGradients: GradientTokens = {
  accentGold: ACCENT_GOLD,
  bottomFade: fadeInto(lightColors.bgCanvas),
  bottomFadeSurface: fadeInto(lightColors.bgSurface),
  successHeader: SUCCESS_HEADER_LIGHT,
  wealthHeader: WEALTH_HEADER_LIGHT,
  referHeader: REFER_HEADER_LIGHT,
  skeletonShimmer: shimmerOf(lightColors.fillSkeletonHighlight),
};

const darkGradients: GradientTokens = {
  accentGold: ACCENT_GOLD,
  bottomFade: fadeInto(darkColors.bgCanvas),
  bottomFadeSurface: fadeInto(darkColors.bgSurface),
  successHeader: {
    colors: [darkColors.bgCanvasGradientStart, darkColors.bgCanvas],
    locations: [0, 1],
    ...VERTICAL,
  },
  wealthHeader: {
    colors: [darkColors.bgCanvasGradientStart, darkColors.bgCanvas],
    locations: [0, 1],
    ...VERTICAL,
  },
  referHeader: {
    colors: [darkColors.bgCanvasGradientStart, darkColors.bgSurface],
    locations: [0, 1],
    ...VERTICAL,
  },
  skeletonShimmer: shimmerOf(darkColors.fillSkeletonHighlight),
};

export const gradients: Record<ThemeMode, GradientTokens> = {
  light: lightGradients,
  dark: darkGradients,
};
