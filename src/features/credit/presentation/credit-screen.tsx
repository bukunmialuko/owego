import { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { PreferenceKey } from '@/core/storage/storage-keys';
import { useBooleanPreference } from '@/core/storage/use-preference';
import {
  Banner,
  Gradient,
  Screen,
  ScreenHeader,
  SegmentedControl,
  Skeleton,
  VStack,
  type Segment,
} from '@/shared/ui';
import { ActivationLanding } from './widget/activation-landing';
import { ActiveLoanPanel } from './widget/active-loan-panel';
import { CalculatingSheet } from './widget/calculating-sheet';
import { ConnectSheet } from './widget/connect-sheet';
import { LoanHistoryPanel } from './widget/loan-history-panel';
import { ScoreHeader } from './widget/score-header';
import { ScoreSheet } from './widget/score-sheet';
import {
  useActiveLoan,
  useCreditScore,
  useLoanHistory,
  useLoanMovements,
  useLoanOffer,
} from './hook/use-credit';
import { formatLoanAmount } from '../util/format';

type Tab = 'active' | 'history';

const SCORED_TRANSACTIONS = 214;

const DEFAULT_CEILING_MINOR = 50_000;

const HEADER_HEIGHT = 207;

export function CreditScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();

  const [isActivated, setIsActivated] = useBooleanPreference(PreferenceKey.CreditActivated, false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [isCalculatingOpen, setIsCalculatingOpen] = useState(false);
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('active');

  const score = useCreditScore();
  const offer = useLoanOffer();
  const activeLoan = useActiveLoan();
  const history = useLoanHistory();
  const movements = useLoanMovements();

  const onCalculated = useCallback(() => {
    setIsCalculatingOpen(false);
    setIsActivated(true);
  }, [setIsActivated]);

  const segments: Segment<Tab>[] = [
    { id: 'active', label: t('credit.activeLoan') },
    { id: 'history', label: t('credit.loanHistory') },
  ];

  if (!isActivated) {
    return (
      <Screen scroll clampsOverscroll edgeToEdgeTop>
        <ActivationLanding
          limit={formatLoanAmount(
            offer.data?.maxMinor ?? DEFAULT_CEILING_MINOR,
            'USD',
            i18n.language,
          )}
          onContinue={() => {
            setIsConnectOpen(true);
          }}
        />

        <ConnectSheet
          isOpen={isConnectOpen}
          onAllow={() => {
            setIsConnectOpen(false);
            setIsCalculatingOpen(true);
          }}
          onClose={() => {
            setIsConnectOpen(false);
          }}
        />

        <CalculatingSheet
          isOpen={isCalculatingOpen}
          transactionCount={SCORED_TRANSACTIONS}
          onComplete={onCalculated}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      clampsOverscroll
      backdrop={<Gradient name="wealthHeader" style={[styles.band, { height: HEADER_HEIGHT }]} />}
    >
      <VStack paddingX="lg" gap="xl">
        <ScreenHeader
          title={t('credit.title')}
          onBack={() => {
            navigation.goBack();
          }}
        />

        {score.isError && <Banner tone="error" message={t('errors.common.unknown')} />}

        {score.isPending ? (
          <VStack gap="md">
            <Skeleton height={20} width="40%" />
            <Skeleton height={57} width="30%" />
          </VStack>
        ) : (
          score.data !== null &&
          score.data !== undefined && (
            <ScoreHeader
              score={score.data}
              locale={i18n.language}
              onPressInfo={() => {
                setIsScoreOpen(true);
              }}
            />
          )
        )}

        <SegmentedControl segments={segments} activeId={tab} onSelect={setTab} />

        {tab === 'active' ? (
          <ActiveLoanPanel
            loan={activeLoan.data ?? undefined}
            locale={i18n.language}
            onPressRepay={() => {
              navigation.navigate('RepayLoan');
            }}
            onPressNewLoan={() => {
              navigation.navigate('NewLoan');
            }}
          />
        ) : (
          <LoanHistoryPanel
            history={history.data ?? undefined}
            movements={movements.data ?? []}
            locale={i18n.language}
          />
        )}
      </VStack>

      {score.data !== null && score.data !== undefined && (
        <ScoreSheet
          isOpen={isScoreOpen}
          score={score.data}
          onClose={() => {
            setIsScoreOpen(false);
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  band: { left: 0, position: 'absolute', right: 0, top: 0 },
});
