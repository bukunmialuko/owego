import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import type { ComponentType } from 'react';
import type { SvgProps } from 'react-native-svg';
import {
  IconCircle,
  ListRow,
  Screen,
  ScreenHeader,
  Skeleton,
  Text,
  VStack,
  type IconCircleTone,
} from '@/shared/ui';
import MethodDigitalAsset from '@/assets/icons/method-digital-asset.svg';
import MethodScan from '@/assets/icons/method-scan.svg';
import MethodTransfer from '@/assets/icons/method-transfer.svg';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { useRecentBeneficiaries } from './hook/use-beneficiaries';
import { usePayAgain } from './hook/use-pay-again';
import { BeneficiaryRow } from './widget/beneficiary-row';

const RECENT_LIMIT = 3;

type Method = {
  id: 'scan' | 'transfer' | 'digitalAsset';
  glyph: ComponentType<SvgProps>;
  tone: IconCircleTone;
  titleKey: TranslationKey;
  detailKey: TranslationKey;
};

const METHODS: Method[] = [
  {
    id: 'scan',
    glyph: MethodScan,
    tone: 'success',
    titleKey: 'spend.methodScanToPay',
    detailKey: 'spend.methodScanToPayDetail',
  },
  {
    id: 'transfer',
    glyph: MethodTransfer,
    tone: 'error',
    titleKey: 'spend.methodTransfer',
    detailKey: 'spend.methodTransferDetail',
  },
  {
    id: 'digitalAsset',
    glyph: MethodDigitalAsset,
    tone: 'brand',
    titleKey: 'spend.methodDigitalAsset',
    detailKey: 'spend.methodDigitalAssetDetail',
  },
];

export function PaymentMethodScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const recent = useRecentBeneficiaries();

  const payAgain = usePayAgain();

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
          <Text variant="heading.h2">{t('spend.makePaymentTitle')}</Text>
          <Text variant="body.m" color="secondary">
            {t('spend.makePaymentSubtitle')}
          </Text>
        </VStack>

        <VStack gap="sm">
          {METHODS.map((method) => (
            <ListRow
              key={method.id}
              title={t(method.titleKey)}
              subtitle={t(method.detailKey)}
              leading={<IconCircle tone={method.tone} glyph={method.glyph} />}
              hasChevron
              onPress={() => {
                if (method.id === 'scan') navigation.navigate('ScanToPay');
                if (method.id === 'digitalAsset') navigation.navigate('SendAsset');
                if (method.id === 'transfer') navigation.navigate('BankTransfer');
              }}
            />
          ))}
        </VStack>

        <VStack gap="xs">
          <Text variant="body.m" color="tertiary">
            {t('spend.recentPayments')}
          </Text>

          {recent.isPending ? (
            <VStack gap="lg" paddingY="sm">
              <Skeleton height={40} />
              <Skeleton height={40} />
            </VStack>
          ) : (
            (recent.data ?? []).slice(0, RECENT_LIMIT).map((beneficiary) => {
              const pay = payAgain(beneficiary);

              return (
                <BeneficiaryRow
                  key={beneficiary.id}
                  beneficiary={beneficiary}
                  disabled={pay === undefined}
                  onPress={() => {
                    pay?.();
                  }}
                />
              );
            })
          )}
        </VStack>
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
});
