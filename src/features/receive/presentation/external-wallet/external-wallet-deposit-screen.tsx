import { useEffect, useState } from 'react';
import { usePreventRemove, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useResolve } from '@/core/di/container-provider';
import { truncateAddress } from '@/core/format/address';
import type { TranslationKey } from '@/core/i18n/translation-key';
import { formatMinor } from '@/core/money/money';
import { useAmountDraft } from '@/core/money/use-amount-draft';
import {
  AmountDisplay,
  AmountKeypad,
  AssetMark,
  Button,
  Chip,
  HStack,
  Icon,
  Screen,
  ScreenHeader,
  Text,
  VStack,
} from '@/shared/ui';
import {
  depositTokensFor,
  primaryDepositToken,
  type DepositToken,
} from '../../domain/entity/deposit-token';
import type { DepositNotSentReason } from '../../domain/entity/external-deposit';
import { NATIVE_SOLANA_CHAIN } from '../../domain/entity/receive-entity';
import { validateExternalDepositAmount } from '../../domain/usecase/validate-external-deposit-amount-usecase';
import { SelectTokenSheet } from '../widget/select-token-sheet';
import { useExternalWalletBalance } from './hook/use-external-wallet-balance';
import {
  useExternalWalletConnection,
  type ConnectionProblem,
} from './hook/use-external-wallet-connection';
import { useSubmitExternalDeposit } from './hook/use-submit-external-deposit';
import type { ExternalWalletDepositParamList } from './external-wallet-deposit-param-list';

const CURRENCY = 'USD';

const ADDRESS_HEAD = 8;
const ADDRESS_TAIL = 4;

const CONNECTION_PROBLEM: Record<ConnectionProblem, TranslationKey> = {
  noWallet: 'receive.externalWallet.noWallet',
  cancelled: 'receive.externalWallet.cancelled',
  unreachable: 'receive.externalWallet.unreachable',
  unsupported: 'receive.externalWallet.unsupported',
  failed: 'receive.externalWallet.connectFailed',
  expired: 'receive.externalWallet.authorizationExpired',
};

const NOT_SENT: Record<DepositNotSentReason, TranslationKey> = {
  declined: 'receive.externalWallet.declined',
  notSubmitted: 'receive.externalWallet.notSubmitted',
  authorizationExpired: 'receive.externalWallet.authorizationExpired',
  noWallet: 'receive.externalWallet.noWallet',
  unreachable: 'receive.externalWallet.unreachable',
  unsupported: 'receive.externalWallet.unsupported',
  invalidRequest: 'receive.externalWallet.startFailed',
  noDestination: 'receive.externalWallet.noDestination',
};

