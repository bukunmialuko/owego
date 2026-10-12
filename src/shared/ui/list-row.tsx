import { Pressable, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';
import { Text } from './text';

type Props = {
  title: string;
  subtitle?: string;
  trailing?: string;
  trailingNode?: React.ReactNode;
  leading?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  selected?: boolean;
  hasChevron?: boolean;
};

export function ListRow({
  title,
  subtitle,
  trailing,
  trailingNode,
  leading,
  onPress,
  disabled = false,
  selected = false,
  hasChevron = false,
}: Props) {
  const theme = useTheme();
  const label = [title, subtitle, trailing].filter(Boolean).join(', ');

  const content = (
    <View
      style={{
        alignItems: 'center',
        flexDirection: 'row',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
      }}
    >
      {leading}

      <View style={{ flex: 1, gap: theme.spacing.xxs }}>
        <Text variant="body.mEmphasis" color={disabled ? 'disabled' : 'primary'} numberOfLines={1}>
          {title}
        </Text>
        {subtitle !== undefined && (
          <Text variant="body.s" color="tertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {trailingNode ??
        (trailing !== undefined && (
          <Text variant="body.sMedium" color="secondary">
            {trailing}
          </Text>
        ))}

      {selected ? (
        <Icon name="checkmark" size="sm" color="success" />
      ) : (
        hasChevron && <Icon name="chevron-forward" size="sm" color="secondary" />
      )}
    </View>
  );

  if (onPress === undefined) {
    return (
      <View accessible accessibilityRole="text" accessibilityLabel={label}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : theme.opacity.full })}
    >
      {content}
    </Pressable>
  );
}
