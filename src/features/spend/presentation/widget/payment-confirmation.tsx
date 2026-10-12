import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Banner, Button, HStack, Screen, ScreenHeader, Switch, Text, VStack } from '@/shared/ui';

type Props = {
  isLocked: boolean;
  onBack: () => void;
  onClose: () => void;
  hero?: ReactNode;
  recipient: ReactNode;
  problem?: string;
  summary: ReactNode;
  notice?: string;
  saveSwitch?: { checked: boolean; onChange: (next: boolean) => void };
  canConfirm: boolean;
  onConfirm: () => void;
};

export function PaymentConfirmation({
  isLocked,
  onBack,
  onClose,
  hero,
  recipient,
  problem,
  summary,
  notice,
  saveSwitch,
  canConfirm,
  onConfirm,
}: Props) {
  const { t } = useTranslation();

  return (
    <Screen
      scroll
      footer={
        <VStack gap="lg">
          {saveSwitch !== undefined && (
            <HStack justify="space-between" gap="md">
              <Text variant="body.mEmphasis">{t('spend.saveAsBeneficiary')}</Text>
              <Switch
                checked={saveSwitch.checked}
                onChange={saveSwitch.onChange}
                label={t('spend.saveAsBeneficiary')}
              />
            </HStack>
          )}

          {notice !== undefined && <Banner tone="error" message={notice} />}

          <Button
            label={t('common.confirm')}
            disabled={!canConfirm}
            isLoading={isLocked}
            onPress={onConfirm}
          />
        </VStack>
      }
    >
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          title={t('spend.confirmPayment')}
          {...(isLocked ? {} : { onBack, onClose })}
        />

        {hero !== undefined && (
          <VStack paddingTop="lg" paddingBottom="xl">
            {hero}
          </VStack>
        )}

        <VStack gap="xs">
          {recipient}
          {problem !== undefined && <Banner tone="error" message={problem} />}
          {summary}
        </VStack>
      </VStack>
    </Screen>
  );
}
