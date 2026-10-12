import { useEffect, useState } from 'react';
import {
  usePreventRemove,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatDraft, fromMinor } from '@/core/money/amount-draft';
import { formatMinor } from '@/core/money/money';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { AmountDisplay } from '@/shared/ui';
import { savedWalletFor, walletRecipientFor } from '../../domain/beneficiary/wallet-recipient';
import type { NotSentReason } from '../../domain/entity/send-outcome';
import { useBeneficiaryDirectory } from '../hook/use-beneficiaries';
import { PaymentConfirmation } from '../widget/payment-confirmation';
import { useSendableBalance } from './hook/use-sendable-balance';
import { useSendAsset } from './hook/use-send-asset';
import { AssetRecipientCard } from './widget/asset-recipient-card';
import { AssetTransferSummary } from './widget/asset-transfer-summary';
import { TagSheet } from '../widget/tag-sheet';
import type { DigitalAssetParamList } from './digital-asset-param-list';

const CURRENCY = 'USD';
const FRACTION_DIGITS = 2;

const NOT_SENT_MESSAGE: Record<NotSentReason, TranslationKey> = {
  failed: 'spend.sendFailed',
  expired: 'spend.sendExpired',
  pinLocked: 'auth.circlePinLocked',
  incorrectPin: 'auth.circleIncorrectPin',
  insufficientBalance: 'spend.insufficientBalance',
  invalidRequest: 'spend.sendFailed',
};

export function ConfirmPaymentScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<DigitalAssetParamList>>();
  const { recipient, amountMinor } = useRoute<RouteProp<DigitalAssetParamList, 'Confirm'>>().params;

  const [saveAsBeneficiary, setSaveAsBeneficiary] = useState(false);
  const [walletTag, setWalletTag] = useState('');
  const [isTagSheetOpen, setIsTagSheetOpen] = useState(false);
  const balance = useSendableBalance(recipient.networkCode, recipient.tokenSymbol);
  const directory = useBeneficiaryDirectory();
  const isAlreadySaved =
    directory.data !== undefined && savedWalletFor(recipient, directory.data) !== undefined;

  const { send, isSending, answer } = useSendAsset();

  usePreventRemove(isSending, () => undefined);

  const outcome = !isSending && answer?.ok === true ? answer.value : undefined;
  useEffect(() => {
    if (outcome === undefined || outcome.type === 'cancelled' || outcome.type === 'notSent') {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: 'Success', params: { recipient, amountMinor, outcome: outcome.type } }],
    });
  }, [outcome, navigation, recipient, amountMinor]);

  const problem =
    isSending || answer === undefined
      ? undefined
      : !answer.ok
        ? t('spend.sendFailed')
        : answer.value.type === 'notSent'
          ? t(NOT_SENT_MESSAGE[answer.value.reason])
          : undefined;

  const formatted = formatDraft(fromMinor(amountMinor, FRACTION_DIGITS), i18n.language, CURRENCY);

  return (
    <>
      <PaymentConfirmation
        isLocked={isSending}
        onBack={() => {
          navigation.goBack();
        }}
        onClose={() => {
          navigation.getParent()?.goBack();
        }}
        hero={
          <AmountDisplay
            {...formatted}
            accessibilityLabel={`${t('spend.amountLabel')}, ${formatMinor(
              amountMinor,
              CURRENCY,
              i18n.language,
            )}`}
          />
        }
        recipient={<AssetRecipientCard recipient={recipient} variant="full" />}
        {...(problem === undefined ? {} : { problem })}
        summary={
          <AssetTransferSummary
            amountMinor={amountMinor}
            tokenSymbol={recipient.tokenSymbol}
            balanceMinor={balance.data ?? undefined}
            locale={i18n.language}
          />
        }
        {...(isAlreadySaved
          ? {}
          : {
              saveSwitch: {
                checked: saveAsBeneficiary,
                onChange: (next: boolean) => {
                  if (next) setIsTagSheetOpen(true);
                  else setSaveAsBeneficiary(false);
                },
              },
            })}
        canConfirm
        onConfirm={() => {
          send(
            {
              networkCode: recipient.networkCode,
              tokenSymbol: recipient.tokenSymbol,
              destinationAddress: recipient.address,
              amountMinor,
            },
            {
              recipient: walletRecipientFor(recipient, walletTag),
              saveAsBeneficiary: saveAsBeneficiary && !isAlreadySaved,
            },
          );
        }}
      />

      <TagSheet
        isOpen={isTagSheetOpen}
        title={t('spend.walletTagSheetTitle')}
        label={t('spend.walletTag')}
        placeholder={t('spend.walletTagPlaceholder')}
        onSave={(tag) => {
          setWalletTag(tag);
          setSaveAsBeneficiary(true);
          setIsTagSheetOpen(false);
        }}
        onClose={() => {
          setIsTagSheetOpen(false);
        }}
      />
    </>
  );
}
