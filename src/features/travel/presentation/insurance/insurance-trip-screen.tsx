import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Card, DateField, Screen, ScreenHeader, SelectField, Text, VStack } from '@/shared/ui';
import { Banner, Button, Divider, HStack, Stepper } from '@/shared/ui';
import { todayIso } from '@/shared/ui';
import { isTripValid, type TripDetails } from '../../domain/entity/insurance-entity';
import { formatTravelPrice } from '../../util/format';
import { DestinationSheet } from '../widget/destination-sheet';
import type { InsuranceParamList } from './insurance-param-list';

const DEFAULT_TRIP_COST_MINOR = 80_000;
const MAX_TRAVELLERS = 9;

export function InsuranceTripScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<InsuranceParamList>>();

  const [trip, setTrip] = useState<TripDetails>({
    destinationCode: '',
    destinationName: '',
    departure: '',
    returnDate: '',
    travellers: 1,
    tripCostMinor: DEFAULT_TRIP_COST_MINOR,
    currency: 'USD',
  });
  const [isDestinationOpen, setIsDestinationOpen] = useState(false);

  return (
    <Screen scroll>
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          title={t('insurance.title')}
          onBack={() => {
            navigation.goBack();
          }}
        />

        <Text variant="body.m" color="secondary" align="center">
          {t('insurance.subtitle')}
        </Text>

        <VStack gap="md">
          <SelectField
            label={t('insurance.destination')}
            value={trip.destinationName}
            placeholder={t('insurance.selectDestination')}
            labelPlacement="inside"
            onPress={() => {
              setIsDestinationOpen(true);
            }}
          />

          <HStack gap="md" align="flex-start">
            <VStack style={{ flex: 1 }}>
              <DateField
                label={t('insurance.departure')}
                value={trip.departure === '' ? undefined : trip.departure}
                minDate={todayIso()}
                locale={i18n.language}
                closeLabel={t('common.close')}
                previousMonthLabel={t('travel.previousMonth')}
                nextMonthLabel={t('travel.nextMonth')}
                onChange={(departure) => {
                  setTrip((current) => ({
                    ...current,
                    departure,
                    returnDate: current.returnDate < departure ? '' : current.returnDate,
                  }));
                }}
              />
            </VStack>

            <VStack style={{ flex: 1 }}>
              <DateField
                label={t('insurance.returnDate')}
                value={trip.returnDate === '' ? undefined : trip.returnDate}
                minDate={trip.departure === '' ? todayIso() : trip.departure}
                locale={i18n.language}
                closeLabel={t('common.close')}
                previousMonthLabel={t('travel.previousMonth')}
                nextMonthLabel={t('travel.nextMonth')}
                onChange={(returnDate) => {
                  setTrip((current) => ({ ...current, returnDate }));
                }}
              />
            </VStack>
          </HStack>
        </VStack>

        <VStack gap="sm">
          <Text variant="heading.h6">{t('insurance.travellersAndCost')}</Text>

          <Card variant="sunken" padding="lg" gap="lg">
            <HStack justify="space-between" gap="md">
              <VStack gap="xxs">
                <Text variant="heading.h6">{t('insurance.travellers')}</Text>
                <Text variant="body.s" color="tertiary">
                  {t('insurance.travellersAge')}
                </Text>
              </VStack>

              <Stepper
                value={trip.travellers}
                min={1}
                max={MAX_TRAVELLERS}
                accessibilityLabel={t('insurance.travellers')}
                decrementLabel={t('insurance.removeTraveller')}
                incrementLabel={t('insurance.addTraveller')}
                onChange={(travellers) => {
                  setTrip((current) => ({ ...current, travellers }));
                }}
              />
            </HStack>

            <Divider />

            <HStack justify="space-between" gap="md">
              <VStack gap="xxs">
                <Text variant="heading.h6">{t('insurance.tripCost')}</Text>
                <Text variant="body.s" color="tertiary">
                  {t('insurance.tripCostHint')}
                </Text>
              </VStack>

              <Text variant="numeric.s">
                {formatTravelPrice(trip.tripCostMinor, trip.currency, i18n.language)}
              </Text>
            </HStack>
          </Card>
        </VStack>

        <Banner tone="warning" message={t('insurance.preExistingWarning')} />

        <Button
          label={t('common.continue')}
          disabled={!isTripValid(trip)}
          onPress={() => {
            navigation.navigate('Cover', { trip });
          }}
        />
      </VStack>

      <DestinationSheet
        isOpen={isDestinationOpen}
        onSelect={(destination) => {
          setTrip((current) => ({
            ...current,
            destinationCode: destination.code,
            destinationName: destination.name,
          }));
          setIsDestinationOpen(false);
        }}
        onClose={() => {
          setIsDestinationOpen(false);
        }}
      />
    </Screen>
  );
}
