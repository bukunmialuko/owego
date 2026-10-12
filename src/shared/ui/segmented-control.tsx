import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Text } from './text';

export type Segment<Id extends string> = {
  id: Id;
  label: string;
  accessibilityLabel?: string;
};

export type SegmentedAppearance = 'grouped' | 'inline';

export type SegmentedSize = 'md' | 'sm';

type Props<Id extends string> = {
  segments: Segment<Id>[];
  activeId: Id;
  onSelect: (id: Id) => void;
  appearance?: SegmentedAppearance;
  size?: SegmentedSize;
};

export function SegmentedControl<Id extends string>({
  segments,
  activeId,
  onSelect,
  appearance = 'grouped',
  size = 'md',
}: Props<Id>) {
  const theme = useTheme();
  const isGrouped = appearance === 'grouped';
  const isCompact = isGrouped && size === 'sm';

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        isGrouped
          ? {
              backgroundColor: theme.color.fillNeutral,
              borderRadius: theme.radius.pill,
              padding: theme.spacing.xs,
            }
          : { alignSelf: 'center' },
      ]}
    >
      {segments.map((segment) => {
        const isActive = segment.id === activeId;

        return (
          <Pressable
            key={segment.id}
            accessibilityRole="tab"
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              onSelect(segment.id);
            }}
            style={({ pressed }) => [
              styles.segment,
              {
                backgroundColor: isActive
                  ? isGrouped
                    ? theme.color.bgInverse
                    : theme.color.fillBrandStrong
                  : 'transparent',
                borderRadius: theme.radius.pill,
                opacity: pressed && !isActive ? theme.opacity.pressed : theme.opacity.full,
                paddingHorizontal: isGrouped ? theme.spacing.lg : theme.spacing.md,
                paddingVertical: isGrouped && !isCompact ? theme.spacing.md : theme.spacing.sm,
              },
            ]}
          >
            <Text
              variant={isGrouped && !isCompact ? 'body.mEmphasis' : 'body.sEmphasis'}
              color={isActive ? (isGrouped ? 'inverse' : 'onBrand') : 'secondary'}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'flex-start', flexDirection: 'row' },
  segment: { alignItems: 'center', justifyContent: 'center' },
});
