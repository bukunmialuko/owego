import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Button, HStack, Icon, Skeleton, Text, VStack, flagFor } from '@/shared/ui';
import type { BalanceChip } from '../../util/balance-chip';
import { splitAmount } from '../../util/format';

type Props = {
  amount: string;
  isLoading: boolean;
  chip: BalanceChip | undefined;
  isHidden: boolean;
  onToggleHidden: () => void;
  onPressAmount: () => void;
  onPressPay: () => void;
};

export const BALANCE_MASK = '✱✱✱✱';

const FIGURE_PLACEHOLDER_HEIGHT = 44;

const CHIP_PLACEHOLDER_HEIGHT = 28;

export function BalanceCard({
  amount,
  isLoading,
  chip,
  isHidden,
  onToggleHidden,
  onPressAmount,
  onPressPay,
}: Props) {
  const { t } = useTranslation();
  const { major, minor } = splitAmount(amount);

  return (
    <VStack align="center" gap="md" paddingY="lg">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isHidden ? t('home.showBalance') : t('home.hideBalance')}
        onPress={onToggleHidden}
      >
        <HStack gap="xs">
          <Text variant="body.s" color="secondary">
            {t('home.availableBalance')}
          </Text>
          <Icon name={isHidden ? 'eye-off-outline' : 'eye-outline'} size="sm" color="secondary" />
        </HStack>
      </Pressable>

      {isLoading && !isHidden ? (
        <Skeleton width="25%" height={FIGURE_PLACEHOLDER_HEIGHT} radius="md" />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isHidden ? t('home.balanceHidden') : amount}
          accessibilityHint={t('home.showWalletBreakdown')}
          onPress={onPressAmount}
        >
          <Text variant="numeric.xl" numberOfLines={1}>
            {isHidden ? BALANCE_MASK : major}
            {!isHidden && minor !== '' && <Text variant="numeric.m">{minor}</Text>}
          </Text>
        </Pressable>
      )}

      {chip?.kind === 'pending' ? (
        <Skeleton width="30%" height={CHIP_PLACEHOLDER_HEIGHT} radius="pill" />
      ) : (
        chip !== undefined && (
          <HStack background="neutral" radius="pill" paddingX="md" paddingY="xs" gap="xs">
            <ChipContent chip={chip} />
          </HStack>
        )
      )}

      <Button label={t('home.makePayment')} icon="paper-plane" onPress={onPressPay} size="md" />
    </VStack>
  );
}

function ChipContent({ chip }: { chip: Exclude<BalanceChip, { kind: 'pending' }> }) {
  const { t } = useTranslation();

  switch (chip.kind) {
    case 'converted':
      return (
        <>
          <Text variant="body.s">{flagFor(chip.countryCode)}</Text>
          <Text variant="label.m" color="secondary">
            {chip.amount}
          </Text>
        </>
      );
    case 'rate':
      return (
        <>
          <Text variant="body.s">{flagFor(chip.countryCode)}</Text>
          <Text variant="label.m" color="secondary">
            {t('home.fxRateLine', { base: chip.base, quote: chip.quote })}
          </Text>
        </>
      );
  }
}
