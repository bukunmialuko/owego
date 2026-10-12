import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/core/design-system/theme-provider';
import {
  CountryFlag,
  Divider,
  HStack,
  ScreenHeader,
  Skeleton,
  Text,
  TextField,
  VStack,
} from '@/shared/ui';
import { searchDestinations, type EsimDestination } from '../../domain/entity/esim-entity';
import { useDestinations, useEsimPlans, usePurchaseEsim } from '../hook/use-travel';
import { formatTravelPrice } from '../../util/format';
import { EsimPlanSheet } from '../widget/esim-plan-sheet';

export function EsimCatalogScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<EsimDestination | undefined>(undefined);

  const destinations = useDestinations();
  const plans = useEsimPlans(selected?.code ?? '');
  const purchase = usePurchaseEsim();

  const matches = searchDestinations(destinations.data ?? [], query);

  return (
    <View style={[styles.fill, { backgroundColor: theme.color.bgCanvas, paddingTop: insets.top }]}>
      <VStack paddingX="lg" gap="lg" paddingBottom="md">
        <ScreenHeader
          title={t('travel.getEsim')}
          onBack={() => {
            navigation.goBack();
          }}
        />

        <TextField
          label={t('travel.searchCountry')}
          value={query}
          onChangeText={setQuery}
          leadingIcon="search"
        />
      </VStack>

      {destinations.isPending ? (
        <VStack paddingX="lg" gap="lg">
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </VStack>
      ) : (
        <FlashList
          data={matches}
          keyExtractor={(destination) => destination.code}
          ItemSeparatorComponent={Divider}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          renderItem={({ item }) => (
            <DestinationRow
              destination={item}
              locale={i18n.language}
              onPress={() => {
                setSelected(item);
              }}
            />
          )}
        />
      )}

      {selected !== undefined && (
        <EsimPlanSheet
          isOpen
          destination={selected}
          plans={plans.data ?? []}
          isPurchasing={purchase.isPending}
          onBuy={(plan) => {
            purchase.mutate(plan.id, {
              onSuccess: (esim) => {
                setSelected(undefined);
                navigation.navigate('EsimPurchased', { esimId: esim.id });
              },
            });
          }}
          onClose={() => {
            setSelected(undefined);
          }}
        />
      )}
    </View>
  );
}

function DestinationRow({
  destination,
  locale,
  onPress,
}: {
  destination: EsimDestination;
  locale: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const price = formatTravelPrice(destination.fromPriceMinor, destination.currency, locale);
  const name =
    destination.code === 'global'
      ? t('travel.globalDestination', { count: 137 })
      : destination.name;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${t('travel.planCount', { count: destination.planCount })}, ${t('travel.fromPrice', { price })}`}
      onPress={onPress}
    >
      <HStack paddingX="lg" paddingY="md" gap="md">
        <CountryFlag code={destination.code} size="sm" />

        <VStack style={styles.copy} gap="xxs">
          <Text variant="body.mEmphasis">{name}</Text>
          <Text variant="body.s" color="tertiary">
            {t('travel.planCount', { count: destination.planCount })}
          </Text>
        </VStack>

        <Text variant="numeric.s">{price}</Text>
      </HStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  copy: { flex: 1 },
});
