import { useTranslation } from 'react-i18next';
import { Badge, BottomSheet, Button, Text, VStack } from '@/shared/ui';
import type { CreditScore } from '../../domain/entity/credit-entity';
import CreditScoreArt from '@/assets/illustrations/credit-score.svg';
import { ScoreLegend } from './score-legend';

type Props = {
  isOpen: boolean;
  score: CreditScore;
  onClose: () => void;
};

export function ScoreSheet({ isOpen, score, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <BottomSheet isOpen={isOpen} closeLabel={t('common.close')} onClose={onClose} hasCloseButton>
      <VStack align="center" gap="sm">
        <CreditScoreArt width={126} height={113} />
        <Text variant="heading.h3">{t('credit.creditScore')}</Text>
        <Text variant="body.m" color="secondary" align="center">
          {t('credit.calculatingSubtitle')}
        </Text>

        <Text variant="display.l">{String(score.value)}</Text>

        {score.deltaPoints !== 0 && (
          <Badge
            tone="success"
            label={t('credit.scoreDelta', { points: score.deltaPoints, days: score.deltaDays })}
          />
        )}
      </VStack>

      <VStack gap="lg" paddingTop="lg">
        <ScoreLegend />
        <Button label={t('common.continue')} onPress={onClose} />
      </VStack>
    </BottomSheet>
  );
}
