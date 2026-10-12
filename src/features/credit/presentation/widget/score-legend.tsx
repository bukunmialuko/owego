import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import { HStack, Text, VStack } from '@/shared/ui';
import { SCORE_TIERS } from '../../domain/entity/credit-entity';
import type { Theme } from '@/core/design-system';

const TIER_COLOR: Record<string, keyof Theme['color']> = {
  atRisk: 'fillError',
  building: 'fillAccent',
  good: 'fillSuccess',
};

const DOT = 8;

export function ScoreLegend() {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <VStack gap="sm">
      {SCORE_TIERS.map((tier) => (
        <HStack
          key={tier.id}
          accessible
          accessibilityRole="text"
          accessibilityLabel={`${t(tier.labelKey)}, ${rangeOf(tier)}`}
          justify="space-between"
          gap="sm"
        >
          <HStack gap="sm">
            <View
              style={{
                backgroundColor: theme.color[TIER_COLOR[tier.id] ?? 'fillNeutral'],
                borderRadius: theme.radius.pill,
                height: DOT,
                width: DOT,
              }}
            />
            <Text variant="body.m" color="secondary">
              {t(tier.labelKey)}
            </Text>
          </HStack>

          <Text variant="body.m">{rangeOf(tier)}</Text>
        </HStack>
      ))}
    </VStack>
  );
}

function rangeOf(tier: (typeof SCORE_TIERS)[number]): string {
  return tier.max >= 100 ? `${String(tier.min)}+` : `${String(tier.min)} - ${String(tier.max)}`;
}
