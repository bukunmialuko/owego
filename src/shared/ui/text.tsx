import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { MAX_FONT_SCALE, type TypographyVariant } from '@/core/design-system';

export type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'disabled'
  | 'inverse'
  | 'onScrim'
  | 'brand'
  | 'onBrand'
  | 'onVendorDark'
  | 'onAccent'
  | 'onActionElevated'
  | 'success'
  | 'warning'
  | 'error'
  | 'notice'
  | 'avatarLight'
  | 'avatarDark'
  | 'wealthEyebrow';

type Props = Omit<TextProps, 'style'> & {
  variant?: TypographyVariant;
  color?: TextColor;
  align?: TextStyle['textAlign'];
  style?: StyleProp<TextStyle>;
};

const HEADING_PREFIXES = ['display.', 'heading.'];

export function Text({
  variant = 'body.m',
  color = 'primary',
  align,
  style,
  children,
  ...rest
}: Props) {
  const theme = useTheme();

  return (
    <RNText
      accessibilityRole={
        HEADING_PREFIXES.some((prefix) => variant.startsWith(prefix)) ? 'header' : undefined
      }
      maxFontSizeMultiplier={MAX_FONT_SCALE[variant]}
      {...rest}
      style={[
        theme.typography[variant],
        { color: theme.color[TEXT_TOKEN[color]] },
        { textAlign: align },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const TEXT_TOKEN = {
  primary: 'textPrimary',
  secondary: 'textSecondary',
  tertiary: 'textTertiary',
  disabled: 'textDisabled',
  inverse: 'textInverse',
  onScrim: 'textOnScrim',
  brand: 'textBrand',
  onBrand: 'textOnBrand',
  onVendorDark: 'textOnVendorDark',
  onAccent: 'textOnAccent',
  onActionElevated: 'iconOnActionElevated',
  success: 'textSuccess',
  warning: 'textWarning',
  error: 'textError',
  notice: 'textNotice',
  avatarLight: 'textAvatarLight',
  avatarDark: 'textAvatarDark',
  wealthEyebrow: 'textWealthEyebrow',
} as const satisfies Record<TextColor, string>;
