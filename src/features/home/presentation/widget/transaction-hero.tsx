import { useTranslation } from 'react-i18next';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { formatMinorExact } from '@/core/money/money';
import { Badge, Text, VStack, type BadgeTone } from '@/shared/ui';
import type {
  TransactionDetail,
  TransactionDetailStatus,
} from '../../domain/entity/transaction-detail';

type Props = {
  detail: TransactionDetail;
  locale: string;
};

export const STATUS_BADGE: Record<
  TransactionDetailStatus,
  { tone: BadgeTone; label: TranslationKey }
> = {
  successful: { tone: 'success', label: 'home.statusSuccessful' },
  processing: { tone: 'warning', label: 'home.statusProcessing' },
  pending: { tone: 'warning', label: 'home.statusPending' },
  failed: { tone: 'error', label: 'home.statusFailed' },
  cancelled: { tone: 'neutral', label: 'home.statusCancelled' },
};

export function TransactionHero({ detail, locale }: Props) {
  const { t } = useTranslation();
  const label = t(detail.direction === 'outgoing' ? 'home.amountSent' : 'home.amountReceived');
  const amount = formatMinorExact(detail.amount.minor, detail.amount.currency, locale, {
    trim: true,
  });
  const badge = STATUS_BADGE[detail.status];

  return (
    <VStack align="center" gap="sm">
      <VStack
        align="center"
        gap="xs"
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${label}, ${amount}`}
      >
        <Text variant="body.m" color="secondary">
          {label}
        </Text>
        <Text variant="display.2xl">{amount}</Text>
      </VStack>

      <VStack paddingY="xs">
        <Badge tone={badge.tone} label={t(badge.label)} size="md" />
      </VStack>
    </VStack>
  );
}
