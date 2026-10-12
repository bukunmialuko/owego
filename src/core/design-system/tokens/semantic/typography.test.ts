import { typeface } from '../primitives/typeface';
import { MAX_FONT_SCALE, typography, type TypographyVariant } from './typography';

const variants = Object.keys(typography) as TypographyVariant[];
const families: string[] = Object.values(typeface);

describe('type ramp', () => {
  it.each(['numeric.xl', 'numeric.l', 'numeric.m', 'numeric.s'] as TypographyVariant[])(
    '%s asks for tabular figures',
    (variant) => {
      expect(typography[variant]).toHaveProperty('fontVariant', ['tabular-nums']);
    },
  );

  it.each(variants)('%s sets an absolute line height', (variant) => {
    expect(Number.isInteger(typography[variant].lineHeight)).toBe(true);
  });

  it.each(variants)('%s uses a bundled family', (variant) => {
    expect(families).toContain(typography[variant].fontFamily);
  });

  it.each(variants)('%s carries weight through the family, not fontWeight', (variant) => {
    expect(typography[variant]).not.toHaveProperty('fontWeight');
  });

  it('gives every line height room for its size', () => {
    for (const variant of variants) {
      expect(typography[variant].lineHeight).toBeGreaterThanOrEqual(typography[variant].fontSize);
    }
  });

  it('matches the published spec for the tiers screens lean on', () => {
    expect(typography['numeric.xl']).toEqual({
      fontFamily: typeface.bold,
      fontSize: 40,
      lineHeight: 44,
      letterSpacing: -0.8,
      fontVariant: ['tabular-nums'],
    });
    expect(typography['body.m']).toEqual({
      fontFamily: typeface.regular,
      fontSize: 16,
      lineHeight: 24,
    });
    expect(typography['overline.m']).toEqual({
      fontFamily: typeface.medium,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 0.88,
    });
  });

  it('caps only the tiers that would break their container, and never below 1.3x', () => {
    for (const [variant, cap] of Object.entries(MAX_FONT_SCALE)) {
      expect(typography[variant as TypographyVariant].fontSize).toBeGreaterThanOrEqual(24);
      expect(cap).toBeGreaterThanOrEqual(1.3);
    }
  });
});
