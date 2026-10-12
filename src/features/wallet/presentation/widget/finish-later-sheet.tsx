import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, Text, VStack } from '@/shared/ui';
import type { useOnboardingExit } from '@/core/session/use-onboarding-exit';

type Props = {
  exit: ReturnType<typeof useOnboardingExit>;
};

export function FinishLaterSheet({ exit }: Props) {
  const { t } = useTranslation();

  return (
    <BottomSheet
      isOpen={exit.isConfirmOpen}
      title={t('wallet.finishLaterTitle')}
      closeLabel={t('common.close')}
      hasCloseButton
      onClose={exit.dismiss}
    >
      <VStack gap="lg">
        <Text variant="body.m" color="secondary">
          {t('wallet.finishLaterBody')}
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
  );
}
