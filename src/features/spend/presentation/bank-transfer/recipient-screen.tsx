import { useState } from 'react';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Pressable } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Button,
  CountryFlag,
  HStack,
  IconButton,
  Screen,
  ScreenHeader,
  SelectField,
  SelectSheet,
  Text,
  VStack,
} from '@/shared/ui';
import ScanGlyph from '@/assets/icons/scan.svg';
import { resolveFundingToken } from '../../domain/asset/funding-token';
import { METHOD_LABEL } from '../../domain/entity/beneficiary-form';
import {
  corridorsFor,
  isPayableByForm,
  isPayableByScan,
  payoutCurrencies,
} from '../../domain/corridor/registry';
import type { FieldValues } from '../../domain/corridor/corridor-spec';
import { CorridorForm } from '../widget/corridor-form';
import { CorridorFieldPicker, type FieldPicker } from '../widget/corridor-field-picker';
import { useCorridorStep } from '../hook/use-corridor-step';
import { usePayoutFundingOptions } from '../hook/use-payout-funding-options';
import { useLastTransferCurrency } from './hook/use-last-transfer-currency';
import { toPayoutRecipient } from '../../domain/corridor/to-payout-recipient';
import { payoutPrefillFor } from '../../domain/beneficiary/prefill';
import { SavedBeneficiariesSheet } from '../widget/saved-beneficiaries-sheet';
import { TokenPicker } from '../widget/token-picker';
import type { BankTransferParamList } from './bank-transfer-param-list';

const TAP_SLOP = { top: 12, bottom: 12, left: 8, right: 8 };

type Picker =
  { kind: 'currency' } | { kind: 'method' } | { kind: 'saved' } | ({ kind: 'field' } & FieldPicker);

