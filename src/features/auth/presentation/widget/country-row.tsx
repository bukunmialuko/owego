import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemeScope, useTheme } from '@/core/design-system/theme-provider';
import type { CountryDto } from '@/core/reference-data/reference-data';
import { CountryFlag, HStack, Icon, SelectSheet, Text } from '@/shared/ui';

type Props = {
  selected: CountryDto | undefined;
  options: CountryDto[];
  onSelect: (code: string) => void;
};

const FLAG_DIAMETER = 20;

export function CountryRow({ selected, options, onSelect }: Props) {
  const { t } = useTranslation();
  const [isOpen, setOpen] = useState(false);

  const label = selected?.name ?? t('auth.selectCountryPlaceholder');

  return (
    <View style={styles.center}>
      <ThemeScope mode="light">
        <CountryPill
          selected={selected}
          label={label}
          accessibilityLabel={`${t('auth.selectCountry')}, ${label}`}
          onPress={() => {
            setOpen(true);
          }}
        />
      </ThemeScope>

      <SelectSheet
        isOpen={isOpen}
        title={t('common.selectCountry')}
        closeLabel={t('common.close')}
        searchPlaceholder={t('common.searchCountry')}
        emptyMessage={t('common.noItemsFound')}
        {...(selected === undefined ? {} : { selectedId: selected.code })}
        options={options.map((country) => ({
          id: country.code,
          title: country.name,
          leading: <CountryFlag code={country.code} size="sm" />,
        }))}
        onSelect={(code) => {
          onSelect(code);
          setOpen(false);
        }}
        onClose={() => {
          setOpen(false);
        }}
      />
    </View>
  );
}

function CountryPill({
  selected,
  label,
  accessibilityLabel,
  onPress,
}: {
  selected: CountryDto | undefined;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? theme.color.fillNeutralPressed : theme.color.bgSurface,
        borderRadius: theme.radius.pill,
        opacity: pressed ? theme.opacity.pressed : theme.opacity.full,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      })}
    >
      <HStack gap="sm" align="center">
        {selected !== undefined && <CountryFlag code={selected.code} diameter={FLAG_DIAMETER} />}
        <Text variant="body.sMedium">{label}</Text>
        <Icon name="chevron-down" size="sm" color="secondary" />
      </HStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
});
