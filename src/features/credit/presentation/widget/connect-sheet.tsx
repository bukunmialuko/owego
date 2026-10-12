import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, Card, HStack, Icon, StatusDot, Text, VStack } from '@/shared/ui';
import type { TranslationKey } from '@/core/i18n/translation-key';
import CreditConnect from '@/assets/illustrations/credit-connect.svg';
import YumiMark from '@/assets/icons/credit-yumi-mark.svg';
import SeekerAvatar from '@/assets/icons/credit-seeker-avatar.svg';

type Props = {
  isOpen: boolean;
  onAllow: () => void;
  onClose: () => void;
};

const ROW_ICON_SIZE = 24;

const ACCESS: {
  id: 'history' | 'seeker' | 'wallet';
  titleKey: TranslationKey;
  detailKey: TranslationKey;
  isIncluded: boolean;
}[] = [
  {
    id: 'history',
    titleKey: 'credit.consentTransactionHistory',
    detailKey: 'credit.consentTransactionHistoryDetail',
    isIncluded: true,
  },
  {
    id: 'seeker',
    titleKey: 'credit.consentSeeker',
    detailKey: 'credit.consentSeekerDetail',
    isIncluded: false,
  },
  {
    id: 'wallet',
    titleKey: 'credit.consentWallet',
    detailKey: 'credit.consentWalletDetail',
    isIncluded: false,
  },
];

function AccessIcon({ id }: { id: (typeof ACCESS)[number]['id'] }) {
  switch (id) {
    case 'history':
      return <YumiMark width={ROW_ICON_SIZE} height={ROW_ICON_SIZE} />;
    case 'seeker':
      return <SeekerAvatar width={ROW_ICON_SIZE} height={ROW_ICON_SIZE} />;
    case 'wallet':
      return <Icon name="person-outline" size="lg" color="secondary" />;
  }
}

export function ConnectSheet({ isOpen, onAllow, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <BottomSheet isOpen={isOpen} closeLabel={t('common.close')} onClose={onClose}>
      <VStack align="center" gap="sm" paddingBottom="md">
        <CreditConnect width={100} height={95} />
        <Text variant="heading.h3">{t('credit.connectTitle')}</Text>
        <Text variant="body.m" color="secondary" align="center">
          {t('credit.connectSubtitle')}
        </Text>
      </VStack>

      <Card variant="sunken" padding="lg" gap="lg">
        {ACCESS.map((item) => (
          <HStack
            key={item.id}
            accessible
            accessibilityRole="text"
            accessibilityLabel={t(
              item.isIncluded ? 'credit.consentIncluded' : 'credit.consentExcluded',
              {
                item: `${t(item.titleKey)}, ${t(item.detailKey)}`,
              },
            )}
            gap="md"
          >
            <AccessIcon id={item.id} />

            <VStack style={{ flex: 1 }} gap="xxs">
              <Text variant="body.mEmphasis">{t(item.titleKey)}</Text>
              <Text variant="body.s" color="tertiary">
                {t(item.detailKey)}
              </Text>
            </VStack>

            <StatusDot isDone={item.isIncluded} />
          </HStack>
        ))}
      </Card>

      <VStack gap="sm" paddingTop="md">
        <Text variant="body.m" color="secondary" align="center">
          {t('credit.consentFooter')}
        </Text>
        <Button label={t('credit.allowAndCalculate')} onPress={onAllow} />
        <Button variant="secondary" label={t('credit.notNow')} onPress={onClose} />
      </VStack>
    </BottomSheet>
  );
}
