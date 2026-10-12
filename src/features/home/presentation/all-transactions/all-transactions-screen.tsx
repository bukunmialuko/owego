import { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';
import {
  Banner,
  EmptyState,
  Gradient,
  PullToRefresh,
  Screen,
  ScreenHeader,
  Text,
  TransactionRowPlaceholder,
  VStack,
} from '@/shared/ui';
import { useTransactionHistory } from '../hook/use-transaction-history';
import { HomeTransactionRow } from '../widget/transaction-row';
import { toHistoryItems, type HistoryItem } from './history-items';

const HEADER_HEIGHT = 207;

const FIRST_PAGE_PLACEHOLDERS = 6;
const NEXT_PAGE_PLACEHOLDERS = 2;

export function AllTransactionsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const history = useTransactionHistory();
  const items = useMemo(
    () => history.data && toHistoryItems(history.data, i18n.language),
    [history.data, i18n.language],
  );

  const openReceipt = useCallback(
    (transactionId: string) => {
      navigation.navigate('TransactionDetails', { transactionId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: HistoryItem }) => {
      switch (item.kind) {
        case 'day':
          return (
            <VStack paddingX="lg" paddingTop="lg" paddingBottom="xs">
              <Text variant="body.mMedium" color="secondary" accessibilityRole="header">
                {item.dayKey === undefined ? item.day : t(item.dayKey)}
              </Text>
            </VStack>
          );
        case 'transaction':
          return (
            <VStack paddingX="lg">
              <HomeTransactionRow
                transaction={item.transaction}
                locale={i18n.language}
                onPress={openReceipt}
              />
            </VStack>
          );
      }
    },
    [t, i18n.language, openReceipt],
  );

  return (
    <Screen
      variant="surface"
      backdrop={<Gradient name="referHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />}
      header={
        <VStack paddingX="lg" paddingBottom="md">
          <ScreenHeader
            title={t('home.allTransactions')}
            tone="surface"
            onBack={() => {
              navigation.goBack();
            }}
          />
        </VStack>
      }
    >
      {items === undefined ? (
        history.isError ? (
          <VStack paddingX="lg" paddingTop="xl">
            <EmptyState
              title={t('home.transactionsUnavailable')}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('home.retry')}
                  onPress={() => {
                    void history.refetch();
                  }}
                >
                  <Text variant="label.m" color="brand">
                    {t('home.retry')}
                  </Text>
                </Pressable>
              }
            />
          </VStack>
        ) : (
          <Placeholders count={FIRST_PAGE_PLACEHOLDERS} testID="transactions-loading" />
        )
      ) : (
        <FlashList
          testID="transaction-history"
          data={items}
          keyExtractor={keyOf}
          getItemType={(item) => item.kind}
          renderItem={renderItem}
          onEndReached={history.loadMore}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <PullToRefresh refreshing={history.isRefreshing} onRefresh={history.refresh} />
          }
          ListEmptyComponent={
            <VStack paddingX="lg" paddingTop="xl">
              <EmptyState
                title={t('home.noTransactionsTitle')}
                description={t('home.noTransactionsDescription')}
              />
            </VStack>
          }
          ListFooterComponent={
            history.isFetchingNextPage ? (
              <Placeholders count={NEXT_PAGE_PLACEHOLDERS} />
            ) : history.isFetchNextPageError ? (
              <VStack paddingX="lg" paddingY="md">
                <Banner
                  tone="error"
                  message={t('home.moreTransactionsUnavailable')}
                  action={{
                    label: t('common.retry'),
                    onPress: () => {
                      void history.fetchNextPage();
                    },
                  }}
                />
              </VStack>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

function keyOf(item: HistoryItem): string {
  switch (item.kind) {
    case 'day':
      return item.key;
    case 'transaction':
      return item.transaction.id;
  }
}

function Placeholders({ count, testID }: { count: number; testID?: string }) {
  return (
    <VStack paddingX="lg" testID={testID}>
      {Array.from({ length: count }, (_, index) => (
        <TransactionRowPlaceholder key={index} />
      ))}
    </VStack>
  );
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
});
