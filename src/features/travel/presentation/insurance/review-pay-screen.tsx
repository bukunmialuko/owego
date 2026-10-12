import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DetailList,
  HStack,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  VStack,
} from '@/shared/ui';
import { useBuyPolicy, useCoverage, useCovers } from '../hook/use-travel';
import { formatDateRange, formatTravelPrice } from '../../util/format';
import { TIER_NAME } from './tier-copy';
import type { InsuranceParamList } from './insurance-param-list';

export function ReviewPayScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<InsuranceParamList>>();
  const { trip, tier } = useRoute<RouteProp<InsuranceParamList, 'Review'>>().params;

  const covers = useCovers(trip);
  const coverage = useCoverage(tier);
  const buyPolicy = useBuyPolicy();

  const chosen = (covers.data ?? []).find((cover) => cover.tier === tier);
  const amount =
    chosen === undefined
      ? ''
      : formatTravelPrice(chosen.priceMinor, chosen.currency, i18n.language);

  return (
    <Screen scroll>
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          title={t('insurance.reviewAndPay')}
          onBack={() => {
            navigation.goBack();
          }}
          onClose={() => {
            navigation.getParent()?.goBack();
          }}
        />

        <DetailList
          items={[
            { label: t('insurance.plan'), value: t(TIER_NAME[tier]), emphasis: true },
            { label: t('insurance.destination'), value: trip.destinationName, emphasis: true },
            {
              label: t('insurance.dates'),
              value: formatDateRange(trip.departure, trip.returnDate, i18n.language),
              emphasis: true,
            },
            {
              label: t('insurance.travellers'),
              value: String(trip.travellers),
              emphasis: true,
            },
            { label: t('common.amount'), value: amount, emphasis: true },
          ]}
        />

        <VStack gap="sm">
          <Text variant="heading.h6">{t('insurance.whatsCovered')}</Text>

          {coverage.isPending ? (
            <Skeleton height={160} />
          ) : (
            <DetailList
              items={(coverage.data ?? []).map((line) => ({
                label: line.label,
                value: line.value,
                emphasis: true,
              }))}
            />
          )}
        </VStack>

        <VStack gap="md">
          <HStack justify="space-between" gap="md">
            <Text variant="body.m" color="secondary">
              {t('insurance.amountDue')}
            </Text>
            <Text variant="numeric.s">{amount}</Text>
          </HStack>

          <Button
            label={t('insurance.confirmAndPay')}
            disabled={chosen === undefined}
            isLoading={buyPolicy.isPending}
            onPress={() => {
              buyPolicy.mutate(
                { trip, tier },
                {
                  onSuccess: (policy) => {
                    navigation.navigate('Issued', { reference: policy.reference });
                  },
                },
              );
            }}
          />
        </VStack>
      </VStack>
    </Screen>
  );
}
