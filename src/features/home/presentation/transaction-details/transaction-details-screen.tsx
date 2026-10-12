import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet } from 'react-native';
import { formatDateTime } from '@/core/i18n/relative-time';
import { formatMinorExact } from '@/core/money/money';
import {
  Banner,
  Button,
  Gradient,
  HStack,
  Screen,
  ScreenHeader,
  Skeleton,
  VStack,
  openInAppBrowser,
  useContactSupport,
} from '@/shared/ui';
import type { AppStackParamList } from '@/navigation/param-list';
import type { TransactionDetail } from '../../domain/entity/transaction-detail';
import type { TransactionDetailView } from '../../domain/usecase/get-transaction-detail-usecase';
import { useTransactionDetail } from '../hook/use-transaction-detail';
import { CounterpartyCard } from '../widget/counterparty-card';
import { TransactionDetailList } from '../widget/transaction-detail-list';
import { STATUS_BADGE, TransactionHero } from '../widget/transaction-hero';

const HEADER_HEIGHT = 207;

const HERO_PLACEHOLDER = 96;
const CARD_PLACEHOLDER = 80;
const LIST_PLACEHOLDER = 280;

const SEPARATOR = ' · ';

type Action = { label: string; onPress: () => void };

export function TransactionDetailsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const { transactionId } = useRoute<RouteProp<AppStackParamList, 'TransactionDetails'>>().params;
  const transaction = useTransactionDetail(transactionId);
  const contactSupport = useContactSupport();
  const primary =
    transaction.data === undefined ? undefined : primaryAction(transaction.data, i18n.language, t);

  return (
    <Screen
      scroll
      clampsOverscroll
      variant="surface"
      backdrop={<Gradient name="referHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />}
      footer={
        transaction.isPending ? undefined : (
          <HStack gap="sm">
            <Button
              variant="secondary"
              label={t('common.report')}
              style={styles.action}
              onPress={() => {
                void contactSupport();
              }}
            />
            {primary !== undefined && (
              <Button label={primary.label} style={styles.action} onPress={primary.onPress} />
            )}
          </HStack>
        )
      }
    >
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          title={t('home.transactionDetails')}
          closePosition="leading"
          tone="surface"
          onClose={() => {
            navigation.goBack();
          }}
        />

        {transaction.isPending ? (
          <VStack gap="xl" testID="transaction-loading">
            <Skeleton height={HERO_PLACEHOLDER} />
            <VStack gap="xs">
              <Skeleton height={CARD_PLACEHOLDER} radius="md" />
              <Skeleton height={LIST_PLACEHOLDER} radius="md" />
            </VStack>
          </VStack>
        ) : transaction.isError ? (
          <Banner
            tone="error"
            message={t('home.transactionDetailsUnavailable')}
            action={{
              label: t('common.retry'),
              onPress: () => {
                void transaction.refetch();
              },
            }}
          />
        ) : (
          <VStack gap="xl">
            <TransactionHero detail={transaction.data.detail} locale={i18n.language} />

            <VStack gap="xs">
              {transaction.data.detail.counterparty !== undefined && (
                <CounterpartyCard
                  counterparty={transaction.data.detail.counterparty}
                  direction={transaction.data.detail.direction}
                />
              )}
              <TransactionDetailList detail={transaction.data.detail} locale={i18n.language} />
            </VStack>
          </VStack>
        )}
      </VStack>
    </Screen>
  );
}

function primaryAction(
  view: TransactionDetailView,
  locale: string,
  t: TFunction,
): Action | undefined {
  const { explorerUrl } = view;

  switch (view.detail.kind) {
    case 'payout':
      return {
        label: t('home.shareReceipt'),
        onPress: () => {
          void Share.share({ message: receiptMessage(view.detail, locale, t) });
        },
      };
    case 'send':
    case 'receive':
      return explorerUrl === undefined
        ? undefined
        : {
            label: t('home.viewOnSolscan'),
            onPress: () => {
              void openInAppBrowser(explorerUrl);
            },
          };
  }
}

function receiptMessage(detail: TransactionDetail, locale: string, t: TFunction): string {
  const amount = formatMinorExact(detail.amount.minor, detail.amount.currency, locale);
  const local =
    detail.localAmount === undefined
      ? ''
      : ` (${formatMinorExact(detail.localAmount.minor, detail.localAmount.currency, locale)})`;
  const payee =
    detail.counterparty === undefined
      ? ''
      : detail.counterparty.kind === 'bank'
        ? [
            detail.counterparty.name,
            detail.counterparty.bankName,
            detail.counterparty.accountNumber,
          ]
            .filter((part) => part !== '')
            .join(SEPARATOR)
        : detail.counterparty.address;

  return t('home.receiptMessage', {
    amount: `${amount}${local}`,
    payee,
    date: formatDateTime(detail.createdAt, locale, t),
    status: t(STATUS_BADGE[detail.status].label),
    id: detail.id,
  });
}

const styles = StyleSheet.create({
  action: { flex: 1 },
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
});
