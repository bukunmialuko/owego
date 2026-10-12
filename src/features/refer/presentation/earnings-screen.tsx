import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import {
  Banner,
  EmptyState,
  Gradient,
  HStack,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  Text,
  VStack,
} from '@/shared/ui';
import { formatTimestamp } from '@/core/i18n/relative-time';
import CoinArt from '@/assets/illustrations/refer-coin.svg';
import { EarningsList, type EarningsRow } from './widget/earnings-list';
import { useReferralPayouts, useReferrals, useReferralSummary } from './hook/use-refer';
import { formatRewardAmount } from '../util/format';
import { groupByDay } from '../util/group-by-day';
import type { Referral, ReferralPayout } from '../domain/entity/refer-entity';

const HEADER_HEIGHT = 207;

const COIN_WIDTH = 68;
const COIN_HEIGHT = 85;

type Tab = 'payouts' | 'referrals';

export function EarningsScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [tab, setTab] = useState<Tab>('payouts');

  const summary = useReferralSummary();
  const payouts = useReferralPayouts();
  const referrals = useReferrals();

  const list = tab === 'payouts' ? payouts : referrals;
  const rows =
    tab === 'payouts'
      ? (payouts.data ?? []).map((payout) => toPayoutRow(payout, i18n.language, t))
      : (referrals.data ?? []).map((referral) => toReferralRow(referral, i18n.language, t));

  return (
    <Screen
      scroll
      clampsOverscroll
      variant="surface"
      backdrop={<Gradient name="referHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />}
    >
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          align="leading"
          tone="surface"
          onBack={() => {
            navigation.goBack();
          }}
        />

        <VStack gap="lg">
          <HStack justify="space-between" align="flex-start" gap="md">
            <VStack gap="xxs">
              <Text variant="body.mMedium" color="secondary">
                {t('refer.totalEarned')}
              </Text>

              {summary.isPending ? (
                <Skeleton height={44} width="70%" />
              ) : (
                <Text variant="numeric.xl">
                  {formatRewardAmount(
                    summary.data?.totalEarnedMinor ?? 0,
                    summary.data?.currency ?? '',
                    i18n.language,
                  )}
                </Text>
              )}
            </VStack>

            <CoinArt width={COIN_WIDTH} height={COIN_HEIGHT} />
          </HStack>

          <SegmentedControl
            size="sm"
            segments={[
              { id: 'payouts', label: t('refer.payouts') },
              { id: 'referrals', label: t('refer.referrals') },
            ]}
            activeId={tab}
            onSelect={setTab}
          />

          {list.isPending ? (
            <VStack gap="md">
              <Skeleton height={56} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </VStack>
          ) : list.isError ? (
            <Banner tone="error" message={t('refer.earningsUnavailable')} />
          ) : rows.length === 0 ? (
            <EmptyState
              title={t(tab === 'payouts' ? 'refer.noPayoutsTitle' : 'refer.noReferralsTitle')}
              description={t(
                tab === 'payouts' ? 'refer.noPayoutsDescription' : 'refer.noReferralsDescription',
              )}
            />
          ) : (
            <EarningsList groups={groupByDay(rows, (row) => row.at, i18n.language)} />
          )}
        </VStack>
      </VStack>
    </Screen>
  );
}

type DatedRow = EarningsRow & { at: string };

function toPayoutRow(payout: ReferralPayout, locale: string, t: TFunction): DatedRow {
  return {
    id: payout.id,
    name: payout.referredName,
    subtitle: formatTimestamp(payout.createdAt, locale, t),
    trailing: `+${formatRewardAmount(payout.amountMinor, payout.currency, locale)}`,
    badge: 'credited',
    at: payout.createdAt,
  };
}

function toReferralRow(referral: Referral, locale: string, t: TFunction): DatedRow {
  const common = {
    id: referral.id,
    name: referral.name,
    subtitle: formatTimestamp(referral.createdAt, locale, t),
    at: referral.createdAt,
  };

  switch (referral.status) {
    case 'pending':
      return { ...common, trailing: t('refer.pending'), badge: 'pending' };
    case 'settled':
      return {
        ...common,
        trailing: `+${formatRewardAmount(referral.rewardMinor, referral.currency, locale)}`,
        badge: 'credited',
      };
  }
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
});
