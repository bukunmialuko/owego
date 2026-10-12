import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { formatMinorTrimmed } from '@/core/money/money';
import type { YieldPosition } from '@/core/yield/yield-overview';
import { Card, DetailList, DisclosureChevron, HStack, VStack, type DetailItem } from '@/shared/ui';
import { formatApy } from '../../util/format-apy';
import { ProductIdentity, useProductIdentity } from './product-identity';

type Props = {
  position: YieldPosition;
  apyPercent?: number;
  isExpanded: boolean;
  onToggle: () => void;
  isHidden: boolean;
};

const MASK = '✱✱✱✱';

export function InvestmentRow({ position, apyPercent, isExpanded, onToggle, isHidden }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const identity = { tokenSymbol: position.tokenSymbol, variant: 'vault' as const };
  const { accessibilityLabel } = useProductIdentity({
    ...identity,
    ...(apyPercent === undefined ? {} : { apyPercent }),
  });
  const money = (minor: number) =>
    isHidden ? MASK : formatMinorTrimmed(minor, position.currency, i18n.language);

  const holding: DetailItem[] = [
    ...(apyPercent === undefined
      ? []
      : [{ label: t('yield.apy'), value: formatApy(apyPercent, i18n.language) }]),
    ...(position.contributedMinor === undefined
      ? []
      : [{ label: t('yield.netContributions'), value: money(position.contributedMinor) }]),
    { label: t('yield.value'), value: money(position.valueMinor) },
  ];
  const earnings: DetailItem[] =
    position.change === undefined
      ? []
      : [{ label: t('yield.totalInterest'), value: money(position.change.amountMinor) }];

  return (
    <VStack gap="xs">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ expanded: isExpanded }}
        onPress={onToggle}
        style={({ pressed }) => ({ opacity: pressed ? theme.opacity.pressed : theme.opacity.full })}
      >
        <Card variant="sunken" radius="lg" padding="md">
          <HStack gap="md" justify="space-between">
            <VStack style={{ flex: 1 }}>
              <ProductIdentity
                {...identity}
                {...(apyPercent === undefined ? {} : { apyPercent })}
              />
            </VStack>
            <DisclosureChevron isExpanded={isExpanded} />
          </HStack>
        </Card>
      </Pressable>

      {isExpanded && <DetailList size="m" items={holding} />}
      {isExpanded && earnings.length > 0 && <DetailList size="m" items={earnings} />}
    </VStack>
  );
}
