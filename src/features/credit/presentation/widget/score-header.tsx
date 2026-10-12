import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Badge, HStack, Icon, ProgressBar, Text, VStack } from '@/shared/ui';
import type { CreditScore } from '../../domain/entity/credit-entity';
import { formatLoanAmount } from '../../util/format';
import { ScoreLegend } from './score-legend';

type Props = {
  score: CreditScore;
  locale: string;
  onPressInfo: () => void;
};

const SCORE_MAX = 100;

export function ScoreHeader({ score, locale, onPressInfo }: Props) {
  const { t } = useTranslation();
  const hasMoved = score.deltaPoints !== 0;

  return (
    <VStack gap="md">
      <VStack gap="xxs">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('credit.scoreInfo')}
          onPress={onPressInfo}
        >
          <HStack gap="xs">
            <Text variant="body.s" color="secondary">
              {t(hasMoved ? 'credit.creditScore' : 'credit.creditScorePercent')}
            </Text>
            <Icon name="information-circle-outline" size="xs" />
          </HStack>
        </Pressable>

        <HStack justify="space-between" gap="md">
          <Text variant="numeric.xxlLoose">{String(score.value)}</Text>
          {hasMoved && (
            <Badge
              tone="success"
              label={t('credit.scoreDelta', { points: score.deltaPoints, days: score.deltaDays })}
            />
          )}
        </HStack>
      </VStack>

      <ProgressBar
        value={score.value / SCORE_MAX}
        tone="success"
        accessibilityLabel={t(hasMoved ? 'credit.creditScore' : 'credit.creditScorePercent')}
      />

      <Text variant="body.s" color="secondary">
        {t('credit.ceilingHint', {
          ceiling: formatLoanAmount(score.ceilingMinor, score.currency, locale),
        })}
      </Text>

      {!hasMoved && <ScoreLegend />}
    </VStack>
  );
}
