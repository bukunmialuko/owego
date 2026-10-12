import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useStore } from 'zustand';
import { useResolve } from '@/core/di/container-provider';
import { formatMinor } from '@/core/money/money';
import type { Payee } from '@/core/payee/payee';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { stablecoinHoldings } from '@/core/wallet/stablecoin-holdings';
import { useAvailableBalance } from '@/core/wallet/use-available-balance';
import { useWalletsQuery } from '@/core/wallet/use-wallets-query';
import { Banner, Button, EmptyState, Screen, VStack } from '@/shared/ui';
import EmptyCoin from '@/assets/icons/empty-coin.svg';
import {
  useHomeRefresh,
  useQuickSendPayees,
  useRecentTransactions,
  useVerificationNotice,
} from './hook/use-home';
import { useBooleanPreference } from '@/core/storage/use-preference';
import { useConvertedBalance } from './hook/use-converted-balance';
import { BalanceCard } from './widget/balance-card';
import { CreditLineCard } from './widget/credit-line-card';
import { HomeHeader } from './widget/home-header';
import { QuickSendRow } from './widget/quick-send-row';
import { TransactionsSection } from './widget/transactions-section';
import { VerificationBanner } from './widget/verification-banner';
import { WalletBreakdownSheet } from './widget/wallet-breakdown-sheet';
import { balanceChip } from '../util/balance-chip';

const CREDIT_LIMIT = '500 USDC';

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const sessionStore = useResolve('sessionStore');

  function openPayee({ id, destination }: Payee) {
    switch (destination.kind) {
      case 'bankTransfer':
        navigation.navigate('BankTransfer', {
          screen: 'Recipient',
          params: { prefill: destination.prefill },
        });
        return;
      case 'walletSend':
        navigation.navigate('SendAsset', {
          screen: 'Recipient',
          params: { prefill: destination.prefill },
        });
        return;
      case 'merchantPay':
        navigation.navigate('BankTransfer', {
          screen: 'MerchantAmount',
          params: { qrString: destination.qrString },
        });
        return;
      case 'details':
        navigation.navigate('Beneficiaries', {
          screen: 'Details',
          params: { beneficiaryId: id },
        });
        return;
    }
  }
  const user = useStore(sessionStore, (state) => state.user);
  const verificationRepository = useResolve('verificationRepository');

  const [isBalanceHidden, setIsBalanceHidden] = useBooleanPreference(
    PreferenceKey.BalanceHidden,
    false,
  );
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(false);

  const holdings = useWalletsQuery(stablecoinHoldings);
  const available = useAvailableBalance();
  const converted = useConvertedBalance();
  const transactions = useRecentTransactions();
  const verification = useVerificationNotice();
  const quickSend = useQuickSendPayees();
  const { isRefreshing, runRefresh } = useHomeRefresh();

  const recent = transactions.data ?? [];
  const isEmpty =
    !available.isPending &&
    !transactions.isPending &&
    (available.balance?.amountMinor ?? 0) === 0 &&
    recent.length === 0;

  const notice = verification.data ?? undefined;

  return (
    <Screen
      variant="surface"
      scroll
      hasTabBar
      onRefresh={() => {
        runRefresh([available.refetch(), converted.refetch(), transactions.refetch()]);
      }}
      isRefreshing={isRefreshing}
      header={
        <>
          {notice !== undefined && !isNoticeDismissed && (
            <VerificationBanner
              notice={notice}
              onDismiss={() => {
                setIsNoticeDismissed(true);
                void verificationRepository.dismiss();
              }}
            />
          )}

          {holdings.isError && <Banner tone="error" message={t('home.balanceUnavailable')} />}

          <HomeHeader
            name={user?.firstName ?? ''}
            onPressProfile={() => {
              navigation.navigate('Profile');
            }}
            onPressScan={() => {
              navigation.navigate('ScanToPay');
            }}
          />
        </>
      }
    >
      <BalanceCard
        amount={formatMinor(
          available.balance?.amountMinor ?? 0,
          available.balance?.currency ?? 'USD',
          i18n.language,
        )}
        isLoading={available.isPending}
        chip={balanceChip({
          isHidden: isBalanceHidden,
          converted: converted.converted,
          quote: converted.quote,
          isPending: converted.isPending,
          locale: i18n.language,
        })}
        isHidden={isBalanceHidden}
        onToggleHidden={() => {
          setIsBalanceHidden(!isBalanceHidden);
        }}
        onPressAmount={() => {
          setIsBreakdownOpen(true);
        }}
        onPressPay={() => {
          navigation.navigate('Payment');
        }}
      />

      {isEmpty ? (
        <EmptyState
          title={t('home.emptyTitle')}
          description={t('home.emptyDescription')}
          illustration={<EmptyCoin width={76} height={68} />}
          action={
            <Button
              variant="brandSubtle"
              icon="add"
              label={t('receive.title')}
              onPress={() => {
                navigation.navigate('Receive');
              }}
            />
          }
        />
      ) : (
        <VStack gap="xl" paddingTop="sm">
          <QuickSendRow payees={quickSend.data ?? []} onSelect={openPayee} />

          <VStack paddingX="lg" gap="xl">
            <CreditLineCard
              limit={CREDIT_LIMIT}
              onPress={() => {
                navigation.navigate('Wealth');
              }}
            />

            <TransactionsSection
              transactions={recent}
              isLoading={transactions.isPending}
              hasFailed={transactions.isError}
              locale={i18n.language}
              onPressSeeAll={() => {
                navigation.navigate('AllTransactions');
              }}
              onPressTransaction={(transactionId) => {
                navigation.navigate('TransactionDetails', { transactionId });
              }}
              onRetry={() => {
                void transactions.refetch();
              }}
            />
          </VStack>
        </VStack>
      )}

      <WalletBreakdownSheet
        isOpen={isBreakdownOpen}
        holdings={holdings.data ?? []}
        isHidden={isBalanceHidden}
        locale={i18n.language}
        onClose={() => {
          setIsBreakdownOpen(false);
        }}
      />
    </Screen>
  );
}