export function ExternalWalletDepositScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<ExternalWalletDepositParamList>>();
  const { solanaCluster } = useResolve('config');
  const tokens = depositTokensFor(solanaCluster);

  const [token, setToken] = useState<DepositToken>(() => primaryDepositToken(solanaCluster));
  const [isTokenSheetOpen, setIsTokenSheetOpen] = useState(false);
  const tokenSymbol = token.symbol;

  const { connection, connect, expire } = useExternalWalletConnection();
  const account = connection.status === 'connected' ? connection.account : undefined;
  const balance = useExternalWalletBalance(account?.address, token);
  const amount = useAmountDraft(CURRENCY, i18n.language);
  const { submit, isSubmitting, answer, submitted, reset } = useSubmitExternalDeposit();

  usePreventRemove(isSubmitting, () => undefined);

  const answered = !isSubmitting && answer?.ok === true ? answer.value : undefined;
  useEffect(() => {
    if (answered === undefined || submitted === undefined) return;
    if (answered.type === 'notSent') {
      if (answered.reason === 'authorizationExpired') expire();
      return;
    }

    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Result',
          params: {
            amountMinor: submitted.amountMinor,
            tokenSymbol: submitted.tokenSymbol,
            signature: answered.type === 'submitted' ? answered.signature : null,
          },
        },
      ],
    });
  }, [answered, submitted, navigation, expire]);

  const balanceMinor = balance.data ?? undefined;
  const validation = validateExternalDepositAmount(amount.minor, balanceMinor);

  const balanceLine =
    balance.isError || balance.data === null
      ? t('receive.externalWallet.balanceUnavailable')
      : balanceMinor === undefined
        ? undefined
        : t('receive.externalWallet.available', {
            token: tokenSymbol,
            amount: formatMinor(balanceMinor, CURRENCY, i18n.language),
          });

  const problem = isSubmitting
    ? undefined
    : !amount.isPristine && !validation.valid && validation.problem === 'exceedsBalance'
      ? t('receive.externalWallet.exceedsBalance')
      : answer !== undefined && !answer.ok
        ? t('receive.externalWallet.startFailed')
        : answered?.type === 'notSent'
          ? t(NOT_SENT[answered.reason], { token: tokenSymbol })
          : undefined;

  const isConnecting = connection.status === 'connecting';

  return (
    <Screen
      footer={
        account === undefined ? (
          <Button
            label={t('receive.externalWallet.connect')}
            isLoading={isConnecting}
            disabled={isConnecting}
            onPress={() => {
              reset();
              void connect();
            }}
          />
        ) : (
          <VStack gap="md">
            {problem !== undefined && (
              <Text accessibilityRole="alert" variant="caption.m" color="error" align="center">
                {problem}
              </Text>
            )}
            {isSubmitting && (
              <Text variant="caption.m" color="secondary" align="center">
                {t('receive.externalWallet.waitingForWallet')}
              </Text>
            )}
            <Button
              label={t('receive.externalWallet.deposit')}
              isLoading={isSubmitting}
              disabled={!validation.valid || isSubmitting}
              onPress={() => {
                submit({ account, tokenSymbol, amountMinor: amount.minor });
              }}
            />
            <AmountKeypad
              onKey={(key) => {
                if (!isSubmitting) amount.press(key);
              }}
              allowDecimal={amount.allowDecimal}
              decimalLabel={t('common.decimalPoint')}
              deleteLabel={t('common.clear')}
            />
          </VStack>
        )
      }
    >
      <VStack paddingX="lg" gap="lg" style={styles.body}>
        <ScreenHeader
          title={t('receive.externalWallet.title')}
          align="leading"
          {...(isSubmitting
            ? {}
            : {
                onBack: () => {
                  navigation.goBack();
                },
              })}
        />

        {account === undefined ? (
          <VStack gap="lg">
            <Text variant="body.m" color="secondary">
              {t('receive.externalWallet.subtitle')}
            </Text>
            {connection.status === 'disconnected' ? (
              <Text accessibilityRole="alert" variant="body.m" color="error">
                {t(CONNECTION_PROBLEM[connection.problem])}
              </Text>
            ) : (
              <Text variant="body.m" color="tertiary">
                {t('receive.externalWallet.connecting')}
              </Text>
            )}
          </VStack>
        ) : (
          <>
            <HStack gap="sm" wrap>
              <Chip
                label={t('receive.externalWallet.connectedAs', {
                  address: truncateAddress(account.address, ADDRESS_HEAD, ADDRESS_TAIL),
                })}
                leading={<Icon name="wallet-outline" size="sm" color="secondary" />}
              />
              {tokens.length > 1 && (
                <Chip
                  label={tokenSymbol}
                  accessibilityLabel={`${t('receive.tokenLabel')}, ${tokenSymbol}`}
                  leading={<AssetMark symbol={tokenSymbol} size="sm" />}
                  hasChevron
                  onPress={() => {
                    setIsTokenSheetOpen(true);
                  }}
                />
              )}
            </HStack>

            <VStack gap="xs">
              {balanceLine !== undefined && (
                <Text variant="body.m" color="secondary">
                  {balanceLine}
                </Text>
              )}
              <Chip
                label={t('receive.depositFee', { percent: NATIVE_SOLANA_CHAIN.depositFeePercent })}
              />
            </VStack>

            <View style={styles.amount}>
              <AmountDisplay
                {...amount.formatted}
                accessibilityLabel={`${t('receive.externalWallet.amountLabel')}, ${formatMinor(
                  amount.minor,
                  CURRENCY,
                  i18n.language,
                )}`}
              />
            </View>
          </>
        )}
      </VStack>

      <SelectTokenSheet
        isOpen={isTokenSheetOpen}
        tokens={tokens.map((candidate) => candidate.symbol)}
        selectedSymbol={tokenSymbol}
        onSelect={(symbol) => {
          const chosen = tokens.find((candidate) => candidate.symbol === symbol);
          if (chosen !== undefined) setToken(chosen);
          setIsTokenSheetOpen(false);
        }}
        onClose={() => {
          setIsTokenSheetOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  amount: { flex: 1, justifyContent: 'center' },
});
