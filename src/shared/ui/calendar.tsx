import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { HStack, VStack } from './stack';
import { Icon } from './icon';
import { Text } from './text';

type Props = {
  value?: string;
  onSelect: (isoDate: string) => void;
  minDate?: string;
  maxDate?: string;
  locale: string;
  previousLabel: string;
  nextLabel: string;
};

const DAYS_IN_WEEK = 7;

export function Calendar({
  value,
  onSelect,
  minDate,
  maxDate,
  locale,
  previousLabel,
  nextLabel,
}: Props) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(value ?? todayIso()));

  const weeks = useMemo(() => buildMonth(visibleMonth), [visibleMonth]);
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
        new Date(`${visibleMonth}-01T00:00:00Z`),
      ),
    [locale, visibleMonth],
  );
  const weekdays = useMemo(() => weekdayInitials(locale), [locale]);

  return (
    <VStack gap="md">
      <HStack justify="space-between">
        <MonthControl
          icon="chevron-back"
          label={previousLabel}
          onPress={() => {
            setVisibleMonth(shiftMonth(visibleMonth, -1));
          }}
        />
        <Text variant="heading.h6">{monthLabel}</Text>
        <MonthControl
          icon="chevron-forward"
          label={nextLabel}
          onPress={() => {
            setVisibleMonth(shiftMonth(visibleMonth, 1));
          }}
        />
      </HStack>

      <HStack>
        {weekdays.map((weekday) => (
          <View key={weekday.key} style={styles.cell}>
            <Text variant="caption.m" color="tertiary" align="center">
              {weekday.label}
            </Text>
          </View>
        ))}
      </HStack>

      {weeks.map((week) => (
        <HStack key={week[0]?.key ?? ''}>
          {week.map((day) => (
            <View key={day.key} style={styles.cell}>
              {day.iso !== undefined && (
                <Day
                  iso={day.iso}
                  locale={locale}
                  isSelected={day.iso === value}
                  isDisabled={isOutOfRange(day.iso, minDate, maxDate)}
                  onSelect={onSelect}
                />
              )}
            </View>
          ))}
        </HStack>
      ))}
    </VStack>
  );
}

function Day({
  iso,
  locale,
  isSelected,
  isDisabled,
  onSelect,
}: {
  iso: string;
  locale: string;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (iso: string) => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(`${iso}T00:00:00Z`))}
      accessibilityState={{ selected: isSelected, disabled: isDisabled }}
      disabled={isDisabled}
      onPress={() => {
        onSelect(iso);
      }}
      style={{
        alignItems: 'center',
        backgroundColor: isSelected ? theme.color.fillBrandStrong : 'transparent',
        borderRadius: theme.radius.pill,
        height: theme.size.control.sm,
        justifyContent: 'center',
        width: theme.size.control.sm,
      }}
    >
      <Text variant="body.m" color={isSelected ? 'onBrand' : isDisabled ? 'disabled' : 'primary'}>
        {String(Number(iso.slice(8, 10)))}
      </Text>
    </Pressable>
  );
}

function MonthControl({
  icon,
  label,
  onPress,
}: {
  icon: 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={theme.spacing.sm}
      style={{
        alignItems: 'center',
        height: theme.size.control.sm,
        justifyContent: 'center',
        width: theme.size.control.sm,
      }}
    >
      <Icon name={icon} size="md" color="primary" />
    </Pressable>
  );
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonth(iso: string): string {
  return iso.slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = month.split('-').map(Number);
  const shifted = new Date(Date.UTC(year ?? 1970, (monthIndex ?? 1) - 1 + delta, 1));

  return shifted.toISOString().slice(0, 7);
}

function isOutOfRange(iso: string, minDate?: string, maxDate?: string): boolean {
  if (minDate !== undefined && iso < minDate) return true;

  return maxDate !== undefined && iso > maxDate;
}

type Cell = { key: string; iso?: string };

function buildMonth(month: string): Cell[][] {
  const [year, monthIndex] = month.split('-').map(Number);
  const first = new Date(Date.UTC(year ?? 1970, (monthIndex ?? 1) - 1, 1));
  const dayCount = new Date(Date.UTC(year ?? 1970, monthIndex ?? 1, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % DAYS_IN_WEEK;

  const cells: Cell[] = Array.from({ length: leading }, (_, index) => ({
    key: `${month}-blank-${String(index)}`,
  }));

  for (let day = 1; day <= dayCount; day += 1) {
    const iso = `${month}-${String(day).padStart(2, '0')}`;
    cells.push({ key: iso, iso });
  }

  while (cells.length % DAYS_IN_WEEK !== 0) {
    cells.push({ key: `${month}-tail-${String(cells.length)}` });
  }

  return Array.from({ length: cells.length / DAYS_IN_WEEK }, (_, week) =>
    cells.slice(week * DAYS_IN_WEEK, week * DAYS_IN_WEEK + DAYS_IN_WEEK),
  );
}

function weekdayInitials(locale: string): { key: string; label: string }[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: 'narrow', timeZone: 'UTC' });

  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => {
    const date = new Date(Date.UTC(2024, 0, 1 + index));

    return { key: `weekday-${String(index)}`, label: format.format(date) };
  });
}

const styles = StyleSheet.create({
  cell: { alignItems: 'center', flex: 1 },
});
