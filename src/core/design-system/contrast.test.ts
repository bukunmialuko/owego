import { pickForeground } from './color/apca';
import { darkColors, lightColors, type ColorTokens } from './tokens/semantic/color';

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  ) as [number, number];

  return (lighter + 0.05) / (darker + 0.05);
}

function scrimOverWhite(scrim: string): string {
  const alpha = Number(scrim.split(',')[3]?.replace(')', ''));
  const channel = Math.round(255 * (1 - alpha));

  return `#${channel.toString(16).padStart(2, '0').repeat(3)}`;
}

const AA_TEXT = 4.5;
const AA_LARGE = 3;

type Pair = { name: string; fg: keyof ColorTokens; bg: keyof ColorTokens; min: number };

const pairs: Pair[] = [
  { name: 'primary text on surface', fg: 'textPrimary', bg: 'bgSurface', min: AA_TEXT },
  { name: 'secondary text on surface', fg: 'textSecondary', bg: 'bgSurface', min: AA_TEXT },
  { name: 'brand text on surface', fg: 'textBrand', bg: 'bgSurface', min: AA_TEXT },
  { name: 'success text on surface', fg: 'textSuccess', bg: 'bgSurface', min: AA_TEXT },
  { name: 'warning text on surface', fg: 'textWarning', bg: 'bgSurface', min: AA_TEXT },
  { name: 'error text on surface', fg: 'textError', bg: 'bgSurface', min: AA_TEXT },
  {
    name: 'success text on sunken surface',
    fg: 'textSuccess',
    bg: 'bgSurfaceSunken',
    min: AA_TEXT,
  },
  { name: 'error text on sunken surface', fg: 'textError', bg: 'bgSurfaceSunken', min: AA_TEXT },
  {
    name: 'brand text on subtle neutral fill',
    fg: 'textBrand',
    bg: 'fillNeutralSubtle',
    min: AA_TEXT,
  },
  { name: 'text on strong brand fill', fg: 'textOnBrand', bg: 'fillBrandStrong', min: AA_TEXT },
  { name: 'text on brand fill', fg: 'textOnBrand', bg: 'fillBrand', min: AA_LARGE },
  { name: 'text on accent fill', fg: 'textOnAccent', bg: 'fillAccent', min: AA_TEXT },
  { name: 'brand text on subtle brand fill', fg: 'textBrand', bg: 'fillBrandSubtle', min: AA_TEXT },
  { name: 'default border on surface', fg: 'borderDefault', bg: 'bgSurface', min: AA_LARGE },
  { name: 'strong border on surface', fg: 'borderStrong', bg: 'bgSurface', min: AA_LARGE },
  { name: 'secondary icon on surface', fg: 'iconSecondary', bg: 'bgSurface', min: AA_LARGE },
  { name: 'primary icon on surface', fg: 'iconPrimary', bg: 'bgSurface', min: AA_LARGE },
  { name: 'primary icon on neutral fill', fg: 'iconPrimary', bg: 'fillNeutral', min: AA_LARGE },
  {
    name: 'primary icon on pressed neutral fill',
    fg: 'iconPrimary',
    bg: 'fillNeutralPressed',
    min: AA_LARGE,
  },
  {
    name: 'icon on elevated action',
    fg: 'iconOnActionElevated',
    bg: 'fillActionElevated',
    min: AA_TEXT,
  },
  { name: 'text on vendor dark fill', fg: 'textOnVendorDark', bg: 'fillVendorDark', min: AA_TEXT },
  {
    name: 'warning glyph on inverse fill',
    fg: 'iconWarningOnInverse',
    bg: 'bgInverse',
    min: AA_TEXT,
  },
  { name: 'glyph on inverse fill', fg: 'textInverse', bg: 'bgInverse', min: AA_TEXT },
  {
    name: 'success text on subtle success fill',
    fg: 'textSuccess',
    bg: 'fillSuccessSubtle',
    min: AA_TEXT,
  },
  {
    name: 'warning text on subtle warning fill',
    fg: 'textWarning',
    bg: 'fillWarningSubtle',
    min: AA_TEXT,
  },
  { name: 'error text on subtle error fill', fg: 'textError', bg: 'fillErrorSubtle', min: AA_TEXT },
  {
    name: 'notice text on subtle notice fill',
    fg: 'textNotice',
    bg: 'fillNoticeSubtle',
    min: AA_TEXT,
  },
  {
    name: 'notice glyph on subtle notice fill',
    fg: 'iconNotice',
    bg: 'fillNoticeSubtle',
    min: AA_LARGE,
  },
  {
    name: 'glyph on faint brand fill',
    fg: 'iconOnBrandFaint',
    bg: 'fillBrandFaint',
    min: AA_LARGE,
  },
  {
    name: 'glyph on subtle neutral fill',
    fg: 'iconOnNeutralSubtle',
    bg: 'fillNeutralSubtle',
    min: AA_LARGE,
  },
  {
    name: 'primary icon on a disc over artwork',
    fg: 'iconPrimary',
    bg: 'fillOnTint',
    min: AA_TEXT,
  },
  { name: 'feature intro benefit glyph', fg: 'iconBenefit', bg: 'bgSurface', min: AA_LARGE },
  {
    name: 'title on the Wealth yield tile',
    fg: 'textPrimary',
    bg: 'fillWealthYield',
    min: AA_TEXT,
  },
  {
    name: 'title on the Wealth credit tile',
    fg: 'textPrimary',
    bg: 'fillWealthCredit',
    min: AA_TEXT,
  },
  {
    name: 'title on the Wealth investment tile',
    fg: 'textPrimary',
    bg: 'fillWealthInvestment',
    min: AA_TEXT,
  },
];

