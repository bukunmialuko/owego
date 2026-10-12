import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';
import { Text } from './text';

export type LabelPlacement = 'above' | 'inside';

type Props = {
  label: string;
  value?: string | undefined;
  placeholder: string;
  errorMessage?: string | undefined;
  labelPlacement?: LabelPlacement;
  leading?: React.ReactNode;
  isRequired?: boolean;
  onPress: () => void;
};

export function SelectField({
  label,
  value,
  placeholder,
  errorMessage,
  labelPlacement = 'above',
  leading,
  isRequired = false,
  onPress,
}: Props) {
  const theme = useTheme();
  const hasValue = value !== undefined && value !== '';
  const isInside = labelPlacement === 'inside';

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {!isInside && (
        <Text variant="label.m" color="secondary">
          {label}
        </Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={hasValue ? { text: value } : undefined}
        onPress={onPress}
        style={[
          styles.field,
          {
            backgroundColor: theme.color.bgSurfaceSunken,
            borderRadius: theme.radius.md,
            borderColor:
              errorMessage === undefined ? theme.color.borderSubtle : theme.color.borderError,
            borderWidth: theme.borderWidth.thin,
            gap: theme.spacing.md,
            minHeight: theme.size.control.lg,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: isInside ? theme.spacing.sm : theme.spacing.none,
          },
        ]}
      >
        {leading}

        <View style={styles.value}>
          {isInside && hasValue && (
            <View style={[styles.insideLabel, { gap: theme.spacing.xxs }]}>
              <Text variant="body.s" color="secondary">
                {label}
              </Text>
              {isRequired && (
                <Text
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  variant="body.s"
                  color="error"
                >
                  *
                </Text>
              )}
            </View>
          )}

          <Text
            variant={isInside ? 'body.mEmphasis' : 'body.m'}
            color={hasValue ? 'primary' : 'tertiary'}
            numberOfLines={1}
          >
            {hasValue ? value : placeholder}
          </Text>
        </View>

        <Icon name="chevron-down" size="sm" color="secondary" />
      </Pressable>

      {errorMessage !== undefined && (
        <Text accessibilityRole="alert" variant="caption.m" color="error">
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { alignItems: 'center', flexDirection: 'row' },
  value: { flex: 1 },
  insideLabel: { alignItems: 'center', flexDirection: 'row' },
});
