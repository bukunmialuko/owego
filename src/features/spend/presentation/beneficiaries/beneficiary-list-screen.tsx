import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { useTheme } from '@/core/design-system/theme-provider';
import {
  Button,
  EmptyState,
  Fab,
  Gradient,
  HStack,
  PullToRefresh,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  TextField,
  VStack,
} from '@/shared/ui';
import {
  filterBeneficiaries,
  type BeneficiaryTab,
} from '../../domain/beneficiary/filter-beneficiaries';
import { useBeneficiaryDirectory } from '../hook/use-beneficiaries';
import { isPayableByScan } from '../../domain/corridor/registry';
import { useRedrawOnReturn } from './hook/use-redraw-on-return';
import { BeneficiaryCurrencySheet } from './widget/beneficiary-currency-sheet';
import { BeneficiaryRow } from '../widget/beneficiary-row';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

const HEADER_HEIGHT = 207;

const PLACEHOLDER_ROWS = 4;

const TAB_COPY = {
  bank: {
    search: 'spend.beneficiaries.searchBank',
    add: 'spend.beneficiaries.addBank',
    emptyTitle: 'spend.beneficiaries.emptyBankTitle',
    emptyBody: 'spend.beneficiaries.emptyBankBody',
  },
  wallet: {
    search: 'spend.beneficiaries.searchWallet',
    add: 'spend.beneficiaries.addWallet',
    emptyTitle: 'spend.beneficiaries.emptyWalletTitle',
    emptyBody: 'spend.beneficiaries.emptyWalletBody',
  },
} as const;

export function BeneficiaryListScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<BeneficiariesParamList>>();
  const tab: BeneficiaryTab =
    useRoute<RouteProp<BeneficiariesParamList, 'List'>>().params?.tab ?? 'bank';
  const [query, setQuery] = useState('');
  const [isChoosingCurrency, setIsChoosingCurrency] = useState(false);
  const directory = useBeneficiaryDirectory();
  const [isPulling, setIsPulling] = useState(false);
  const redraw = useRedrawOnReturn(directory.dataUpdatedAt);

  const copy = TAB_COPY[tab];
  const rows = filterBeneficiaries(directory.data ?? [], tab, query);

  return (
    <Screen
      variant="surface"
      backdrop={<Gradient name="referHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />}
      header={
        <VStack paddingX="lg" paddingBottom="md" gap="lg">
          <ScreenHeader
            title={t('spend.beneficiaries.title')}
            closePosition="leading"
            tone="surface"
            onClose={() => {
              navigation.goBack();
            }}
          />

          <TextField
            label={t(copy.search)}
            placeholder={t(copy.search)}
            value={query}
            onChangeText={setQuery}
            leadingIcon="search"
            isLabelHidden
            shape="pill"
            autoCorrect={false}
            autoCapitalize="none"
            {...(query === ''
              ? {}
              : {
                  clearLabel: t('common.clear'),
                  onClear: () => {
                    setQuery('');
                  },
                })}
          />

          <SegmentedControl
            segments={[
              { id: 'bank', label: t('spend.beneficiaries.tabBank') },
              { id: 'wallet', label: t('spend.beneficiaries.tabWallet') },
            ]}
            activeId={tab}
            onSelect={(next) => {
              navigation.setParams({ tab: next });
            }}
          />
        </VStack>
      }
      footer={
        <HStack justify="flex-end">
          <Fab
            label={t(copy.add)}
            icon="add"
            onPress={() => {
              if (tab === 'bank') {
                setIsChoosingCurrency(true);
                return;
              }

              navigation.navigate('AddWallet');
            }}
          />
        </HStack>
      }
    >
      {directory.data === undefined ? (
        directory.isError ? (
          <VStack paddingX="lg" paddingTop="xl">
            <EmptyState
              title={t('spend.beneficiaries.unavailable')}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  label={t('common.retry')}
                  onPress={() => {
                    void directory.refetch();
                  }}
                />
              }
            />
          </VStack>
        ) : (
          <VStack paddingX="lg" paddingTop="sm" gap="lg" testID="beneficiaries-loading">
            {Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
              <Skeleton key={index} height={theme.size.avatar.lg} radius="md" />
            ))}
          </VStack>
        )
      ) : (
        <FlashList
          key={redraw}
          data={rows}
          keyExtractor={(beneficiary) => beneficiary.id}
          renderItem={({ item }) => (
            <VStack paddingX="lg">
              <BeneficiaryRow
                beneficiary={item}
                onPress={() => {
                  navigation.navigate('Details', { beneficiaryId: item.id });
                }}
              />
            </VStack>
          )}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <PullToRefresh
              refreshing={isPulling}
              onRefresh={() => {
                setIsPulling(true);
                void directory.refetch().finally(() => {
                  setIsPulling(false);
                });
              }}
            />
          }
          ListEmptyComponent={
            <VStack paddingX="lg" paddingTop="xl">
              {query.trim() === '' ? (
                <EmptyState title={t(copy.emptyTitle)} description={t(copy.emptyBody)} />
              ) : (
                <EmptyState title={t('spend.beneficiaries.noMatches')} />
              )}
            </VStack>
          }
        />
      )}

      <BeneficiaryCurrencySheet
        isOpen={isChoosingCurrency}
        onSelect={(chosen) => {
          setIsChoosingCurrency(false);

          if (isPayableByScan(chosen)) {
            navigation.navigate('ScanMerchant');
            return;
          }

          navigation.navigate('AddBank', { currency: chosen.code });
        }}
        onClose={() => {
          setIsChoosingCurrency(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
});
