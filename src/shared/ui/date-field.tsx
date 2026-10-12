import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { BottomSheet } from './bottom-sheet';
import { Calendar } from './calendar';
import { Icon } from './icon';
import { Text } from './text';

type Props = {
  label: string;
  value?: string | undefined;
  minDate?: string | undefined;
  maxDate?: string | undefined;
  locale: string;
  errorMessage?: string | undefined;
  onChange: (isoDate: string) => void;
  closeLabel: string;
  previousMonthLabel: string;
  nextMonthLabel: string;
};

export function DateField({
  label,
  value,
  minDate,
  maxDate,
  locale,
  errorMessage,
  onChange,
  closeLabel,
  previousMonthLabel,
  nextMonthLabel,
}: Props) {
  const theme = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const display = value === undefined ? undefined : formatDate(value, locale);

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={display === undefined ? undefined : { text: display }}
        onPress={() => {
          setIsOpen(true);
        }}
        style={[
          styles.field,
          {
            backgroundColor: theme.color.bgSurfaceSunken,
            borderColor:
              errorMessage === undefined ? theme.color.borderSubtle : theme.color.borderError,
            borderRadius: theme.radius.md,
            borderWidth: theme.borderWidth.thin,
            gap: theme.spacing.sm,
            minHeight: theme.size.control.lg,
            paddingHorizontal: theme.spacing.lg,
          },
        ]}
      >
        <Text
          variant="body.m"
          color={display === undefined ? 'tertiary' : 'primary'}
          numberOfLines={1}
          style={styles.value}
        >
          {display ?? label}
        </Text>
        <Icon name="calendar-outline" size="sm" color="secondary" />
      </Pressable>

      {errorMessage !== undefined && (
        <Text accessibilityRole="alert" variant="caption.m" color="error">
          {errorMessage}
        </Text>
      )}

      <BottomSheet
        isOpen={isOpen}
        title={label}
        closeLabel={closeLabel}
        onClose={() => {
          setIsOpen(false);
        }}
        hasCloseButton
      >
        <Calendar
          {...(value === undefined ? {} : { value })}
          {...(minDate === undefined ? {} : { minDate })}
          {...(maxDate === undefined ? {} : { maxDate })}
          locale={locale}
          previousLabel={previousMonthLabel}
          nextLabel={nextMonthLabel}
          onSelect={(isoDate) => {
            onChange(isoDate);
            setIsOpen(false);
          }}
        />
      </BottomSheet>
    </View>
  );
}

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

const styles = StyleSheet.create({
  field: { alignItems: 'center', flexDirection: 'row' },
  value: { flex: 1 },
});
