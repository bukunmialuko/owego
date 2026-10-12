import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Avatar } from './avatar';
import { IconCircle, type IconCircleTone } from './icon-circle';
import { Text } from './text';

export type AvatarTint = IconCircleTone;

export type AvatarStripItem = {
  id: string;
  label: string;
  tint: AvatarTint;
  initialsFor?: string;
};

type Props = {
  items: AvatarStripItem[];
  onSelect: (id: string) => void;
};

const MAX_LABEL = 8;

export function AvatarStrip({ items, onSelect }: Props) {
  const theme = useTheme();

  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing.lg, paddingHorizontal: theme.spacing.lg }}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={item.label}
          onPress={() => {
            onSelect(item.id);
          }}
          style={({ pressed }) => [
            styles.item,
            {
              gap: theme.spacing.sm,
              opacity: pressed ? theme.opacity.pressed : theme.opacity.full,
            },
          ]}
        >
          {item.initialsFor === undefined ? (
            <IconCircle tone={item.tint} icon="person" />
          ) : (
            <Avatar name={item.initialsFor} size="lg" />
          )}

          <Text variant="body.sMedium" numberOfLines={1}>
            {shortLabelFor(item.label)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function shortLabelFor(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  const [head = first] = first.split('…');

  return head.length > MAX_LABEL ? `${head.slice(0, MAX_LABEL)}…` : head;
}

const styles = StyleSheet.create({
  item: { alignItems: 'center', maxWidth: 72 },
});
