import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import type { TypographyVariant } from '@/core/design-system';
import { Text } from './text';

type Props = {
  prefix: string;
  whole: string;
  decimalSeparator: string;
  fraction: string;
  typedFractionDigits: number;
  suffix: string;
  accessibilityLabel: string;
  secondary?: string;
};

export function AmountDisplay({
  prefix,
  whole,
  decimalSeparator,
  fraction,
  typedFractionDigits,
  suffix,
  accessibilityLabel,
  secondary,
}: Props) {
  const theme = useTheme();
  const variant = variantFor(
    prefix.length + whole.length + decimalSeparator.length + fraction.length + suffix.length,
  );

  const typed = fraction.slice(0, typedFractionDigits);
  const placeholder = fraction.slice(typedFractionDigits);

  return (
    <View style={[styles.column, { gap: theme.spacing.xs }]}>
      <Text
        variant={variant}
        align="center"
        accessibilityLabel={accessibilityLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={MINIMUM_FONT_SCALE}
      >
        {`${prefix}${whole}${decimalSeparator}${typed}`}
        {placeholder !== '' && (
          <Text variant={variant} color="tertiary" accessibilityRole={undefined}>
            {placeholder}
          </Text>
        )}
        {suffix}
      </Text>

      {secondary !== undefined && (
        <Text variant="heading.h5" color="secondary" align="center">
          {secondary}
        </Text>
      )}
    </View>
  );
}

function variantFor(length: number): TypographyVariant {
  if (length <= 9) return 'display.2xl';

  return length <= 13 ? 'display.xl' : 'display.l';
}

const MINIMUM_FONT_SCALE = 0.5;

const styles = StyleSheet.create({
  column: { alignItems: 'center', justifyContent: 'center' },
});
