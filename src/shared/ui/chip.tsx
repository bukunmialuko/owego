import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';
import { Text } from './text';

export type ChipTone = 'neutral' | 'brandSubtle';

type Props = {
  label: string;
  leading?: React.ReactNode;
  tone?: ChipTone;
  hasChevron?: boolean;
  isExpanded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Chip({
  label,
  leading,
  tone = 'neutral',
  hasChevron = false,
  isExpanded,
  onPress,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();

  const content = (
    <>
      {leading}
      <Text variant="body.mEmphasis" color={tone === 'brandSubtle' ? 'secondary' : 'primary'}>
        {label}
      </Text>
      {hasChevron && (
        <Icon
          name={isExpanded === true ? 'chevron-up' : 'chevron-down'}
          size="sm"
          color="secondary"
        />
      )}
    </>
  );

  const shape = {
    backgroundColor: theme.color[tone === 'brandSubtle' ? 'fillBrandSubtle' : 'fillNeutral'],
    borderRadius: theme.radius.pill,
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  };

  if (onPress === undefined) {
    return (
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel ?? label}
        style={[styles.chip, shape]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...(isExpanded === undefined ? {} : { accessibilityState: { expanded: isExpanded } })}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        shape,
        { opacity: pressed ? theme.opacity.pressed : theme.opacity.full },
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row' },
});
