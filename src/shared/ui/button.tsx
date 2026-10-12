import { type IoniconsIconName } from '@react-native-vector-icons/ionicons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';
import { Icon } from './icon';
import { Text } from './text';

export type ButtonVariant =
  'primary' | 'secondary' | 'brandSubtle' | 'destructive' | 'ghost' | 'dark' | 'vendor';
export type ButtonSize = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  isLoading?: boolean;
  icon?: IoniconsIconName;

  iconPosition?: 'leading' | 'trailing';
  glyph?: ComponentType<SvgProps>;
  style?: StyleProp<ViewStyle>;
  textColor?: React.ComponentProps<typeof Text>['color'];
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  isLoading = false,
  icon,
  iconPosition = 'leading',
  glyph: Glyph,
  style,
  textColor,
}: Props) {
  const theme = useTheme();
  const isInteractive = !disabled && !isLoading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isInteractive, busy: isLoading }}
      disabled={!isInteractive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background(theme, variant, disabled, pressed),
          borderRadius: theme.radius.pill,
          minHeight: theme.size.control[size],
          paddingHorizontal: theme.spacing.xl,
        },
        style,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color={theme.color[FOREGROUND[variant]]} />
      ) : (
        <View
          style={[
            styles.inner,
            {
              flexDirection: iconPosition === 'trailing' ? 'row-reverse' : 'row',
              gap: theme.spacing.sm,
            },
          ]}
        >
          {Glyph !== undefined && <Glyph width={GLYPH_SIZE} height={GLYPH_SIZE} />}
          {Glyph === undefined && icon !== undefined && (
            <Icon
              name={icon}
              size={size === 'sm' ? 'sm' : 'md'}
              color={disabled ? 'disabled' : ICON[variant]}
            />
          )}
          <Text
            variant={size === 'sm' ? 'label.m' : 'label.l'}
            color={disabled ? 'disabled' : (textColor ?? TEXT[variant])}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function background(
  theme: Theme,
  variant: ButtonVariant,
  disabled: boolean,
  pressed: boolean,
): string {
  if (disabled) return variant === 'ghost' ? 'transparent' : theme.color.fillDisabled;

  switch (variant) {
    case 'primary':
      return pressed ? theme.color.fillBrandPressed : theme.color.fillBrandStrong;
    case 'secondary':
      return pressed ? theme.color.fillNeutralPressed : theme.color.fillNeutral;
    case 'brandSubtle':
      return pressed ? theme.color.fillNeutralPressed : theme.color.fillBrandSubtle;
    case 'destructive':
      return theme.color.fillError;
    case 'ghost':
      return pressed ? theme.color.fillNeutral : 'transparent';
    case 'dark':
      return theme.color.fillActionElevated;
    case 'vendor':
      return theme.color.fillVendorDark;
  }
}

const TEXT = {
  primary: 'onBrand',
  secondary: 'primary',
  brandSubtle: 'brand',
  destructive: 'onBrand',
  ghost: 'brand',
  dark: 'onActionElevated',
  vendor: 'onVendorDark',
} as const satisfies Record<ButtonVariant, React.ComponentProps<typeof Text>['color']>;

const ICON = {
  primary: 'onBrand',
  secondary: 'primary',
  brandSubtle: 'brand',
  destructive: 'onBrand',
  ghost: 'brand',
  dark: 'onActionElevated',
  vendor: 'onVendorDark',
} as const satisfies Record<ButtonVariant, React.ComponentProps<typeof Icon>['color']>;

const FOREGROUND = {
  primary: 'textOnBrand',
  secondary: 'textPrimary',
  brandSubtle: 'textBrand',
  destructive: 'textOnBrand',
  ghost: 'textBrand',
  dark: 'iconOnActionElevated',
  vendor: 'textOnVendorDark',
} as const satisfies Record<ButtonVariant, string>;

const GLYPH_SIZE = 22;

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center' },
});
