import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { formatMinor, formatMinorTrimmed } from '@/core/money/money';
import { useAmountDraft } from '@/core/money/use-amount-draft';
import {
  AmountDisplay,
  AmountKeypad,
  Banner,
  Button,
  Chip,
  HStack,
  Icon,
  Screen,
  ScreenHeader,
  SelectSheet,
  Skeleton,
  Text,
  Toast,
  VStack,
  useToast,
  type SelectSheetOption,
} from '@/shared/ui';
import { checkYieldAmount } from '../domain/usecase/check-yield-amount-usecase';
import type { DepositQuoteDecision, WithdrawalQuoteDecision } from '../domain/entity/yield-quote';
import { useMoveTargets } from './hook/use-move-targets';
import { useYieldQuote } from './hook/use-yield-quote';
import { ProductChip } from './widget/product-chip';
import type { YieldParamList } from './yield-param-list';

const CURRENCY = 'USD';
const MINOR_SCALE = 100;

const SHORTCUTS = [10, 50, 100, 500, 1000];

const CHIP_PLACEHOLDER_HEIGHT = 36;

const CEILING_MESSAGE: Record<'deposit' | 'withdrawal', TranslationKey> = {
  deposit: 'yield.insufficientBalance',
  withdrawal: 'yield.exceedsPosition',
};

