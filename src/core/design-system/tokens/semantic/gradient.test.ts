import type { ThemeMode } from '../../theme-mode';
import { darkColors, lightColors, type ColorTokens } from './color';
import { gradients, type GradientTokens } from './gradient';

const COLORS: Record<ThemeMode, ColorTokens> = { light: lightColors, dark: darkColors };

function transparent(hex: string): string {
  const [red, green, blue] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));

  return `rgba(${String(red)}, ${String(green)}, ${String(blue)}, 0)`;
}

describe.each(['light', 'dark'] as const)('the %s skeleton shimmer', (mode) => {
  it('rises from nothing to the highlight and falls back to nothing', () => {
    const peak = COLORS[mode].fillSkeletonHighlight;

    expect(gradients[mode].skeletonShimmer.colors).toEqual([
      transparent(peak),
      peak,
      transparent(peak),
    ]);
  });

  it('runs level, from left to right', () => {
    const { start, end } = gradients[mode].skeletonShimmer;

    expect(start.x).toBeLessThan(end.x);
    expect(start.y).toBe(end.y);
  });
});

describe.each(['light', 'dark'] as const)('the %s bottom fades', (mode) => {
  it.each([
    ['bottomFade', 'bgCanvas'],
    ['bottomFadeSurface', 'bgSurface'],
  ] as const satisfies readonly (readonly [keyof GradientTokens, keyof ColorTokens])[])(
    '%s fades into %s',
    (fade, page) => {
      const end = COLORS[mode][page];

      expect(gradients[mode][fade].colors).toEqual([transparent(end), end]);
    },
  );
});
