import { Pressable, StyleSheet } from 'react-native';
import SwitchGlyph from '@/assets/icons/switch.svg';
import { useTheme } from '@/core/design-system/theme-provider';
import { Text, useIconColor } from '@/shared/ui';

const GLYPH_SIZE = 20;

type Props = {
  currency: string;
  label: string;
  disabled?: boolean;
  onPress: () => void;
};

export function CurrencySwitch({ currency, label, disabled = false, onPress }: Props) {
  const theme = useTheme();
  const glyphColor = useIconColor(disabled ? 'disabled' : 'brand');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.switch,
        {
          gap: theme.spacing.xs,
          minHeight: theme.size.control.md,
          width: theme.size.control.md,
          opacity: pressed ? theme.opacity.pressed : theme.opacity.full,
        },
      ]}
    >
      <SwitchGlyph width={GLYPH_SIZE} height={GLYPH_SIZE} color={glyphColor} />
      <Text variant="body.sEmphasis" color={disabled ? 'disabled' : 'brand'}>
        {currency}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  switch: { alignItems: 'center', justifyContent: 'center' },
});
