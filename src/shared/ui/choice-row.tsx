import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Badge } from './badge';
import { HStack, VStack } from './stack';
import { Icon } from './icon';
import { Text } from './text';

type Props = {
  title: string;
  description?: string;
  value?: string;
  badgeLabel?: string;
  isSelected: boolean;
  onSelect: () => void;
};

const RADIO = 20;

export function ChoiceRow({ title, description, value, badgeLabel, isSelected, onSelect }: Props) {
  const theme = useTheme();
  const label = [title, badgeLabel, value].filter((part) => part !== undefined).join(', ');

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      onPress={onSelect}
      style={({ pressed }) => ({
        opacity: pressed ? theme.opacity.pressed : theme.opacity.full,
      })}
    >
      <VStack paddingY="md" gap="xs">
        <HStack gap="sm">
          <Text variant="heading.h6">{title}</Text>
          {badgeLabel !== undefined && <Badge tone="success" label={badgeLabel} />}

          <View style={styles.spacer} />

          {value !== undefined && <Text variant="numeric.s">{value}</Text>}

          {isSelected ? (
            <Icon name="checkmark-circle" size="md" color="brand" />
          ) : (
            <View
              style={{
                borderColor: theme.color.borderDefault,
                borderRadius: theme.radius.pill,
                borderStyle: 'dashed',
                borderWidth: theme.borderWidth.thin,
                height: RADIO,
                width: RADIO,
              }}
            />
          )}
        </HStack>

        {description !== undefined && (
          <Text variant="body.s" color="secondary">
            {description}
          </Text>
        )}
      </VStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  spacer: { flex: 1 },
});
