import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CountryFlag,
  HStack,
  Screen,
  ScreenHeader,
  Text,
  VStack,
  useIconColor,
} from '@/shared/ui';
import EsimPurchasedArt from '@/assets/illustrations/esim-purchased.svg';
import GlobeGlyph from '@/assets/icons/globe.svg';
import type { AppStackParamList } from '@/navigation/param-list';
import { useInstallEsim, useInstalledEsims } from '../hook/use-travel';

const ART = { width: 211, height: 179 };
const GLYPH_SIZE = 24;

export function EsimPurchasedScreen() {
  const { t } = useTranslation();
  const glyphColor = useIconColor('brand');
  const navigation = useNavigation();
  const { esimId } = useRoute<RouteProp<AppStackParamList, 'EsimPurchased'>>().params;

  const installed = useInstalledEsims();
  const install = useInstallEsim();
  const esim = (installed.data ?? []).find((entry) => entry.id === esimId);

  return (
    <Screen scroll>
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          closePosition="leading"
          onClose={() => {
            navigation.goBack();
          }}
        />

        <VStack align="center" gap="lg">
          <EsimPurchasedArt width={ART.width} height={ART.height} />
          <Text variant="heading.h5">{t('travel.esimPurchased')}</Text>
        </VStack>

        {esim !== undefined && (
          <Card variant="sunken" radius="md" padding="md" gap="lg">
            <Card radius="md" padding="md">
              <HStack gap="md">
                <CountryFlag code={esim.destinationCode} />
                <VStack gap="xxs">
                  <Text variant="heading.h6">
                    {t('travel.countryEsimTitle', { country: esim.destinationName })}
                  </Text>
                  <Text variant="body.s" color="secondary">
                    {t('travel.esimSummary', {
                      data: esim.dataLabel,
                      days: esim.durationDays,
                    })}
                  </Text>
                </VStack>
              </HStack>
            </Card>

            <HStack gap="md" align="flex-start" paddingX="sm">
              <GlobeGlyph width={GLYPH_SIZE} height={GLYPH_SIZE} color={glyphColor} />
              <Text variant="body.s" style={{ flex: 1 }}>
                {t('travel.installOnWifi')}
              </Text>
            </HStack>

            <Button
              label={t('travel.installNow')}
              isLoading={install.isPending}
              onPress={() => {
                install.mutate(esim.id, {
                  onSuccess: () => {
                    navigation.goBack();
                  },
                });
              }}
            />
          </Card>
        )}

        <VStack gap="sm">
          <Button
            variant="secondary"
            label={t('travel.installLater')}
            onPress={() => {
              navigation.goBack();
            }}
          />
          <Button variant="secondary" label={t('travel.installOnAnotherDevice')} onPress={noop} />
        </VStack>
      </VStack>
    </Screen>
  );
}

function noop() {}
