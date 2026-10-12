import { useTranslation } from 'react-i18next';
import { ThemeScope } from '@/core/design-system/theme-provider';
import { BottomSheet, Button, Text, VStack, openLegalDocument } from '@/shared/ui';
import TermsCoin from '@/assets/illustrations/wealth-terms-coin.svg';

const COIN = { width: 78, height: 77 };

type Props = {
  isOpen: boolean;
  onAccept: () => void;
  onClose: () => void;
};

export function TermsSheet(props: Props) {
  return (
    <ThemeScope mode="light">
      <TermsSheetBody {...props} />
    </ThemeScope>
  );
}

function TermsSheetBody({ isOpen, onAccept, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <BottomSheet isOpen={isOpen} closeLabel={t('common.close')} onClose={onClose} hasCloseButton>
      <VStack align="center" gap="xl" paddingTop="xxl" paddingBottom="xxxl">
        <TermsCoin width={COIN.width} height={COIN.height} />

        <VStack align="center" gap="xs">
          <Text variant="heading.h6" align="center">
            {t('wealth.termsTitle')}
          </Text>
          <Text variant="body.m" color="secondary" align="center">
            {`${t('wealth.termsAgreementPrefix')} `}
            <Text variant="body.m" color="brand" onPress={() => void openLegalDocument('terms')}>
              {t('common.termsOfUse')}
            </Text>
            {` ${t('common.and')} `}
            <Text variant="body.m" color="brand" onPress={() => void openLegalDocument('privacy')}>
              {t('common.privacyPolicy')}
            </Text>
          </Text>
        </VStack>
      </VStack>

      <VStack paddingTop="md">
        <Button label={t('common.continue')} onPress={onAccept} />
      </VStack>
    </BottomSheet>
  );
}
