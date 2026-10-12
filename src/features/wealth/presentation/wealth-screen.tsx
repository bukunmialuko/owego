import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { useConvertedValue } from '@/core/fx/use-converted-value';
import { useBooleanPreference } from '@/core/storage/use-preference';
import { describeYieldChange } from '@/core/yield/describe-yield-change';
import { useYieldOverview } from '@/core/yield/use-yield-overview';
import {
  Banner,
  ComingSoonSheet,
  Gradient,
  HStack,
  Screen,
  Skeleton,
  Text,
  VStack,
} from '@/shared/ui';
import CreditGlyph from '@/assets/icons/wealth-credit.svg';
import InvestmentGlyph from '@/assets/icons/wealth-investment.svg';
import YieldGlyph from '@/assets/icons/wealth-yield.svg';
import { OpportunityCard } from './widget/opportunity-card';
import { PortfolioSummary } from './widget/portfolio-summary';
import { TermsSheet } from './widget/terms-sheet';
import { WealthIntro } from './widget/wealth-intro';
import { formatLedgerAmount } from '../util/format';

const PAIRED_TILE_HEIGHT = 204;
const WIDE_TILE_HEIGHT = 178;

const HEADER_HEIGHT = 207;

export function WealthScreen() {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useBooleanPreference(
    PreferenceKey.WealthTermsAccepted,
    false,
  );
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

  return (
    <>
      {hasAcceptedTerms ? (
        <WealthDashboard
          onComingSoon={() => {
            setIsComingSoonOpen(true);
          }}
        />
      ) : (
        <Screen scroll clampsOverscroll hasTabBar edgeToEdgeTop variant="surface">
          <WealthIntro
            onContinue={() => {
              setIsTermsOpen(true);
            }}
          />
        </Screen>
      )}

      <TermsSheet
        isOpen={isTermsOpen}
        onAccept={() => {
          setIsTermsOpen(false);
          setHasAcceptedTerms(true);
        }}
        onClose={() => {
          setIsTermsOpen(false);
        }}
      />

      <ComingSoonSheet
        isOpen={isComingSoonOpen}
        onClose={() => {
          setIsComingSoonOpen(false);
        }}
      />
    </>
  );
}

function WealthDashboard({ onComingSoon }: { onComingSoon: () => void }) {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const [isBalanceHidden, setIsBalanceHidden] = useBooleanPreference(
    PreferenceKey.BalanceHidden,
    false,
  );
  const portfolio = useYieldOverview();
  const chip = useConvertedValue(portfolio.data);
  const change =
    portfolio.data?.change === undefined
      ? undefined
      : describeYieldChange(portfolio.data.change, i18n.language);

  return (
    <Screen
      scroll
      clampsOverscroll
      hasTabBar
      variant="surface"
      backdrop={<Gradient name="referHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />}
    >
      <VStack paddingX="lg" gap="xl">
        <Text variant="heading.h4">{t('wealth.title')}</Text>

        {portfolio.isError && <Banner tone="error" message={t('errors.common.unknown')} />}

        {portfolio.isPending ? (
          <VStack gap="md">
            <Skeleton height={40} width="40%" />
            <Skeleton height={16} />
          </VStack>
        ) : (
          portfolio.data !== undefined && (
            <PortfolioSummary
              amount={formatLedgerAmount(
                portfolio.data.valueMinor,
                portfolio.data.currency,
                i18n.language,
              )}
              {...(change === undefined
                ? {}
                : {
                    delta: {
                      label: t('wealth.portfolioDelta', {
                        percent: change.percent,
                        amount: change.amount,
                      }),
                      isLoss: change.isLoss,
                    },
                  })}
              {...(chip === undefined ? {} : { chip })}
              isHidden={isBalanceHidden}
              onToggleHidden={() => {
                setIsBalanceHidden(!isBalanceHidden);
              }}
            />
          )
        )}

        <VStack gap="sm">
          <Text variant="body.mMedium" color="secondary">
            {t('wealth.doMoreTitle')}
          </Text>

          <HStack gap="sm" align="stretch" style={{ height: PAIRED_TILE_HEIGHT }}>
            <OpportunityCard
              label={t('wealth.opportunityYieldLabel')}
              title={t('wealth.opportunityYieldTitle')}
              tone="yield"
              glyph={YieldGlyph}
              onPress={() => {
                navigation.navigate('Yield');
              }}
            />

            <OpportunityCard
              label={t('wealth.opportunityCreditLabel')}
              title={t('wealth.opportunityCreditTitle')}
              tone="credit"
              glyph={CreditGlyph}
              onPress={onComingSoon}
            />
          </HStack>

          <VStack style={{ height: WIDE_TILE_HEIGHT }}>
            <OpportunityCard
              label={t('wealth.opportunityInvestmentLabel')}
              title={t('wealth.opportunityInvestmentTitle')}
              tone="investment"
              glyph={InvestmentGlyph}
              onPress={onComingSoon}
            />
          </VStack>
        </VStack>
      </VStack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
});
