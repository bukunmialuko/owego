import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  ChoiceRow,
  CountryFlag,
  Divider,
  HStack,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  VStack,
} from '@/shared/ui';
import { tripNights, type CoverTier } from '../../domain/entity/insurance-entity';
import { useCovers } from '../hook/use-travel';
import { formatTravelPrice } from '../../util/format';
import { TIER_DESCRIPTION, TIER_NAME } from './tier-copy';
import type { InsuranceParamList } from './insurance-param-list';

export function ChooseCoverScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<InsuranceParamList>>();
  const { trip } = useRoute<RouteProp<InsuranceParamList, 'Cover'>>().params;

  const covers = useCovers(trip);
  const [tier, setTier] = useState<CoverTier>('essential');

  return (
    <Screen scroll>
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          title={t('insurance.chooseCover')}
          onBack={() => {
            navigation.goBack();
          }}
        />

        <Card variant="sunken" radius="pill" padding="md">
          <HStack gap="md">
            <CountryFlag code={trip.destinationCode} />
            <VStack gap="xxs">
              <Text variant="heading.h6">
                {t('insurance.tripSummary', { nights: tripNights(trip) })}
              </Text>
              <Text variant="body.m" color="tertiary">
                {t('insurance.tripSummaryDetail', {
                  travellers: trip.travellers,
                  cost: formatTravelPrice(trip.tripCostMinor, trip.currency, i18n.language),
                })}
              </Text>
            </VStack>
          </HStack>
        </Card>

        <VStack gap="sm">
          <Text variant="body.m" color="secondary">
            {t('insurance.availableCovers')}
          </Text>

          {covers.isPending ? (
            <VStack gap="lg" paddingY="sm">
              <Skeleton height={72} />
              <Skeleton height={72} />
            </VStack>
          ) : (
            <Card variant="sunken" padding="lg" gap="none">
              {(covers.data ?? []).map((cover, index) => (
                <VStack key={cover.tier} gap="none">
                  {index > 0 && <Divider />}
                  <ChoiceRow
                    title={t(TIER_NAME[cover.tier])}
                    description={t(TIER_DESCRIPTION[cover.tier])}
                    value={formatTravelPrice(cover.priceMinor, cover.currency, i18n.language)}
                    {...(cover.isMostPopular ? { badgeLabel: t('insurance.mostPopular') } : {})}
                    isSelected={cover.tier === tier}
                    onSelect={() => {
                      setTier(cover.tier);
                    }}
                  />
                </VStack>
              ))}
            </Card>
          )}
        </VStack>

        <Button
          label={t('common.continue')}
          disabled={(covers.data ?? []).length === 0}
          onPress={() => {
            navigation.navigate('Review', { trip, tier });
          }}
        />
      </VStack>
    </Screen>
  );
}
