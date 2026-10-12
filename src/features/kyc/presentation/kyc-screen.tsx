import { useState } from 'react';
import { Image, StyleSheet, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import kycHero from '@/assets/images/kyc-hero.jpg';
import PhoneIcon from '@/assets/icons/phone.svg';
import UserSquareIcon from '@/assets/icons/user-square.svg';
import PageFlipIcon from '@/assets/icons/page-flip.svg';
import {
  BottomSheet,
  Button,
  Card,
  Checkbox,
  HStack,
  openLegalDocument,
  Screen,
  Text,
  useIconColor,
  VStack,
} from '@/shared/ui';
import { useResolve } from '@/core/di/container-provider';
import { rememberKycSkipped } from '@/core/session/kyc-skip';
import { useOnboardingExit } from '@/core/session/use-onboarding-exit';
import { useSession } from '@/core/session/use-session';
import { useKycVerification } from './hook/use-kyc-verification';

const HERO_RATIO = 292 / 393;
const GLYPH_SIZE = 24;

export function KycScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const glyphColor = useIconColor('brand');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const { stageAdvanced } = useSession();
  const cache = useResolve('cache');
  const { start, isStarting } = useKycVerification({
    onCompleted: () => {
      stageAdvanced('ready');
    },
  });
  const exit = useOnboardingExit();

  const requirements = [
    { glyph: PhoneIcon, title: t('kyc.phoneNumber'), subtitle: t('kyc.phoneNumberDetail') },
    {
      glyph: UserSquareIcon,
      title: t('kyc.identityDocument'),
      subtitle: t('kyc.identityDocumentDetail'),
    },
    {
      glyph: PageFlipIcon,
      title: t('kyc.utilityBill'),
      subtitle: t('kyc.utilityBillDetail'),
    },
  ];

  return (
    <Screen
      scroll
      clampsOverscroll
      variant="surface"
      edgeToEdgeTop
      panHandlers={exit.panHandlers}
      footer={
        <VStack gap="sm" paddingX="lg">
          <Button
            label={t('common.continue')}
            disabled={!hasAcceptedTerms}
            isLoading={isStarting}
            onPress={() => {
              void start();
            }}
          />
          <Button
            variant="secondary"
            label={t('kyc.skipForNow')}
            disabled={isStarting}
            onPress={() => {
              rememberKycSkipped(cache);
              stageAdvanced('ready');
            }}
          />
        </VStack>
      }
    >
      <Image
        accessibilityIgnoresInvertColors
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('kyc.heroAlt')}
        source={kycHero}
        resizeMode="cover"
        style={[styles.hero, { height: width * HERO_RATIO }]}
      />

      <VStack gap="xl" paddingX="lg" paddingY="xl">
        <VStack gap="sm">
          <Text variant="heading.h4" align="center">
            {t('kyc.title')}
          </Text>
          <Text variant="body.s" color="secondary" align="center">
            {t('kyc.subtitle')}
          </Text>
        </VStack>

        <Card variant="canvas" radius="md" paddingX="sm" paddingY="md" gap="xl">
          {requirements.map(({ glyph: Glyph, title, subtitle }) => (
            <HStack key={title} gap="md" align="flex-start">
              <Glyph width={GLYPH_SIZE} height={GLYPH_SIZE} color={glyphColor} />
              <VStack style={styles.copy} gap="xxs">
                <Text variant="body.mEmphasis">{title}</Text>
                <Text variant="body.s" color="secondary">
                  {subtitle}
                </Text>
              </VStack>
            </HStack>
          ))}
        </Card>

        <HStack gap="md" align="flex-start">
          <Checkbox
            isChecked={hasAcceptedTerms}
            accessibilityLabel={t('kyc.acceptTerms')}
            onChange={setHasAcceptedTerms}
          />
          <Text variant="body.sMedium" color="secondary" style={styles.legal}>
            {`${t('kyc.termsPrefix')} `}
            <Text
              variant="body.sMedium"
              color="brand"
              style={styles.link}
              onPress={() => void openLegalDocument('terms')}
            >
              {t('common.termsOfUse')}
            </Text>
            {` ${t('common.and')} `}
            <Text
              variant="body.sMedium"
              color="brand"
              style={styles.link}
              onPress={() => void openLegalDocument('privacy')}
            >
              {t('common.privacyPolicy')}
            </Text>
          </Text>
        </HStack>
      </VStack>

      <BottomSheet
        isOpen={exit.isConfirmOpen}
        title={t('kyc.finishLaterTitle')}
        closeLabel={t('common.close')}
        hasCloseButton
        onClose={exit.dismiss}
      >
        <VStack gap="lg">
          <Text variant="body.m" color="secondary">
            {t('kyc.finishLaterBody')}
          </Text>
          <Button label={t('kyc.keepGoing')} onPress={exit.dismiss} />
          <Button
            variant="secondary"
            label={t('kyc.finishLater')}
            onPress={() => {
              void exit.confirmExit();
            }}
          />
        </VStack>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { width: '100%' },
  copy: { flex: 1 },
  legal: { flex: 1 },
  link: { textDecorationLine: 'underline' },
});
