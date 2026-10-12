import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import { Card, EmptyState, HStack, Text, TransactionRowPlaceholder, VStack } from '@/shared/ui';
import Clock from '@/assets/icons/clock.svg';
import { useTheme } from '@/core/design-system/theme-provider';
import type { Transaction } from '../../domain/entity/home-entity';
import { HomeTransactionRow } from './transaction-row';

type Props = {
  transactions: Transaction[];
  isLoading: boolean;
  hasFailed: boolean;
  locale: string;
  onPressSeeAll: () => void;
  onPressTransaction: (id: string) => void;
  onRetry: () => void;
};

export function TransactionsSection({
  transactions,
  isLoading,
  hasFailed,
  locale,
  onPressSeeAll,
  onPressTransaction,
  onRetry,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <VStack gap="sm">
      <HStack justify="space-between" paddingX="xs">
        <HStack gap="xs">
          <Clock
            width={theme.size.icon.xs}
            height={theme.size.icon.xs}
            color={theme.color.iconSecondary}
          />
          <Text variant="body.mMedium" color="secondary">
            {t('home.transactions')}
          </Text>
        </HStack>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.seeAll')}
          onPress={onPressSeeAll}
        >
          <HStack background="surface" radius="pill" paddingX="md" paddingY="xs">
            <Text variant="label.m" color="brand">
              {t('home.seeAll')}
            </Text>
          </HStack>
        </Pressable>
      </HStack>

      <Card variant="sunken" padding="md" paddingY="xs">
        {isLoading ? (
          <>
            <TransactionRowPlaceholder density="compact" />
            <TransactionRowPlaceholder density="compact" />
            <TransactionRowPlaceholder density="compact" />
          </>
        ) : hasFailed ? (
          <EmptyState
            title={t('home.transactionsUnavailable')}
            action={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('home.retry')}
                onPress={onRetry}
              >
                <Text variant="label.m" color="brand">
                  {t('home.retry')}
                </Text>
              </Pressable>
            }
          />
        ) : transactions.length === 0 ? (
          <EmptyState
            title={t('home.noTransactionsTitle')}
            description={t('home.noTransactionsDescription')}
          />
        ) : (
          transactions.map((transaction) => (
            <HomeTransactionRow
              key={transaction.id}
              transaction={transaction}
              locale={locale}
              onPress={onPressTransaction}
              density="compact"
            />
          ))
        )}
      </Card>
    </VStack>
  );
}
