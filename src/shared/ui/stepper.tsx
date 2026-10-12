import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';
import { Text } from './text';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  accessibilityLabel: string;
  decrementLabel: string;
  incrementLabel: string;
};

export function Stepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  accessibilityLabel,
  decrementLabel,
  incrementLabel,
}: Props) {
  const theme = useTheme();
  const canDecrement = value > min;
  const canIncrement = value < max;

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'increment' && canIncrement) onChange(value + 1);
        if (event.nativeEvent.actionName === 'decrement' && canDecrement) onChange(value - 1);
      }}
      style={[styles.row, { gap: theme.spacing.md }]}
    >
      <StepButton
        icon="remove"
        label={decrementLabel}
        isEnabled={canDecrement}
        onPress={() => {
          onChange(value - 1);
        }}
      />

      <Text variant="numeric.s">{String(value)}</Text>

      <StepButton
        icon="add"
        label={incrementLabel}
        isEnabled={canIncrement}
        onPress={() => {
          onChange(value + 1);
        }}
      />
    </View>
  );
}

function StepButton({
  icon,
  label,
  isEnabled,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  isEnabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isEnabled }}
      disabled={!isEnabled}
      onPress={onPress}
      hitSlop={theme.spacing.sm}
      style={{
        alignItems: 'center',
        backgroundColor: isEnabled ? theme.color.bgInverse : theme.color.fillDisabled,
        borderRadius: theme.radius.pill,
        height: theme.size.icon.lg,
        justifyContent: 'center',
        width: theme.size.icon.lg,
      }}
    >
      <Icon name={icon} size="sm" color={isEnabled ? 'inverse' : 'disabled'} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row' },
});
