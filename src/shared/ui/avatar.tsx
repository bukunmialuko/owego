import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/core/design-system/theme-provider';
import {
  pickForeground,
  type ColorTokens,
  type Theme,
  type TypographyVariant,
} from '@/core/design-system';
import { CountryFlag } from './country-flag';
import { Icon, useIconColor, type IconColor } from './icon';
import { Text, type TextColor } from './text';

type AvatarBadge = 'incoming' | 'outgoing' | 'failed' | 'credited' | 'pending';

export type AvatarSize = keyof Theme['size']['avatar'];

export type AvatarSwatch =
  'charcoal' | 'coral' | 'mint' | 'violet' | 'pink' | 'lime' | 'aqua' | 'blue' | 'sand' | 'white';

type AvatarCircleTint = 'brandSubtle' | 'surface' | 'successSubtle' | 'neutralSubtle';

type Props = {
  name: string;
  size?: AvatarSize;
  badge?: AvatarBadge;
  badgeCountryCode?: string;
} & (
  | {
      tint?: AvatarCircleTint;
      swatch?: never;
    }
  | {
      swatch: AvatarSwatch;
      tint?: never;
    }
);

const SWATCH_FILL = {
  charcoal: 'fillAvatarCharcoal',
  coral: 'fillAvatarCoral',
  mint: 'fillAvatarMint',
  violet: 'fillAvatarViolet',
  pink: 'fillAvatarPink',
  lime: 'fillAvatarLime',
  aqua: 'fillAvatarAqua',
  blue: 'fillAvatarBlue',
  sand: 'fillAvatarSand',
  white: 'fillAvatarWhite',
} as const satisfies Record<AvatarSwatch, keyof ColorTokens>;

const INITIALS_VARIANT = {
  sm: 'label.s',
  swatch: 'body.sEmphasis',
  md: 'numeric.s',
  row: 'numeric.s',
  lg: 'numeric.s',
} as const satisfies Record<AvatarSize, TypographyVariant>;

type CircleColors = { fill: string; ink: TextColor };

function circleColors(tint: AvatarCircleTint, theme: Theme): CircleColors {
  switch (tint) {
    case 'brandSubtle':
      return { fill: theme.color.fillBrandSubtle, ink: 'brand' };
    case 'surface':
      return { fill: theme.color.bgSurface, ink: 'brand' };
    case 'successSubtle':
      return { fill: theme.color.fillSuccessSubtle, ink: 'success' };
    case 'neutralSubtle':
      return { fill: theme.color.fillNeutralSubtle, ink: 'brand' };
  }
}

function swatchColors(swatch: AvatarSwatch, theme: Theme): CircleColors {
  const fill = theme.color[SWATCH_FILL[swatch]];
  const foreground = pickForeground(fill, {
    light: theme.color.textAvatarLight,
    dark: theme.color.textAvatarDark,
  });

  return { fill, ink: foreground === 'light' ? 'avatarLight' : 'avatarDark' };
}

const FLAG_RATIO = 0.42;

export function Avatar({
  name,
  size = 'md',
  badge,
  tint = 'brandSubtle',
  swatch,
  badgeCountryCode,
}: Props) {
  const theme = useTheme();
  const diameter = theme.size.avatar[size];
  const colors = swatch === undefined ? circleColors(tint, theme) : swatchColors(swatch, theme);

  return (
    <View>
      <View
        style={[
          styles.circle,
          {
            backgroundColor: colors.fill,
            width: diameter,
            height: diameter,
            borderRadius: theme.radius.pill,
          },
        ]}
      >
        <Text variant={INITIALS_VARIANT[size]} color={colors.ink}>
          {initialsOf(name)}
        </Text>
      </View>

      {badgeCountryCode !== undefined ? (
        <View
          testID="avatar-flag"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.flag}
        >
          <CountryFlag code={badgeCountryCode} diameter={Math.round(diameter * FLAG_RATIO)} />
        </View>
      ) : (
        badge !== undefined && (
          <View
            testID="avatar-badge"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.badge,
              {
                backgroundColor: badgeColor(badge, theme),
                borderColor: theme.color.bgSurface,
                borderWidth: theme.borderWidth.thick,
                borderRadius: theme.radius.pill,
              },
            ]}
          >
            <BadgeMark badge={badge} />
          </View>
        )
      )}
    </View>
  );
}

const SIGN_SIZE = 10;
const SIGN_STROKE = 1.75;
const SIGN_PATH = {
  plus: 'M1.5 5H8.5M5 1.5V8.5',
  minus: 'M1.5 5H8.5',
  cross: 'M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5',
} as const;

type Sign = keyof typeof SIGN_PATH;

const BADGE_SIGN = {
  incoming: { sign: 'plus', color: 'onBrand' },
  credited: { sign: 'plus', color: 'inverse' },
  outgoing: { sign: 'minus', color: 'primary' },
  failed: { sign: 'cross', color: 'onBrand' },
} as const satisfies Record<Exclude<AvatarBadge, 'pending'>, { sign: Sign; color: IconColor }>;

function BadgeMark({ badge }: { badge: AvatarBadge }) {
  if (badge === 'pending')
    return <Icon name="information-circle" size="xs" color="warningOnInverse" />;

  return <SignMark sign={BADGE_SIGN[badge].sign} color={BADGE_SIGN[badge].color} />;
}

function SignMark({ sign, color }: { sign: Sign; color: IconColor }) {
  const stroke = useIconColor(color);

  return (
    <Svg
      testID={`avatar-badge-${sign}`}
      width={SIGN_SIZE}
      height={SIGN_SIZE}
      viewBox={`0 0 ${String(SIGN_SIZE)} ${String(SIGN_SIZE)}`}
    >
      <Path
        d={SIGN_PATH[sign]}
        stroke={stroke}
        strokeWidth={SIGN_STROKE}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

function badgeColor(badge: AvatarBadge, theme: Theme) {
  if (badge === 'incoming') return theme.color.fillSuccess;
  if (badge === 'failed') return theme.color.fillError;
  if (badge === 'credited' || badge === 'pending') return theme.color.bgInverse;

  return theme.color.fillNeutralPressed;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';

  return parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toUpperCase() ?? '')
    .join('');
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  flag: { bottom: -2, position: 'absolute', right: -2 },
  badge: {
    alignItems: 'center',
    bottom: -2,
    height: 18,
    justifyContent: 'center',
    position: 'absolute',
    right: -2,
    width: 18,
  },
});
