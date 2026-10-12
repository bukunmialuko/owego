import type { ThemeMode } from '../../theme-mode';
import { palette, type PaletteColor } from '../primitives/palette';
import { darkColors, lightColors, type ColorTokens } from './color';

type Token = keyof ColorTokens;

const DESIGN_FILE = {
  bgCanvas: { light: 'neutral50', dark: 'ink1000' },
  bgCanvasGradientStart: { light: 'neutral50', dark: 'indigo800' },
  bgCanvasGradientEnd: { light: 'neutral50', dark: 'ink1000' },
  bgSurface: { light: 'neutral0', dark: 'ink800' },
  bgSurfaceRaised: { light: 'neutral0', dark: 'ink700' },
  bgSurfaceOverlay: { light: 'neutral0', dark: 'ink600' },
  bgSurfaceSunken: { light: 'neutral100', dark: 'ink900' },
  bgInverse: { light: 'neutral1000', dark: 'neutral0' },
  bgScrim: { light: 'neutral1000', dark: 'ink1000' },

  textPrimary: { light: 'neutral1000', dark: 'neutral0' },
  textSecondary: { light: 'neutral600', dark: 'neutral400' },
  textTertiary: { light: 'neutral550', dark: 'neutral500' },
  textDisabled: { light: 'neutral400', dark: 'ink300' },
  textInverse: { light: 'neutral0', dark: 'neutral1000' },
  textBrand: { light: 'blue600', dark: 'blue400' },
  textOnBrand: { light: 'neutral0', dark: 'neutral0' },
  textOnAccent: { light: 'neutral1000', dark: 'neutral1000' },
  textSuccess: { light: 'success700', dark: 'success300' },
  textWarning: { light: 'warning700', dark: 'warning300' },
  textError: { light: 'error600', dark: 'error300' },

  borderSubtle: { light: 'neutral200', dark: 'ink400' },
  borderDefault: { light: 'neutral450', dark: 'ink200' },
  borderStrong: { light: 'neutral550', dark: 'neutral500' },
  borderBrand: { light: 'blue500', dark: 'blue400' },
  borderFocus: { light: 'blue500', dark: 'blue400' },
  borderError: { light: 'error500', dark: 'error300' },
  borderSuccess: { light: 'success500', dark: 'success300' },

  fillBrand: { light: 'blue500', dark: 'blue500' },
  fillBrandStrong: { light: 'blue600', dark: 'blue600' },
  fillBrandHover: { light: 'blue600', dark: 'blue400' },
  fillBrandPressed: { light: 'blue700', dark: 'blue300' },
  fillBrandSubtle: { light: 'blue50', dark: 'indigo950' },
  fillAccent: { light: 'gold400', dark: 'gold400' },
  fillAccentHover: { light: 'gold500', dark: 'gold300' },
  fillActionElevated: { light: 'ink1000', dark: 'neutral25' },
  fillNeutral: { light: 'neutral100', dark: 'ink700' },
  fillNeutralHover: { light: 'neutral200', dark: 'ink600' },
  fillNeutralPressed: { light: 'neutral300', dark: 'ink500' },
  fillDisabled: { light: 'neutral200', dark: 'ink700' },
  fillSuccess: { light: 'success500', dark: 'success500' },
  fillSuccessSubtle: { light: 'success50', dark: 'success900' },
  fillWarningSubtle: { light: 'warning50', dark: 'warning900' },
  fillError: { light: 'error500', dark: 'error500' },
  fillErrorSubtle: { light: 'error50', dark: 'error900' },

  iconPrimary: { light: 'neutral1000', dark: 'neutral0' },
  iconSecondary: { light: 'neutral500', dark: 'neutral300' },
  iconDisabled: { light: 'neutral400', dark: 'ink300' },
  iconBrand: { light: 'blue500', dark: 'blue400' },
  iconOnBrand: { light: 'neutral0', dark: 'neutral0' },
  iconOnActionElevated: { light: 'neutral0', dark: 'neutral0' },
} as const satisfies Partial<Record<Token, Record<ThemeMode, PaletteColor>>>;

type Deviation = { token: Token; mode: ThemeMode; value: string; reason: string };

const DEVIATIONS: Deviation[] = [
  ...(['light', 'dark'] as const).map((mode) => ({
    token: 'bgScrim' as const,
    mode,
    value: 'rgba(0, 0, 0, 0.6)',
    reason: 'a scrim has to let the screen beneath it show through',
  })),
  {
    token: 'fillActionElevated',
    mode: 'dark',
    value: palette.ink1000,
    reason:
      'the swatch is near-white under a white glyph (1.03:1), so the dark Button and a glyph FAB stay near-black',
  },
  {
    token: 'fillNeutral',
    mode: 'dark',
    value: palette.neutral800,
    reason: 'the dark Home mock draws chips and discs in neutral800; ink700 vanishes on bgSurface',
  },
  {
    token: 'fillNeutralHover',
    mode: 'dark',
    value: palette.neutral700,
    reason: 'one step lighter than fillNeutral, as interaction lightens in dark',
  },
  {
    token: 'fillNeutralPressed',
    mode: 'dark',
    value: palette.neutral600,
    reason: 'two steps lighter than fillNeutral, as interaction lightens in dark',
  },
];

const COLORS: Record<ThemeMode, ColorTokens> = { light: lightColors, dark: darkColors };

const isDeviation = (token: Token, mode: ThemeMode) =>
  DEVIATIONS.some((deviation) => deviation.token === token && deviation.mode === mode);

const swatches = (Object.keys(DESIGN_FILE) as (keyof typeof DESIGN_FILE)[]).flatMap((token) =>
  (['light', 'dark'] as const)
    .filter((mode) => !isDeviation(token, mode))
    .map((mode) => ({ token, mode, primitive: DESIGN_FILE[token][mode] })),
);

describe('semantic colours against the design file', () => {
  it('covers every semantic token the design file publishes', () => {
    expect(Object.keys(DESIGN_FILE)).toHaveLength(50);
  });

  it.each(swatches)('$token ($mode) is $primitive', ({ token, mode, primitive }) => {
    expect(COLORS[mode][token]).toBe(palette[primitive]);
  });

  it.each(DEVIATIONS)('$token ($mode) departs on purpose: $reason', ({ token, mode, value }) => {
    expect(COLORS[mode][token]).toBe(value);
  });
});
