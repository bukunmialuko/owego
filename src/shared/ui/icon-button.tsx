import { Pressable, StyleSheet } from 'react-native';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon, useIconColor, type IconColor } from './icon';

type IconButtonTone = 'neutral' | 'surface' | 'onTint';

const DISC: Record<IconButtonTone, 'fillNeutral' | 'bgSurface' | 'fillOnTint'> = {
  neutral: 'fillNeutral',
  surface: 'bgSurface',
  onTint: 'fillOnTint',
};

type Props = {
  label: string;
  icon?: IoniconsIconName;
  glyph?: ComponentType<SvgProps>;
  tone?: IconButtonTone;
  color?: IconColor;
  onPress?: () => void;
  disabled?: boolean;
};

export function IconButton({
  label,
  icon,
  glyph: Glyph,
  tone = 'neutral',
  color = 'primary',
  onPress,
  disabled = false,
}: Props) {
  const theme = useTheme();
  const isDisabled = disabled || onPress === undefined;
  const glyphColor = useIconColor(isDisabled ? 'disabled' : color);
  const diameter = theme.size.control.md;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            pressed && !isDisabled ? theme.color.fillNeutralPressed : theme.color[DISC[tone]],
          borderRadius: theme.radius.pill,
          height: diameter,
          width: diameter,
        },
      ]}
    >
      {Glyph === undefined ? (
        icon !== undefined && <Icon name={icon} size="md" color={isDisabled ? 'disabled' : color} />
      ) : (
        <Glyph width={theme.size.icon.lg} height={theme.size.icon.lg} color={glyphColor} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center' },
});
