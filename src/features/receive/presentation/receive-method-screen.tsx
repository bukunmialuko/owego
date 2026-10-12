import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet } from 'react-native';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';
import {
  IconCircle,
  ListRow,
  Screen,
  ScreenHeader,
  Text,
  VStack,
  type IconCircleTone,
} from '@/shared/ui';
import BrandCashApp from '@/assets/icons/brand-cash-app.svg';
import BrandPayPal from '@/assets/icons/brand-paypal.svg';
import MethodCard from '@/assets/icons/method-card.svg';
import MethodDigitalAsset from '@/assets/icons/method-digital-asset.svg';
import MethodTransfer from '@/assets/icons/method-transfer.svg';
import MethodWalletAddress from '@/assets/icons/method-wallet-address.svg';
import type { TranslationKey } from '@/core/i18n/translation-key';

type Method = {
  id: 'walletAddress' | 'seeker' | 'bankTransfer' | 'card' | 'cashApp' | 'payPal';
  glyph: ComponentType<SvgProps>;
  tone: IconCircleTone;
  titleKey: TranslationKey;
  detailKey: TranslationKey;
  isAndroidOnly?: boolean;
};

type AvailableMethod = Method & { route: 'DepositAddress' | 'ExternalWalletDeposit' };

const AVAILABLE: AvailableMethod[] = [
  {
    id: 'walletAddress',
    glyph: MethodWalletAddress,
    tone: 'success',
    titleKey: 'receive.methodWalletAddress',
    detailKey: 'receive.methodWalletAddressDetail',
    route: 'DepositAddress',
  },
  {
    id: 'seeker',
    glyph: MethodDigitalAsset,
    tone: 'brand',
    titleKey: 'receive.methodSeeker',
    detailKey: 'receive.methodSeekerDetail',
    isAndroidOnly: true,
    route: 'ExternalWalletDeposit',
  },
];

const COMING_SOON: Method[] = [
  {
    id: 'bankTransfer',
    glyph: MethodTransfer,
    tone: 'error',
    titleKey: 'receive.methodBankTransfer',
    detailKey: 'receive.methodUnavailable',
  },
  {
    id: 'card',
    glyph: MethodCard,
    tone: 'neutral',
    titleKey: 'receive.methodCard',
    detailKey: 'receive.methodUnavailable',
  },
  {
    id: 'cashApp',
    glyph: BrandCashApp,
    tone: 'neutral',
    titleKey: 'receive.methodCashApp',
    detailKey: 'receive.methodUnavailable',
  },
  {
    id: 'payPal',
    glyph: BrandPayPal,
    tone: 'neutral',
    titleKey: 'receive.methodPayPal',
    detailKey: 'receive.methodUnavailable',
  },
];

export function ReceiveMethodScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const available = AVAILABLE.filter(isOnThisPlatform);
  const comingSoon = COMING_SOON.filter(isOnThisPlatform);

  return (
    <Screen scroll isPageSheet contentStyle={styles.content}>
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          closePosition="leading"
          onClose={() => {
            navigation.goBack();
          }}
        />

        <VStack gap="xxs">
          <Text variant="heading.h2">{t('receive.methodsTitle')}</Text>
          <Text variant="body.m" color="secondary">
            {t('receive.methodsSubtitle')}
          </Text>
        </VStack>

        <VStack gap="sm">
          {available.map((method) => (
            <ListRow
              key={method.id}
              title={t(method.titleKey)}
              subtitle={t(method.detailKey)}
              leading={<IconCircle tone={method.tone} glyph={method.glyph} />}
              hasChevron
              onPress={() => {
                navigation.navigate(method.route);
              }}
            />
          ))}
        </VStack>

        <VStack gap="xs">
          <Text variant="body.m" color="tertiary">
            {t('receive.comingSoon')}
          </Text>

          {comingSoon.map((method) => (
            <ListRow
              key={method.id}
              title={t(method.titleKey)}
              subtitle={t(method.detailKey)}
              leading={<IconCircle tone={method.tone} glyph={method.glyph} />}
            />
          ))}
        </VStack>
      </VStack>
    </Screen>
  );
}

function isOnThisPlatform(method: Method): boolean {
  return method.isAndroidOnly !== true || Platform.OS === 'android';
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
});