export function RecipientScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BankTransferParamList>>();
  const rootNavigation = useNavigation<NavigationProp<ReactNavigation.RootParamList>>();

  const { prefill } = useRoute<RouteProp<BankTransferParamList, 'Recipient'>>().params ?? {};
  const funding = usePayoutFundingOptions();
  const [chosenToken, setChosenToken] = useState(prefill?.fundingToken);
  const token = resolveFundingToken(funding.options, chosenToken);
  const origin = prefill?.origin ?? 'transfer';
  const lastTransferCurrency = useLastTransferCurrency();
  const [currencyCode, setCurrencyCode] = useState(prefill?.currency ?? lastTransferCurrency ?? '');
  const [chosenMethod, setChosenMethod] = useState<string | undefined>(prefill?.method);
  const [values, setValues] = useState<FieldValues>(prefill?.values ?? {});
  const [picker, setPicker] = useState<Picker | undefined>(undefined);

  const currencies = payoutCurrencies();
  const currency = currencies.find((candidate) => candidate.code === currencyCode);
  const methods = corridorsFor(currencyCode);

  const corridor =
    methods.find((candidate) => candidate.method === chosenMethod) ??
    (methods.length === 1 ? methods[0] : undefined);

  const step = corridor?.steps[0];
  const { optionsBySource, labelOf, resolution, isComplete, filled } = useCorridorStep(
    corridor,
    step,
    values,
  );
  const isReady = corridor !== undefined && corridor.payable && isComplete && token !== undefined;

  function close() {
    setPicker(undefined);
  }

  return (
    <Screen
      avoidsKeyboard
      scroll
      footer={
        <Button
          label={t('common.continue')}
          disabled={!isReady}
          onPress={() => {
            if (corridor === undefined || currency === undefined || token === undefined) return;

            if (corridor.steps.length > 1) {
              navigation.navigate('BankDetails', {
                currency: corridor.currency,
                method: corridor.method,
                fundingToken: token,
                values: { ...filled },
                origin,
              });

              return;
            }

            navigation.navigate('Amount', {
              recipient: toPayoutRecipient(corridor, filled, currency, labelOf),
              fundingToken: token,
              origin,
            });
          }}
        />
      }
    >
      <VStack paddingX="lg" gap="lg">
        <ScreenHeader
          title={t('spend.send')}
          align="leading"
          onBack={() => {
            navigation.goBack();
          }}
          trailing={
            <IconButton
              label={t('spend.scanToPay')}
              glyph={ScanGlyph}
              tone="surface"
              color="brand"
              onPress={() => {
                rootNavigation.navigate(
                  'ScanToPay',
                  token === undefined ? undefined : { fundingToken: token },
                );
              }}
            />
          }
        />

        <HStack justify="space-between" gap="md">
          <TokenPicker
            options={funding.options}
            selected={token}
            isPending={funding.isPending}
            isError={funding.isError}
            onRetry={funding.retry}
            onSelect={setChosenToken}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('spend.savedBeneficiaries')}
            hitSlop={TAP_SLOP}
            onPress={() => {
              setPicker({ kind: 'saved' });
            }}
          >
            <Text variant="body.mEmphasis" color="brand">
              {t('spend.savedBeneficiaries')}
            </Text>
          </Pressable>
        </HStack>

        <SelectField
          label={t('common.currency')}
          {...(currency === undefined ? {} : { value: currency.name })}
          placeholder={t('common.currency')}
          labelPlacement="inside"
          isRequired
          {...(currency === undefined
            ? {}
            : { leading: <CountryFlag code={currency.country_code} size="sm" /> })}
          onPress={() => {
            setPicker({ kind: 'currency' });
          }}
        />

        {currencyCode !== '' && (
          <SelectField
            label={t('spend.paymentMethod')}
            {...(corridor === undefined ? {} : { value: t(METHOD_LABEL[corridor.method]) })}
            placeholder={t('spend.paymentMethod')}
            labelPlacement="inside"
            isRequired
            onPress={() => {
              setPicker({ kind: 'method' });
            }}
          />
        )}

        {step !== undefined && (
          <CorridorForm
            fields={step.fields}
            values={values}
            optionsBySource={optionsBySource}
            {...(resolution === undefined ? {} : { resolution })}
            onChange={(name, next) => {
              setValues((previous) => ({ ...previous, [name]: next }));
            }}
            onOpenPicker={(field, options) => {
              setPicker({ kind: 'field', field, options });
            }}
          />
        )}
      </VStack>

      <SelectSheet
        isOpen={picker?.kind === 'currency'}
        title={t('spend.selectCurrency')}
        closeLabel={t('common.close')}
        emptyMessage={t('common.noItemsFound')}
        searchPlaceholder={t('spend.searchBeneficiaries')}
        selectedId={currencyCode}
        options={currencies.map((candidate) => ({
          id: candidate.code,
          title: candidate.name,
          subtitle: isPayableByForm(candidate)
            ? candidate.code
            : `${candidate.code} • ${t('spend.methodScanToPay')}`,
          leading: <CountryFlag code={candidate.country_code} size="md" />,
          disabled: !isPayableByForm(candidate) && !isPayableByScan(candidate),
        }))}
        onSelect={(code) => {
          const chosen = currencies.find((candidate) => candidate.code === code);
          if (chosen !== undefined && !isPayableByForm(chosen)) {
            close();
            rootNavigation.navigate(
              'ScanToPay',
              token === undefined ? undefined : { fundingToken: token },
            );
            return;
          }

          setCurrencyCode(code);
          setChosenMethod(undefined);
          setValues({});
          close();
        }}
        onClose={close}
      />

      <SelectSheet
        isOpen={picker?.kind === 'method'}
        title={t('spend.paymentMethod')}
        closeLabel={t('common.close')}
        emptyMessage={t('spend.noMethods')}
        {...(corridor === undefined ? {} : { selectedId: corridor.method })}
        options={methods.map((candidate) => ({
          id: candidate.method,
          title: t(METHOD_LABEL[candidate.method]),
          ...(candidate.payable ? {} : { subtitle: t('spend.methodUnavailable') }),
          disabled: !candidate.payable,
        }))}
        onSelect={(method) => {
          setChosenMethod(method);
          setValues({});
          close();
        }}
        onClose={close}
      />

      <SavedBeneficiariesSheet
        isOpen={picker?.kind === 'saved'}
        kind="bank"
        canPay={(beneficiary) => payoutPrefillFor(beneficiary) !== undefined}
        onSelect={(beneficiary) => {
          const prefill = payoutPrefillFor(beneficiary);
          if (prefill === undefined) return;

          setCurrencyCode(prefill.currency);
          setChosenMethod(prefill.method);
          setValues(prefill.values);
          close();
        }}
        onClose={close}
      />

      <CorridorFieldPicker
        picker={picker?.kind === 'field' ? picker : undefined}
        selectedValue={picker?.kind === 'field' ? (values[picker.field.name] ?? '') : ''}
        onSelect={(name, value) => {
          setValues((previous) => ({ ...previous, [name]: value }));
          close();
        }}
        onClose={close}
      />
    </Screen>
  );
}
