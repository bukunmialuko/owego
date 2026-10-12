import { useEffect, useMemo, useState } from 'react';
import {
  usePreventRemove,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { convert } from '@/core/fx/convert';
import { formatDraft, fromNumber } from '@/core/money/amount-draft';
import {
  formatMinor,
  fractionDigitsFor,
  isCurrencyCode,
  type CurrencyCode,
} from '@/core/money/money';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { AmountDisplay, AssetMark, Avatar, Skeleton } from '@/shared/ui';
import type { NotSentReason } from '../../domain/entity/send-outcome';
import { PaymentConfirmation } from '../widget/payment-confirmation';
import { RecipientCard } from '../widget/recipient-card';
import { recipientName } from '../widget/recipient-name';
import { TransferSummary } from '../widget/transfer-summary';
import { useBankPayout } from './hook/use-bank-payout';
import { useSaveOffer } from './hook/use-save-offer';
import type { BankTransferParamList } from './bank-transfer-param-list';

const WALLET_CURRENCY = 'USD';
const MINOR_SCALE = 100;

const NOT_SENT_MESSAGE: Record<NotSentReason, TranslationKey> = {
  failed: 'spend.sendFailed',
  expired: 'spend.sendExpired',
  pinLocked: 'auth.circlePinLocked',
  incorrectPin: 'auth.circleIncorrectPin',
  insufficientBalance: 'spend.insufficientBalance',
  invalidRequest: 'spend.sendFailed',
};

export function ConfirmScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BankTransferParamList>>();
  const { recipient, fundingToken, amountMinor, narration, origin } =
    useRoute<RouteProp<BankTransferParamList, 'Confirm'>>().params;

  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const saveOffer = useSaveOffer(recipient);

  const isPayable = isCurrencyCode(recipient.currency);

  const draft = useMemo(
    () => ({ recipient, fundingToken, amountMinor, narration, origin }),
    [recipient, fundingToken, amountMinor, narration, origin],
  );
  const { quote, prepareFailed, confirm, isConfirming, outcome } = useBankPayout(draft, {
    enabled: isPayable,
  });

  usePreventRemove(isConfirming, () => undefined);

  const ended = !isConfirming ? outcome : undefined;
  useEffect(() => {
    if (ended === undefined || quote === undefined) return;
    if (ended.type === 'cancelled' || ended.type === 'notSent') return;

    navigation.reset({
      index: 0,
      routes: [{ name: 'Success', params: { recipient, quote, outcome: ended.type } }],
    });
  }, [ended, quote, navigation, recipient]);

  const problem = ended?.type === 'notSent' ? t(NOT_SENT_MESSAGE[ended.reason]) : undefined;

  const destination = asCurrencyCode(recipient.currency);
  const formatted = formatDraft(
    fromNumber(amountMinor / MINOR_SCALE, fractionDigitsFor(destination)),
    i18n.language,
    destination,
  );

  const isConverted = recipient.currency !== WALLET_CURRENCY;
  const inWallet = isConverted ? quote?.wallet : undefined;
  const name = recipientName(recipient, t);

  return (
    <PaymentConfirmation
      isLocked={isConfirming}
      onBack={() => {
        navigation.goBack();
      }}
      onClose={() => {
        navigation.getParent()?.goBack();
      }}
      {...(isPayable
        ? {
            hero: (
              <AmountDisplay
                {...formatted}
                accessibilityLabel={`${t('spend.amountLabel')}, ${formatMinor(
                  amountMinor,
                  destination,
                  i18n.language,
                )}`}
                {...(inWallet === undefined
                  ? {}
                  : {
                      secondary: formatMinor(
                        inWallet.recipientGetsMinor,
                        WALLET_CURRENCY,
                        i18n.language,
                      ),
                    })}
              />
            ),
          }
        : {})}
      recipient={
        <RecipientCard
          variant="full"
          title={name}
          subtitle={recipient.subtitle}
          accessibleValue={`${name}, ${recipient.subtitle}`}
          mark={
            recipient.displayName === '' ? (
              <AssetMark symbol={recipient.currency} badgeCountryCode={recipient.countryCode} />
            ) : (
              <Avatar name={recipient.displayName} size="lg" />
            )
          }
        />
      }
      {...(problem === undefined ? {} : { problem })}
      summary={
        !isPayable || prepareFailed ? null : quote === undefined ? (
          <Skeleton height={260} />
        ) : (
          <TransferSummary
            quote={quote.destination}
            locale={i18n.language}
            {...(inWallet === undefined ? {} : { inWallet })}
            {...(narration === '' ? {} : { narration })}
            {...(isConverted
              ? {
                  rateLine: t('spend.fxRateLine', {
                    base: formatMinor(MINOR_SCALE, WALLET_CURRENCY, i18n.language),
                    quote: formatMinor(
                      convert(MINOR_SCALE, {
                        baseCurrency: WALLET_CURRENCY,
                        quoteCurrency: recipient.currency,
                        rate: quote.rate,
                      }),
                      destination,
                      i18n.language,
                    ),
                  }),
                }
              : {})}
          />
        )
      }
      {...(!isPayable || prepareFailed ? { notice: t('spend.quoteUnavailable') } : {})}
      {...(saveOffer.kind === 'none'
        ? {}
        : { saveSwitch: { checked: saveAsBeneficiary, onChange: setSaveAsBeneficiary } })}
      canConfirm={quote !== undefined && isPayable}
      onConfirm={() => {
        confirm({ saveAsBeneficiary: saveAsBeneficiary && saveOffer.kind !== 'none' });
      }}
    />
  );
}

function asCurrencyCode(code: string): CurrencyCode {
  return isCurrencyCode(code) ? code : 'USD';
}
