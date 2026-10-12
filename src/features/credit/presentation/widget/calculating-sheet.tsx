import { useTranslation } from 'react-i18next';
import { BottomSheet, HStack, StatusDot, Text, VStack } from '@/shared/ui';
import type { TranslationKey } from '@/core/i18n/translation-key';
import CreditCalculating from '@/assets/illustrations/credit-calculating.svg';
import { useScoreCalculation } from '../hook/use-score-calculation';

type Props = {
  isOpen: boolean;
  transactionCount: number;
  onComplete: () => void;
};

const STEPS: TranslationKey[] = [
  'credit.stepReadingLedger',
  'credit.stepVerifyingSeeker',
  'credit.stepScoring',
];

export function CalculatingSheet({ isOpen, transactionCount, onComplete }: Props) {
  const { t } = useTranslation();
  const { completedSteps } = useScoreCalculation(STEPS.length, onComplete, isOpen);

  return (
    <BottomSheet isOpen={isOpen} closeLabel={t('common.close')} onClose={onComplete}>
      <VStack align="center" gap="sm" paddingBottom="lg">
        <CreditCalculating width={166} height={98} />
        <Text variant="heading.h3">{t('credit.calculatingTitle')}</Text>
        <Text variant="body.m" color="secondary" align="center">
          {t('credit.calculatingSubtitle')}
        </Text>
      </VStack>

      <VStack gap="lg" paddingBottom="lg">
        {STEPS.map((step, index) => {
          const isDone = index < completedSteps;

          return (
            <HStack key={step} gap="md">
              <StatusDot isDone={isDone} />
              <Text variant="body.mEmphasis" color={isDone ? 'brand' : 'secondary'}>
                {t(step, { count: transactionCount })}
              </Text>
            </HStack>
          );
        })}
      </VStack>
    </BottomSheet>
  );
}
