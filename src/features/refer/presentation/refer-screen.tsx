import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Image, Share, StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Banner,
  Button,
  Gradient,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  VStack,
} from '@/shared/ui';
import Watermark from '@/assets/illustrations/refer-watermark.svg';
import heroArt from '@/assets/illustrations/refer-hero.png';
import { HowItWorksCard } from './widget/how-it-works-card';
import { ReferralCodeCard } from './widget/referral-code-card';
import { useReferralSummary } from './hook/use-refer';
import type { ReferParamList } from './refer-param-list';

const HEADER_HEIGHT = 359;

const HERO_WIDTH = 212;
const HERO_HEIGHT = 223;

export function ReferScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<ReferParamList>>();
  const summary = useReferralSummary();

  return (
    <Screen
      scroll
      clampsOverscroll
      variant="surface"
      backdrop={
        <Gradient name="referHeader" style={[styles.band, { height: HEADER_HEIGHT }]}>
          <Watermark width="100%" height={HEADER_HEIGHT} preserveAspectRatio="xMidYMin slice" />
        </Gradient>
      }
    >
      <VStack gap="xl">
        <VStack paddingX="lg">
          <ScreenHeader
            title={t('refer.title')}
            closePosition="leading"
            tone="surface"
            onClose={() => {
              navigation.goBack();
            }}
          />
        </VStack>

        <VStack
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('refer.heroLabel')}
          paddingBottom="sm"
        >
          <Image source={heroArt} style={styles.hero} resizeMode="contain" />
        </VStack>

        <VStack paddingX="lg" gap="xl">
          <VStack gap="lg">
            {summary.isPending ? (
              <Skeleton height={52} radius="sm" />
            ) : summary.isError ? (
              <Banner tone="error" message={t('refer.unavailable')} />
            ) : summary.data === null ? (
              <Banner tone="info" message={t('refer.noCodeYet')} />
            ) : (
              <ReferralCodeCard code={summary.data.code} />
            )}

            <Button
              label={t('refer.shareInvite')}
              disabled={summary.data === null || summary.data === undefined}
              onPress={() => {
                if (summary.data === null || summary.data === undefined) return;

                void Share.share({
                  message: t('refer.shareMessage', {
                    code: summary.data.code,
                    url: summary.data.shareUrl,
                  }),
                });
              }}
            />
          </VStack>

          <VStack gap="sm">
            <Text variant="body.mMedium" color="secondary">
              {t('refer.howItWorks')}
            </Text>
            <HowItWorksCard />
          </VStack>

          <Button
            variant="secondary"
            label={t('refer.viewEarnings')}
            onPress={() => {
              navigation.navigate('Earnings');
            }}
          />
        </VStack>
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
  hero: { alignSelf: 'center', height: HERO_HEIGHT, width: HERO_WIDTH },
});
