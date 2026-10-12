import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CountryFlag,
  DetailList,
  HStack,
  Screen,
  ScreenHeader,
  Text,
  VStack,
} from '@/shared/ui';
import EsimPurchasedArt from '@/assets/illustrations/esim-purchased.svg';
import { usePolicies } from '../hook/use-travel';
import { formatDateRange, formatTravelPrice } from '../../util/format';
import { TIER_NAME } from './tier-copy';
import type { InsuranceParamList } from './insurance-param-list';

const ART = { width: 211, height: 179 };

export function PolicyIssuedScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<InsuranceParamList>>();
  const { reference } = useRoute<RouteProp<InsuranceParamList, 'Issued'>>().params;

  const policies = usePolicies();
  const policy = (policies.data ?? []).find((entry) => entry.reference === reference);

  return (
    <Screen scroll>
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          closePosition="leading"
          onClose={() => {
            navigation.getParent()?.goBack();
          }}
        />

        <VStack align="center" gap="lg">
          <EsimPurchasedArt width={ART.width} height={ART.height} />
          <Text variant="heading.h5">{t('insurance.youreCovered')}</Text>
        </VStack>

        {policy !== undefined && (
          <Card variant="sunken" radius="md" padding="md" gap="sm">
            <Card radius="md" padding="sm">
              <HStack gap="sm">
                <CountryFlag code={policy.trip.destinationCode} size="lg" />
                <VStack gap="xxs">
                  <Text variant="heading.h6">
                    {`${t(TIER_NAME[policy.tier])} ${t('insurance.coverName')}`}
                  </Text>
                  <Text variant="body.s" color="secondary">
                    {`${policy.underwriter} · ${policy.reference}`}
                  </Text>
                </VStack>
              </HStack>
            </Card>

            <DetailList
              variant="canvas"
              items={[
                {
                  label: t('insurance.destination'),
                  value: policy.trip.destinationName,
                  emphasis: true,
                },
                {
                  label: t('insurance.dates'),
                  value: formatDateRange(
                    policy.trip.departure,
                    policy.trip.returnDate,
                    i18n.language,
                  ),
                  emphasis: true,
                },
                {
                  label: t('insurance.travellers'),
                  value: String(policy.trip.travellers),
                  emphasis: true,
                },
                {
                  label: t('common.amount'),
                  value: formatTravelPrice(policy.amountMinor, policy.trip.currency, i18n.language),
                  emphasis: true,
                },
              ]}
            />
          </Card>
        )}

        <VStack gap="sm">
          <Button label={t('insurance.downloadCertificate')} onPress={noop} />
          <Button
            variant="secondary"
            label={t('common.done')}
            onPress={() => {
              navigation.getParent()?.goBack();
            }}
          />
        </VStack>
      </VStack>
    </Screen>
  );
}

function noop() {}