describe('WCAG 2.2 AA contrast', () => {
  describe.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s mode', (_mode, colors) => {
    it.each(pairs)('$name meets $min:1', ({ fg, bg, min }) => {
      expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(min);
    });
  });

  describe('text/tertiary is a documented exception', () => {
    it.each([
      ['light', lightColors, 4.85],
      ['dark', darkColors, 4.45],
    ])('%s mode stays at the audited ratio', (_mode, colors, floor) => {
      expect(contrastRatio(colors.textTertiary, colors.bgSurface)).toBeGreaterThanOrEqual(floor);
    });
  });

  describe('the Wealth tile eyebrow is a documented exception', () => {
    it.each([
      ['light', lightColors],
      ['dark', darkColors],
    ])('%s mode clears 3:1 on every tile', (_mode, colors) => {
      for (const tile of ['fillWealthYield', 'fillWealthCredit', 'fillWealthInvestment'] as const) {
        expect(contrastRatio(colors.textWealthEyebrow, colors[tile])).toBeGreaterThanOrEqual(
          AA_LARGE,
        );
      }
    });

    it('keeps tertiary’s grey in light mode, as chosen over the mockup', () => {
      expect(lightColors.textWealthEyebrow).toBe(lightColors.textTertiary);
    });
  });

  describe('text on the scrim', () => {
    it('is the same colour in both modes, as is the scrim', () => {
      expect(darkColors.textOnScrim).toBe(lightColors.textOnScrim);
      expect(darkColors.bgScrim).toBe(lightColors.bgScrim);
    });

    it('has a ground that does not re-theme either', () => {
      expect(darkColors.bgPhoto).toBe(lightColors.bgPhoto);
    });

    it.each([
      ['light', lightColors],
      ['dark', darkColors],
    ])('%s mode clears AA over that ground with no photograph at all', (_mode, colors) => {
      expect(contrastRatio(colors.textOnScrim, colors.bgPhoto)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it.each([
      ['light', lightColors],
      ['dark', darkColors],
    ])('%s mode clears AA over the brightest frame a photograph can show', (_mode, colors) => {
      expect(
        contrastRatio(colors.textOnScrim, scrimOverWhite(colors.bgScrim)),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });
  });

  it('records that subtle borders are below any text threshold', () => {
    expect(contrastRatio(lightColors.borderSubtle, lightColors.bgSurface)).toBeLessThan(AA_LARGE);
  });

  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s mode orders the borders subtle, default, strong', (_mode, colors) => {
    const onSurface = (border: string) => contrastRatio(border, colors.bgSurface);

    expect(onSurface(colors.borderSubtle)).toBeLessThan(onSurface(colors.borderDefault));
    expect(onSurface(colors.borderDefault)).toBeLessThan(onSurface(colors.borderStrong));
  });
});

it('keeps the switch knob visible on its off track in dark mode', () => {
  expect(
    contrastRatio(darkColors.fillSwitchKnob, darkColors.fillNeutralPressed),
  ).toBeGreaterThanOrEqual(AA_LARGE);
});

