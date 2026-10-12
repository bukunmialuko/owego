import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import type { IoniconsIconName } from '@react-native-vector-icons/ionicons';
import { useTheme } from '@/core/design-system/theme-provider';
import { Icon } from './icon';
import { Text } from './text';
import type { LabelPlacement } from './select-field';

type Props = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  errorMessage?: string;
  hint?: string;
  leadingIcon?: IoniconsIconName;
  isLabelHidden?: boolean;
  labelPlacement?: LabelPlacement;
  isRequired?: boolean;
  shape?: 'well' | 'pill';
  trailingAction?: { label: string; onPress: () => void };
  onClear?: () => void;
  clearLabel?: string;
};

export function TextField({
  label,
  errorMessage,
  hint,
  leadingIcon,
  isLabelHidden = false,
  labelPlacement = 'above',
  isRequired = false,
  shape = 'well',
  trailingAction,
  onClear,
  clearLabel,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const hasError = errorMessage !== undefined;
  const isInside = labelPlacement === 'inside';
  const isPill = shape === 'pill';

  const borderColor = hasError
    ? theme.color.borderError
    : isFocused
      ? theme.color.borderFocus
      : theme.color.borderSubtle;

  const input = (
    <TextInput
      accessibilityLabel={label}
      placeholderTextColor={theme.color.textTertiary}
      onFocus={(event) => {
        setIsFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setIsFocused(false);
        onBlur?.(event);
      }}
      {...rest}
      style={[
        styles.input,
        isInside ? undefined : styles.grow,
        theme.typography[isInside ? 'body.mEmphasis' : 'body.m'],
        { color: theme.color.textPrimary },
      ]}
    />
  );

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {!isLabelHidden && !isInside && (
        <Text variant="label.m" color="secondary">
          {label}
        </Text>
      )}

      <View
        style={[
          styles.well,
          {
            backgroundColor: isPill ? theme.color.fillNeutral : theme.color.bgSurfaceSunken,
            borderColor,
            borderRadius: isPill ? theme.radius.pill : theme.radius.md,
            borderWidth: isPill
              ? theme.borderWidth.none
              : isFocused || hasError
                ? theme.borderWidth.thick
                : theme.borderWidth.thin,
            gap: theme.spacing.sm,
            minHeight: theme.size.control.lg,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: isInside ? theme.spacing.sm : theme.spacing.none,
          },
        ]}
      >
        {leadingIcon !== undefined && <Icon name={leadingIcon} size="sm" color="secondary" />}

        {isInside ? (
          <View style={styles.field}>
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
            {input}
          </View>
        ) : (
          input
        )}

        {trailingAction !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={trailingAction.label}
            onPress={trailingAction.onPress}
            style={({ pressed }) => ({
              backgroundColor: theme.color.bgSurface,
              borderRadius: theme.radius.pill,
              opacity: pressed ? theme.opacity.pressed : theme.opacity.full,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
            })}
          >
            <Text variant="body.mEmphasis" color="brand">
              {trailingAction.label}
            </Text>
          </Pressable>
        )}

        {onClear !== undefined && clearLabel !== undefined && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={clearLabel}
            onPress={onClear}
            style={({ pressed }) => [
              styles.clear,
              {
                backgroundColor: pressed ? theme.color.fillNeutralPressed : theme.color.bgSurface,
                borderRadius: theme.radius.pill,
                height: theme.size.control.sm,
                width: theme.size.control.sm,
              },
            ]}
          >
            <Icon name="close" size="sm" color="primary" />
          </Pressable>
        )}
      </View>

      {hasError ? (
        <Text accessibilityRole="alert" variant="caption.m" color="error">
          {errorMessage}
        </Text>
      ) : (
        hint !== undefined && (
          <Text variant="caption.m" color="tertiary">
            {hint}
          </Text>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  well: { alignItems: 'center', flexDirection: 'row' },
  field: { flex: 1 },
  insideLabel: { alignItems: 'center', flexDirection: 'row' },
  input: { paddingVertical: 0 },
  grow: { flex: 1 },
  clear: { alignItems: 'center', justifyContent: 'center' },
});
