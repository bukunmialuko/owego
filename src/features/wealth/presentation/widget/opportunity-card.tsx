import type { ComponentType } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Theme } from '@/core/design-system';
import { Text, VStack } from '@/shared/ui';

type OpportunityTone = 'yield' | 'credit' | 'investment';

type Props = {
  label: string;
  title: string;
  tone: OpportunityTone;
  glyph: ComponentType<SvgProps>;
  onPress: () => void;
};

const TONE: Record<OpportunityTone, keyof Theme['color']> = {
  yield: 'fillWealthYield',
  credit: 'fillWealthCredit',
  investment: 'fillWealthInvestment',
};

const DISC_SIZE = 48;

const EYEBROW_STYLE = { textTransform: 'uppercase' } as const;

export function OpportunityCard({ label, title, tone, glyph: Glyph, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${title}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.color[TONE[tone]],
          borderRadius: theme.radius.sm,
          opacity: pressed ? theme.opacity.pressed : theme.opacity.full,
        },
      ]}
    >
      <VStack justify="space-between" gap="xl" padding="lg" style={styles.fill}>
        <Glyph width={DISC_SIZE} height={DISC_SIZE} />

        <VStack gap="xs">
          <Text variant="mono.s" color="wealthEyebrow" style={EYEBROW_STYLE}>
            {label}
          </Text>
          <Text variant="heading.h5">{title}</Text>
        </VStack>
      </VStack>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden' },
  fill: { flex: 1 },
});
