import { View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';

export function Divider({ inset = false }: { inset?: boolean }) {
  const theme = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{
        backgroundColor: theme.color.borderSubtle,
        height: theme.borderWidth.hairline,
        marginLeft: inset ? theme.spacing.lg : 0,
      }}
    />
  );
}
