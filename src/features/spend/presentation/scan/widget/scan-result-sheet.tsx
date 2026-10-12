import { useTranslation } from 'react-i18next';
import { Badge, BottomSheet, Button, DetailList, HStack, VStack } from '@/shared/ui';
import type { ScanOutcome } from '../../../domain/scan/scan-outcome';
import { scanResultRows } from '../scan-result-rows';

type Props = {
  outcome: ScanOutcome | undefined;
  onContinue: () => void;
  onClose: () => void;
};

export function ScanResultSheet({ outcome, onContinue, onClose }: Props) {
  const { t } = useTranslation();

  const isOpen = outcome?.kind === 'account';
  const rows = outcome === undefined ? [] : scanResultRows(outcome, t);

  return (
    <BottomSheet
      isOpen={isOpen}
      closeLabel={t('common.close')}
      hasCloseButton
      onClose={onClose}
      title={t('spend.scan.confirmTitle')}
      subtitle={t('spend.scan.confirmSubtitle')}
    >
      <VStack gap="lg" paddingX="lg" paddingBottom="lg">
        {outcome?.kind === 'account' && (
          <HStack justify="flex-end">
            <Badge
              tone={outcome.isVerified ? 'success' : 'warning'}
              label={t(outcome.isVerified ? 'spend.scan.verified' : 'spend.scan.unverified')}
            />
          </HStack>
        )}

        <DetailList items={[...rows]} />

        <Button label={t('common.continue')} onPress={onContinue} />
      </VStack>
    </BottomSheet>
  );
}
