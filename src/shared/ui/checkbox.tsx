import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';

type Props = {
  isChecked: boolean;
  accessibilityLabel: string;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

const BOX = 22;

export function Checkbox({ isChecked, accessibilityLabel, onChange, disabled = false }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: isChecked, disabled }}
      disabled={disabled}
      hitSlop={theme.spacing.sm}
      onPress={() => {
        onChange(!isChecked);
      }}
      style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : theme.opacity.full })}
    >
      <View
        style={[
          styles.box,
          {
            backgroundColor: isChecked ? theme.color.fillBrandStrong : theme.color.bgSurface,
            borderColor: isChecked ? theme.color.fillBrandStrong : theme.color.borderStrong,
            borderRadius: theme.radius.sm,
          },
        ]}
      >
        {isChecked && <Icon name="checkmark" size="sm" color="onBrand" />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    borderWidth: 1,
    height: BOX,
    justifyContent: 'center',
    width: BOX,
  },
});