export function YieldAmountScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<YieldParamList>>();
  const { kind, vaultId } = useRoute<RouteProp<YieldParamList, 'Amount'>>().params;
  const isDeposit = kind === 'deposit';

  const amount = useAmountDraft(CURRENCY, i18n.language);
  const targets = useMoveTargets(kind);
  const { quote, isQuoting } = useYieldQuote();
  const { toast, show, hide } = useToast();

  const [chosenId, setChosenId] = useState<string | undefined>(vaultId);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const chosen =
    targets.targets.find(({ target }) => target.vaultId === chosenId) ?? targets.targets[0];
  const ceilingMinor = chosen?.ceilingMinor;
  const check = checkYieldAmount({ amountMinor: amount.minor, ceilingMinor });
  const isUnfunded = isDeposit && ceilingMinor === 0;
  const canContinue = chosen !== undefined && check === 'ok' && !isQuoting;

  const options: SelectSheetOption[] = targets.targets.map(({ target }) => ({
    id: target.vaultId,
    title: t('yield.vaultName', { token: target.tokenSymbol }),
  }));

  const ceilingLabel =
    ceilingMinor === undefined ? undefined : formatMinor(ceilingMinor, CURRENCY, i18n.language);

  function problemWith(
    decision: DepositQuoteDecision | WithdrawalQuoteDecision,
  ): string | undefined {
    const money = (minor: number) => formatMinorTrimmed(minor, CURRENCY, i18n.language);

    switch (decision.type) {
      case 'quoted':
      case 'adjusted':
        return undefined;
      case 'feeExceedsBalance':
        return t('yield.feeExceedsBalance', { fee: money(decision.feeMinor) });
      case 'notAboveFee':
        return t('yield.withdrawNotAboveFee', { fee: money(decision.feeMinor) });
      case 'exceedsBalance':
        return t('yield.insufficientBalance');
      case 'exceedsPosition':
        return t('yield.exceedsPosition');
      case 'unknownBalance':
        return t('yield.unknownBalance');
      case 'refused':
        return t('yield.withdrawRefused');
      case 'noFit':
        return t('yield.quoteFailed');
    }
  }

  async function onContinue() {
    if (chosen === undefined) return;

    const requestedMinor = amount.minor;
    const answer = await quote(kind, chosen.target, requestedMinor);
    if (answer === undefined || !navigation.isFocused()) return;
    if (!answer.ok) {
      show(t('yield.quoteFailed'));
      return;
    }

    const decision = answer.value;
    const problem = problemWith(decision);
    if (problem !== undefined) {
      show(problem);
      return;
    }

    if (decision.type === 'adjusted') {
      amount.setMinor(decision.quote.amountMinor);
      navigation.navigate('Confirm', {
        target: chosen.target,
        quote: decision.quote,
        adjustedFromMinor: decision.requestedMinor,
      });
    } else if (decision.type === 'quoted') {
      navigation.navigate('Confirm', { target: chosen.target, quote: decision.quote });
    }
  }

  const isNothingOnOffer =
    isDeposit && !targets.isPending && !targets.isError && targets.targets.length === 0;

  const inlineMessage = isUnfunded
    ? t('yield.fundToDeposit')
    : isNothingOnOffer
      ? t('yield.noProducts')
      : check === 'exceedsCeiling'
        ? t(CEILING_MESSAGE[kind])
        : check === 'unknownCeiling' && chosen !== undefined
          ? t('yield.unknownBalance')
          : undefined;

  return (
    <>
      <Screen
        footer={
          <VStack gap="md">
            <HStack gap="sm" justify="center" wrap>
              {SHORTCUTS.map((preset) => (
                <Chip
                  key={preset}
                  tone="brandSubtle"
                  label={formatMinorTrimmed(preset * MINOR_SCALE, CURRENCY, i18n.language)}
                  {...(isQuoting
                    ? {}
                    : {
                        onPress: () => {
                          amount.setMinor(preset * MINOR_SCALE);
                        },
                      })}
                />
              ))}
            </HStack>

            <Button
              label={t('common.continue')}
              disabled={!canContinue}
              isLoading={isQuoting}
              onPress={() => {
                void onContinue();
              }}
            />

            <AmountKeypad
              onKey={amount.press}
              allowDecimal={amount.allowDecimal}
              disabled={isQuoting}
              decimalLabel={t('common.decimalPoint')}
              deleteLabel={t('common.clear')}
            />
          </VStack>
        }
      >
        <VStack paddingX="lg" gap="lg" style={styles.body}>
          <ScreenHeader
            title={t(isDeposit ? 'yield.deposit' : 'yield.withdraw')}
            align="leading"
            onBack={() => {
              navigation.goBack();
            }}
            trailing={
              ceilingLabel === undefined || ceilingMinor === undefined ? undefined : (
                <Chip
                  label={ceilingLabel}
                  accessibilityLabel={t(
                    isDeposit ? 'yield.walletBalanceOf' : 'yield.availableToWithdrawOf',
                    { amount: ceilingLabel },
                  )}
                  leading={<Icon name="wallet-outline" size="sm" color="secondary" />}
                  {...(isQuoting || ceilingMinor <= 0
                    ? {}
                    : {
                        onPress: () => {
                          amount.setMinor(ceilingMinor);
                        },
                      })}
                />
              )
            }
          />

          {targets.isError && (
            <Banner
              tone="error"
              message={t('errors.common.unknown')}
              action={{ label: t('common.retry'), onPress: targets.refetch }}
            />
          )}

          <VStack gap="xl">
            <HStack justify="center">
              {chosen !== undefined ? (
                <ProductChip
                  target={chosen.target}
                  {...(targets.targets.length > 1
                    ? {
                        onPress: () => {
                          setIsPickerOpen(true);
                        },
                      }
                    : {})}
                />
              ) : (
                targets.isPending && (
                  <Skeleton width="40%" height={CHIP_PLACEHOLDER_HEIGHT} radius="pill" />
                )
              )}
            </HStack>

            <VStack align="center" gap="xxs">
              <Text variant="body.m" color="secondary">
                {t(isDeposit ? 'yield.investmentAmount' : 'common.amount')}
              </Text>

              <AmountDisplay
                {...amount.formatted}
                accessibilityLabel={`${t('common.amount')}, ${formatMinor(
                  amount.minor,
                  CURRENCY,
                  i18n.language,
                )}`}
              />

              {inlineMessage !== undefined && (
                <Text variant="body.s" color="error" align="center">
                  {inlineMessage}
                </Text>
              )}
            </VStack>
          </VStack>
        </VStack>

        <SelectSheet
          isOpen={isPickerOpen}
          title={t('yield.selectProduct')}
          closeLabel={t('common.close')}
          options={options}
          emptyMessage={t('yield.noProducts')}
          {...(chosen === undefined ? {} : { selectedId: chosen.target.vaultId })}
          onSelect={(id) => {
            setChosenId(id);
            setIsPickerOpen(false);
          }}
          onClose={() => {
            setIsPickerOpen(false);
          }}
        />
      </Screen>

      <Toast toast={toast} dismissLabel={t('common.close')} onDismiss={hide} />
    </>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
});
