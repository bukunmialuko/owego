import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';
import { Text } from './text';

export type AmountKey = 'delete' | 'decimal' | (string & {});

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'decimal', '0', 'delete'] as const;

type Props = {
  onKey: (key: AmountKey) => void;
  allowDecimal?: boolean;
  hasDecimalKey?: boolean;
  accessory?: { icon: ComponentProps<typeof Icon>['name']; label: string; onPress: () => void };
  disabled?: boolean;
  decimalLabel: string;
  deleteLabel: string;
};

export function AmountKeypad({
  onKey,
  allowDecimal = true,
  hasDecimalKey = true,
  accessory,
  disabled = false,
  decimalLabel,
  deleteLabel,
}: Props) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {KEYS.map((key) => {
        const isDisabled = disabled || (key === 'decimal' && !allowDecimal);

        if (key === 'decimal' && !hasDecimalKey) {
          return accessory === undefined ? (
            <View key={key} style={styles.key} />
          ) : (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityLabel={accessory.label}
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={accessory.onPress}
              style={({ pressed }) => [
                styles.key,
                { opacity: pressed ? theme.opacity.pressed : theme.opacity.full },
              ]}
            >
              <Icon name={accessory.icon} size="lg" color="brand" />
            </Pressable>
          );
        }

        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={labelFor(key, decimalLabel, deleteLabel)}
            accessibilityState={{ disabled: isDisabled }}
            disabled={isDisabled}
            onPress={() => {
              onKey(key);
            }}
            style={({ pressed }) => [
              styles.key,
              { opacity: pressed ? theme.opacity.pressed : theme.opacity.full },
            ]}
          >
            {key === 'delete' ? (
              <Icon name="chevron-back" size="lg" color="secondary" />
            ) : (
              <Text
                variant="numeric.m"
                color={isDisabled ? 'disabled' : key === 'decimal' ? 'secondary' : 'primary'}
              >
                {key === 'decimal' ? '•' : key}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function labelFor(key: AmountKey, decimalLabel: string, deleteLabel: string): string {
  if (key === 'delete') return deleteLabel;

  return key === 'decimal' ? decimalLabel : key;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  key: { width: '33.33%', alignItems: 'center', justifyContent: 'center', height: 64 },
});
