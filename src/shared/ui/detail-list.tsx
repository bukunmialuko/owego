import { Pressable, View } from 'react-native';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/core/design-system/theme-provider';
import { Card } from './card';
import { Icon } from './icon';
import { Text } from './text';

export type DetailItem = {
  label: string;
  value: string;
  secondaryValue?: string;
  emphasis?: boolean;
  isGain?: boolean;
  truncate?: boolean;
  action?: { icon: IoniconsIconName; label: string; onPress: () => void };
};

type Props = {
  items: DetailItem[];
  variant?: 'sunken' | 'canvas';
  size?: 's' | 'm';
};

const SIZES = {
  s: { label: 'body.s', value: 'body.sEmphasis', gap: 'md' },
  m: { label: 'body.m', value: 'body.mEmphasis', gap: 'lg' },
} as const;

export function DetailList({ items, variant = 'sunken', size = 's' }: Props) {
  const theme = useTheme();
  const type = SIZES[size];
  const row = {
    alignItems: 'center',
    flexDirection: 'row',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  } as const;

  return (
    <Card variant={variant} radius="md" gap={type.gap}>
      {items.map((item) => (
        <View key={item.label} style={row}>
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${item.label}, ${item.value}`}
            style={[row, { flex: 1 }]}
          >
            <Text variant={type.label} color="secondary">
              {item.label}
            </Text>

            <Text
              variant={type.value}
              color={
                item.isGain === true ? 'success' : item.emphasis === true ? 'primary' : 'secondary'
              }
              align="right"
              style={{ flexShrink: 1 }}
              {...(item.truncate === true ? { numberOfLines: 1, ellipsizeMode: 'tail' } : {})}
            >
              {item.value}
              {item.secondaryValue !== undefined && (
                <Text variant={type.label} color="tertiary">
                  {` (${item.secondaryValue})`}
                </Text>
              )}
            </Text>
          </View>

          {item.action !== undefined && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.action.label}
              hitSlop={theme.spacing.md}
              onPress={item.action.onPress}
            >
              <Icon name={item.action.icon} size="sm" color="brand" />
            </Pressable>
          )}
        </View>
      ))}
    </Card>
  );
}
