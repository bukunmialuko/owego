import { useEffect, useRef } from 'react';
import {
  useNavigation,
  usePreventRemove,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { formatDraft, fromMinor } from '@/core/money/amount-draft';
import { formatMinor, formatMinorTrimmed } from '@/core/money/money';
import {
  AmountDisplay,
  Banner,
  Button,
  Card,
  Screen,
  ScreenHeader,
  Text,
  Toast,
  VStack,
  useToast,
} from '@/shared/ui';
import { endingOf, type YieldNotSentReason } from '../domain/entity/yield-move-outcome';
import { useYieldMove } from './hook/use-yield-move';
import { MoveSummary } from './widget/move-summary';
import { ProductIdentity } from './widget/product-identity';
import type { YieldParamList } from './yield-param-list';

const FRACTION_DIGITS = 2;

const ADJUSTED_TOAST_MS = 8_000;

const NOT_SENT_MESSAGE: Record<YieldNotSentReason, TranslationKey> = {
  failed: 'yield.moveFailed',
  expired: 'yield.moveExpired',
  pinLocked: 'auth.circlePinLocked',
  incorrectPin: 'auth.circleIncorrectPin',
  rejected: 'yield.moveRejected',
  quoteChanged: 'yield.moveQuoteChanged',
  rateLimited: 'yield.moveRateLimited',
  invalidRequest: 'yield.moveFailed',
};

export function YieldConfirmScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<YieldParamList>>();
  const { target, quote, adjustedFromMinor } =
    useRoute<RouteProp<YieldParamList, 'Confirm'>>().params;
  const { confirm, isConfirming, step, answer } = useYieldMove({ target, quote });
  const { toast, show, hide } = useToast({ durationMs: ADJUSTED_TOAST_MS });
  const isDeposit = quote.kind === 'deposit';

  usePreventRemove(isConfirming, () => undefined);

  const hasToldAdjustment = useRef(false);
  useEffect(() => {
    if (adjustedFromMinor === undefined || hasToldAdjustment.current) return;
    hasToldAdjustment.current = true;
    show(
      t('yield.depositAdjusted', {
        amount: formatMinorTrimmed(quote.amountMinor, quote.currency, i18n.language),
        fee: formatMinorTrimmed(quote.feeMinor, quote.currency, i18n.language),
      }),
      'info',
    );
  }, [adjustedFromMinor, quote, i18n.language, show, t]);

  const ending = !isConfirming && answer?.ok === true ? endingOf(answer.value) : undefined;
  useEffect(() => {
    if (ending === undefined) return;

    navigation.reset({
      index: 1,
      routes: [{ name: 'Dashboard' }, { name: 'Success', params: { target, quote, ending } }],
    });
  }, [ending, navigation, target, quote]);

  const problem =
    isConfirming || answer === undefined
      ? undefined
      : !answer.ok
        ? t('yield.moveFailed')
        : answer.value.type === 'notSent'
          ? t(NOT_SENT_MESSAGE[answer.value.reason])
          : undefined;

  const hero = formatDraft(
    fromMinor(quote.amountMinor, FRACTION_DIGITS),
    i18n.language,
    quote.currency,
  );

  return (
    <>
      <Screen
        scroll
        footer={
          <VStack gap="md">
            {step === 'broadcasting' && (
              <Text variant="body.s" color="secondary" align="center">
                {t('yield.broadcasting')}
              </Text>
            )}
            <Button label={t('common.confirm')} isLoading={isConfirming} onPress={confirm} />
          </VStack>
        }
      >
        <VStack paddingX="lg" gap="xl">
          <ScreenHeader
            title={t(isDeposit ? 'yield.confirmDeposit' : 'yield.confirmWithdrawal')}
            {...(isConfirming
              ? {}
              : {
                  onBack: () => {
                    navigation.goBack();
                  },
                  onClose: () => {
                    navigation.popToTop();
                  },
                })}
          />

          <VStack paddingTop="lg" paddingBottom="xl">
            <AmountDisplay
              {...hero}
              accessibilityLabel={t(isDeposit ? 'yield.depositingOf' : 'yield.withdrawingOf', {
                amount: formatMinor(quote.amountMinor, quote.currency, i18n.language),
              })}
            />
          </VStack>

          <VStack gap="xs">
            <Card variant="sunken" radius="lg" padding="md">
              <ProductIdentity
                tokenSymbol={target.tokenSymbol}
                variant="vault"
                {...(target.apyPercent === undefined ? {} : { apyPercent: target.apyPercent })}
              />
            </Card>
            {problem !== undefined && <Banner tone="error" message={problem} />}
            <MoveSummary quote={quote} />
          </VStack>
        </VStack>
      </Screen>

      <Toast toast={toast} dismissLabel={t('common.close')} onDismiss={hide} />
    </>
  );
}
