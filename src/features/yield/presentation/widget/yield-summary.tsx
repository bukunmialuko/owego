import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import type { ConvertedValue } from '@/core/fx/converted-value';
import { splitAmount } from '@/core/money/money';
import { ConvertedChip, HStack, Icon, Text, VStack } from '@/shared/ui';

type Props = {
  amount: string;
  delta?: { label: string; isLoss: boolean };
  chip?: ConvertedValue;
  isHidden: boolean;
  onToggleHidden: () => void;
};

const MASK = '✱✱✱✱';

export function YieldSummary({ amount, delta, chip, isHidden, onToggleHidden }: Props) {
  const { t } = useTranslation();
  const { major, minor } = splitAmount(amount);

  return (
    <VStack gap="xs">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isHidden ? t('home.showBalance') : t('home.hideBalance')}
        onPress={onToggleHidden}
      >
        <HStack gap="xs">
          <Text variant="body.s" color="secondary">
            {t('yield.value')}
          </Text>
          <Icon name={isHidden ? 'eye-off-outline' : 'eye-outline'} size="sm" color="secondary" />
        </HStack>
      </Pressable>

      <HStack gap="md" align="flex-end" justify="space-between">
        <Text
          variant="numeric.xlLoose"
          numberOfLines={1}
          accessibilityLabel={isHidden ? t('home.balanceHidden') : t('yield.valueOf', { amount })}
        >
          {isHidden ? MASK : major}
          {!isHidden && minor !== '' && <Text variant="numeric.lLoose">{minor}</Text>}
        </Text>

        {!isHidden && delta !== undefined && (
          <Text variant="body.mEmphasis" color={delta.isLoss ? 'error' : 'success'}>
            {delta.label}
          </Text>
        )}
      </HStack>

      {!isHidden && chip !== undefined && <ConvertedChip value={chip} />}
    </VStack>
  );
}
