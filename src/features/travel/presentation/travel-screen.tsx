import { useCallback, useState } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { useResolve } from '@/core/di/container-provider';
import { FeatureFlag } from '@/core/feature-flags/feature-flags';
import { ComingSoonSheet, HStack, PromoCard, Screen, Skeleton, Text, VStack } from '@/shared/ui';
import HistoryIcon from '@/assets/icons/travel-history.svg';
import PromoEsim from '@/assets/illustrations/promo-esim.svg';
import PromoInsurance from '@/assets/illustrations/promo-insurance.svg';
import promoFlights from '@/assets/images/promo-flights.png';
import promoGlobe from '@/assets/images/promo-globe.png';
import { useInstalledEsims, usePolicies } from './hook/use-travel';
import { TravelIntro } from './widget/travel-intro';

const FLIGHTS_RATIO = 90 / 361;
const INSURANCE_RATIO = 92 / 361;
const ESIM_RATIO = 188 / 361;

const FLIGHTS_HEIGHT = 169 / 361;
const INSURANCE_HEIGHT = 169 / 361;
const ESIM_HEIGHT = 274 / 361;

const GLOBE_RATIO = 132.36 / 361;

const SHORT_DESCRIPTION = 184 / 361;
const ESIM_DESCRIPTION = 236 / 361;

export function TravelScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const isLaunched = useResolve('featureFlags').isEnabled(FeatureFlag.Travel);
  const [isIntroShowing, setIsIntroShowing] = useState(true);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

  const installed = useInstalledEsims();
  const policies = usePolicies();

  useFocusEffect(
    useCallback(() => {
      setIsIntroShowing(true);
    }, []),
  );

  const hasTravelled =
    installed.data === undefined || policies.data === undefined
      ? true
      : installed.data.length > 0 || policies.data.length > 0;

  if (isLaunched && (installed.isPending || policies.isPending)) {
    return (
      <Screen scroll clampsOverscroll hasTabBar>
        <VStack paddingX="lg" paddingTop="sm" gap="xl">
          <TravelHeader />

          <VStack gap="md">
            <CardSkeleton ratio={FLIGHTS_HEIGHT} />
            <CardSkeleton ratio={INSURANCE_HEIGHT} />
            <CardSkeleton ratio={ESIM_HEIGHT} />
          </VStack>
        </VStack>
      </Screen>
    );
  }

  if (!isLaunched || (isIntroShowing && !hasTravelled)) {
    return (
      <Screen scroll clampsOverscroll hasTabBar edgeToEdgeTop variant="surface">
        <TravelIntro
          actionLabel={isLaunched ? t('common.continue') : t('common.comingSoon')}
          onContinue={() => {
            if (isLaunched) {
              setIsIntroShowing(false);
            } else {
              setIsComingSoonOpen(true);
            }
          }}
        />

        <ComingSoonSheet
          isOpen={isComingSoonOpen}
          onClose={() => {
            setIsComingSoonOpen(false);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll clampsOverscroll hasTabBar>
      <VStack paddingX="lg" paddingTop="sm" gap="xl">
        <TravelHeader />

        <VStack gap="md">
          <PromoCard
            tone="flights"
            title={t('travel.flightsCardTitle')}
            description={t('travel.flightsSubtitle')}
            heightRatio={FLIGHTS_HEIGHT}
            descriptionRatio={SHORT_DESCRIPTION}
            artwork={<PromoArtwork ratio={FLIGHTS_RATIO} kind="flights" />}
            onPress={noop}
          />

          <PromoCard
            tone="insurance"
            title={t('insurance.title')}
            description={t('travel.insuranceSubtitle')}
            heightRatio={INSURANCE_HEIGHT}
            descriptionRatio={SHORT_DESCRIPTION}
            artwork={<PromoArtwork ratio={INSURANCE_RATIO} kind="insurance" />}
            onPress={() => {
              navigation.navigate('Insurance');
            }}
          />

          <PromoCard
            tone="esim"
            title={t('travel.esimTitle')}
            description={t('travel.esimSubtitle')}
            actionLabel={t('travel.getEsim')}
            heightRatio={ESIM_HEIGHT}
            descriptionRatio={ESIM_DESCRIPTION}
            artwork={<PromoArtwork ratio={ESIM_RATIO} kind="esim" />}
            onPress={() => {
              navigation.navigate('EsimCatalog');
            }}
          />
        </VStack>
      </VStack>
    </Screen>
  );
}

function TravelHeader() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();

  return (
    <HStack justify="space-between">
      <Text variant="heading.h4">{t('travel.title')}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('travel.myPolicies')}
        onPress={() => {
          navigation.navigate('TravelPolicies');
        }}
        style={({ pressed }) => [
          styles.history,
          {
            backgroundColor: pressed ? theme.color.fillNeutralPressed : theme.color.bgSurface,
            borderRadius: theme.radius.pill,
            height: theme.size.control.md,
            width: theme.size.control.md,
          },
        ]}
      >
        <HistoryIcon
          width={theme.size.icon.md}
          height={theme.size.icon.md}
          color={theme.color.iconBrand}
        />
      </Pressable>
    </HStack>
  );
}

function CardSkeleton({ ratio }: { ratio: number }) {
  const { width } = useCardWidth();

  return <Skeleton height={width * ratio} radius="lg" />;
}

function PromoArtwork({ ratio, kind }: { ratio: number; kind: 'flights' | 'insurance' | 'esim' }) {
  const { width } = useCardWidth();
  const height = width * ratio;

  if (kind === 'flights') {
    return <Image source={promoFlights} style={{ height, width }} resizeMode="cover" />;
  }

  if (kind === 'insurance') {
    return <PromoInsurance width={width} height={height} preserveAspectRatio="xMidYMax slice" />;
  }

  return (
    <View style={{ height, width }}>
      <PromoEsim width={width} height={height} preserveAspectRatio="xMidYMax slice" />
      <Image
        source={promoGlobe}
        style={[styles.globe, { height: width * GLOBE_RATIO, width }]}
        resizeMode="cover"
      />
    </View>
  );
}

function useCardWidth() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  return { width: width - theme.spacing.lg * 2 };
}

function noop() {}

const styles = StyleSheet.create({
  history: { alignItems: 'center', justifyContent: 'center' },
  globe: { bottom: 0, left: 0, position: 'absolute' },
});
