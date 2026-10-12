import { View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { HStack } from './stack';

type Props = {
  length: number;
  filled: number;
  accessibilityLabel: string;
};

const DOT = 20;

export function PasscodeDots({ length, filled, accessibilityLabel }: Props) {
  const theme = useTheme();

  return (
    <HStack
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      gap="lg"
      justify="center"
    >
      {Array.from({ length }, (_, index) => (
        <View
          key={index}
          style={{
            backgroundColor: index < filled ? theme.color.bgInverse : theme.color.fillNeutral,
            borderColor: theme.color.borderSubtle,
            borderRadius: theme.radius.pill,
            borderWidth: theme.borderWidth.thin,
            height: DOT,
            width: DOT,
          }}
        />
      ))}
    </HStack>
  );
}
