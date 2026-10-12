import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';

type Props = {
  isDone: boolean;
  size?: number;
};

export function StatusDot({ isDone, size }: Props) {
  const theme = useTheme();
  const diameter = size ?? theme.size.icon.md;

  if (isDone) {
    return (
      <View accessibilityElementsHidden importantForAccessibility="no">
        <Icon name="checkmark-circle" size="md" color="brand" />
      </View>
    );
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.pending,
        {
          borderColor: theme.color.borderDefault,
          borderRadius: theme.radius.pill,
          borderWidth: theme.borderWidth.thin,
          height: diameter,
          width: diameter,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  pending: { borderStyle: 'dashed' },
});
