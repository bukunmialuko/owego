import { Pressable, useWindowDimensions } from 'react-native';
import { MAX_FONT_SCALE, type TypographyVariant } from '@/core/design-system';
import { useTheme } from '@/core/design-system/theme-provider';
import { Skeleton } from './skeleton';
import { HStack } from './stack';
import { Text, type TextColor } from './text';
import { VStack } from './stack';

const ROW_PADDING = { regular: 'md', compact: 'sm' } as const;

export type TransactionRowDensity = keyof typeof ROW_PADDING;
const LINE_GAP = 'xxs';
const TITLE_VARIANT = 'body.mEmphasis';
const SUBTITLE_VARIANT = 'body.s';

type AmountTone = 'incoming' | 'outgoing' | 'failed';

const AMOUNT_COLOR: Record<AmountTone, TextColor> = {
  incoming: 'success',
  outgoing: 'primary',
  failed: 'error',
};

type Props = {
  title: string;
  subtitle: string;
  amount: string;
  leading?: React.ReactNode;
  isMuted?: boolean;
  amountTone?: AmountTone;
  density?: TransactionRowDensity;
  onPress?: () => void;
};

export function TransactionRow({
  title,
  subtitle,
  amount,
  leading,
  isMuted = false,
  amountTone,
  density = 'regular',
  onPress,
}: Props) {
  const amountColor =
    amountTone === undefined ? (isMuted ? 'tertiary' : 'primary') : AMOUNT_COLOR[amountTone];

  const content = (
    <HStack paddingY={ROW_PADDING[density]} gap="md">
      {leading}

      <VStack style={{ flex: 1 }} gap={LINE_GAP}>
        <Text variant={TITLE_VARIANT} color={isMuted ? 'tertiary' : 'primary'} numberOfLines={1}>
          {title}
        </Text>
        <Text variant={SUBTITLE_VARIANT} color="tertiary">
          {subtitle}
        </Text>
      </VStack>

      <Text variant="numeric.s" color={amountColor}>
        {amount}
      </Text>
    </HStack>
  );

  const label = `${title}, ${amount}, ${subtitle}`;

  if (onPress === undefined) {
    return (
      <VStack accessible accessibilityRole="text" accessibilityLabel={label}>
        {content}
      </VStack>
    );
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function TransactionRowPlaceholder({
  density = 'regular',
}: {
  density?: TransactionRowDensity;
}) {
  const { size, spacing, typography } = useTheme();
  const { fontScale } = useWindowDimensions();

  const lineHeight = (variant: TypographyVariant) =>
    typography[variant].lineHeight * Math.min(fontScale, MAX_FONT_SCALE[variant] ?? fontScale);
  const textColumn = lineHeight(TITLE_VARIANT) + spacing[LINE_GAP] + lineHeight(SUBTITLE_VARIANT);

  return (
    <VStack paddingY={ROW_PADDING[density]} testID="transaction-row-placeholder">
      <Skeleton height={Math.max(textColumn, size.avatar.row)} />
    </VStack>
  );
}
