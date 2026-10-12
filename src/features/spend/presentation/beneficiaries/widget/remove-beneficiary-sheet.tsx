import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, Icon, Text, VStack } from '@/shared/ui';
import type { TranslationKey } from '@/core/i18n/translation-key';
import type { Beneficiary } from '../../../domain/entity/beneficiary';
import { beneficiaryTitle } from '../../widget/beneficiary-text';

const REMOVE_BODY = {
  bank: 'spend.beneficiaries.removeBodyBank',
  wallet: 'spend.beneficiaries.removeBodyWallet',
  merchant: 'spend.beneficiaries.removeBodyMerchant',
} as const satisfies Record<Beneficiary['kind'], TranslationKey>;

type Props = {
  beneficiary: Beneficiary;
  isOpen: boolean;
  isRemoving: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function RemoveBeneficiarySheet({
  beneficiary,
  isOpen,
  isRemoving,
  onConfirm,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const name = beneficiaryTitle(beneficiary, t);

  return (
    <BottomSheet isOpen={isOpen} closeLabel={t('common.close')} onClose={onClose}>
      <VStack align="center" gap="sm" paddingTop="lg">
        <Icon name="warning" size="xl" color="error" />
        <Text variant="heading.h3" align="center">
          {t('spend.beneficiaries.removeTitle')}
        </Text>
        <Text variant="body.m" color="secondary" align="center">
          {t(REMOVE_BODY[beneficiary.kind], { name })}
        </Text>
      </VStack>

      <VStack gap="sm" paddingTop="xl">
        <Button
          variant="secondary"
          label={t('spend.beneficiaries.removeCancel')}
          disabled={isRemoving}
          onPress={onClose}
        />
        <Button
          variant="destructive"
          label={t('spend.beneficiaries.removeConfirm')}
          isLoading={isRemoving}
          disabled={isRemoving}
          onPress={onConfirm}
        />
      </VStack>
    </BottomSheet>
  );
}