describe('the loading skeleton', () => {
  const SEEN = 1.05;
  const GENTLE = 1.2;
  const GROUNDS = ['bgCanvas', 'bgSurface', 'bgSurfaceRaised', 'bgSurfaceSunken'] as const;
  const MODES = [
    ['light', lightColors],
    ['dark', darkColors],
  ] as const;

  it.each(
    MODES.flatMap(([mode, colors]) => GROUNDS.map((ground) => [mode, ground, colors] as const)),
  )('%s mode shows the resting fill on %s', (_mode, ground, colors) => {
    expect(contrastRatio(colors.fillSkeleton, colors[ground])).toBeGreaterThanOrEqual(SEEN);
  });

  it.each(MODES)(
    '%s mode keeps the shimmer one gentle shade lighter than the fill',
    (_mode, colors) => {
      expect(relativeLuminance(colors.fillSkeletonHighlight)).toBeGreaterThan(
        relativeLuminance(colors.fillSkeleton),
      );
      expect(
        contrastRatio(colors.fillSkeletonHighlight, colors.fillSkeleton),
      ).toBeGreaterThanOrEqual(SEEN);
      expect(contrastRatio(colors.fillSkeletonHighlight, colors.fillSkeleton)).toBeLessThanOrEqual(
        GENTLE,
      );
    },
  );
});

describe('the notice banner', () => {
  it.each([
    ['light', lightColors],
    ['dark', darkColors],
  ])('%s mode does not read as the error banner', (_mode, colors) => {
    expect(colors.fillNoticeSubtle).not.toBe(colors.fillErrorSubtle);
    expect(colors.textNotice).not.toBe(colors.textError);
  });

  it('keeps one glyph colour in both modes, as the deposit mock draws it', () => {
    expect(darkColors.iconNotice).toBe(lightColors.iconNotice);
  });
});

const AVATAR_FILLS = [
  'fillAvatarCharcoal',
  'fillAvatarCoral',
  'fillAvatarMint',
  'fillAvatarViolet',
  'fillAvatarPink',
  'fillAvatarLime',
  'fillAvatarAqua',
  'fillAvatarBlue',
  'fillAvatarSand',
  'fillAvatarWhite',
] as const satisfies readonly (keyof ColorTokens)[];

function avatarInitials(colors: ColorTokens, fill: keyof ColorTokens): keyof ColorTokens {
  const foreground = pickForeground(colors[fill], {
    light: colors.textAvatarLight,
    dark: colors.textAvatarDark,
  });

  return foreground === 'light' ? 'textAvatarLight' : 'textAvatarDark';
}

describe('avatar colours', () => {
  it.each([
    ...AVATAR_FILLS,
    'fillAvatarSilhouette',
    'fillAvatarSilhouetteFigure',
    'textAvatarLight',
    'textAvatarDark',
  ] as const)('keeps %s the same in light and dark', (token) => {
    expect(lightColors[token]).toMatch(/^#[0-9A-F]{6}$/i);
    expect(darkColors[token]).toBe(lightColors[token]);
  });

  it('gives each swatch the initials the avatar mock draws', () => {
    const drawn = Object.fromEntries(
      AVATAR_FILLS.map((fill) => [fill, avatarInitials(lightColors, fill)]),
    );

    expect(drawn).toEqual({
      fillAvatarCharcoal: 'textAvatarLight',
      fillAvatarCoral: 'textAvatarDark',
      fillAvatarMint: 'textAvatarDark',
      fillAvatarViolet: 'textAvatarLight',
      fillAvatarPink: 'textAvatarLight',
      fillAvatarLime: 'textAvatarDark',
      fillAvatarAqua: 'textAvatarDark',
      fillAvatarBlue: 'textAvatarLight',
      fillAvatarSand: 'textAvatarDark',
      fillAvatarWhite: 'textAvatarDark',
    });
  });

  it.each(AVATAR_FILLS.filter((fill) => fill !== 'fillAvatarPink'))(
    'keeps the initials on %s at AA',
    (fill) => {
      expect(
        contrastRatio(lightColors[avatarInitials(lightColors, fill)], lightColors[fill]),
      ).toBeGreaterThanOrEqual(AA_TEXT);
    },
  );

  it('keeps the pink swatch at its audited ratio, a documented exception', () => {
    expect(avatarInitials(lightColors, 'fillAvatarPink')).toBe('textAvatarLight');
    expect(
      contrastRatio(lightColors.textAvatarLight, lightColors.fillAvatarPink),
    ).toBeGreaterThanOrEqual(3.65);
  });
});
