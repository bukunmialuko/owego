import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
  Button,
  CountryFlag,
  Screen,
  ScreenHeader,
  SelectField,
  SelectSheet,
  VStack,
} from '@/shared/ui';
import { METHOD_LABEL } from '../../domain/entity/beneficiary-form';
import type { FieldValues } from '../../domain/corridor/corridor-spec';
import {
  beneficiaryCorridorsFor,
  isPayableByScan,
  isSaveableByForm,
  payoutCurrencies,
} from '../../domain/corridor/registry';
import { useCorridorStep } from '../hook/use-corridor-step';
import { CorridorFieldPicker, type FieldPicker } from '../widget/corridor-field-picker';
import { CorridorForm } from '../widget/corridor-form';
import { useSaveAndReturn } from './hook/use-save-and-return';
import { BeneficiaryCurrencySheet } from './widget/beneficiary-currency-sheet';
import { SaveNoticeBanner } from './widget/save-notice-banner';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

type Picker = { kind: 'currency' } | { kind: 'method' } | ({ kind: 'field' } & FieldPicker);

export function AddBankBeneficiaryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BeneficiariesParamList>>();
  const handed = useRoute<RouteProp<BeneficiariesParamList, 'AddBank'>>().params?.currency;
  const [currencyCode, setCurrencyCode] = useState(() => formCurrencyOrNone(handed));
  const [chosenMethod, setChosenMethod] = useState<string | undefined>(undefined);
  const [values, setValues] = useState<FieldValues>({});
  const [picker, setPicker] = useState<Picker | undefined>(undefined);
  const { submit, isSaving, notice } = useSaveAndReturn('bank');

  const currencies = payoutCurrencies();
  const currency = currencies.find((candidate) => candidate.code === currencyCode);
  const methods = beneficiaryCorridorsFor(currencyCode);

  const corridor =
    methods.find(
      (candidate) => candidate.method === chosenMethod && candidate.beneficiary?.saveable === true,
    ) ??
    (methods.length === 1 && methods[0]?.beneficiary?.saveable === true ? methods[0] : undefined);

  const steps = corridor?.beneficiary?.steps ?? [];
  const step = steps[0];
  const { optionsBySource, labelOf, resolution, isComplete, filled } = useCorridorStep(
    corridor,
    step,
    values,
  );
  const hasNextStep = steps.length > 1;

  function close() {
    setPicker(undefined);
  }

  return (
    <Screen
      avoidsKeyboard
      scroll
      footer={
        <Button
          label={t(hasNextStep ? 'common.continue' : 'spend.beneficiaries.save')}
          disabled={corridor === undefined || !isComplete || isSaving}
          isLoading={isSaving}
          onPress={() => {
            if (corridor === undefined) return;

            if (hasNextStep) {
              navigation.navigate('AddBankDetails', {
                currency: corridor.currency,
                method: corridor.method,
                values: { ...filled },
              });
              return;
            }

            submit(corridor, filled, labelOf);
          }}
        />
      }
    >
      <VStack paddingX="lg" gap="lg">
        <ScreenHeader
          title={t('spend.beneficiaries.addTitle')}
          onBack={() => {
            navigation.goBack();
          }}
        />

        <SaveNoticeBanner notice={notice} />

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

      <BeneficiaryCurrencySheet
        isOpen={picker?.kind === 'currency'}
        selectedCode={currencyCode}
        onSelect={(chosen) => {
          close();

          if (isPayableByScan(chosen)) {
            navigation.navigate('ScanMerchant');
            return;
          }

          setCurrencyCode(chosen.code);
          setChosenMethod(undefined);
          setValues({});
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
          ...(candidate.beneficiary?.saveable === true
            ? {}
            : { subtitle: t('spend.methodUnavailable') }),
          disabled: candidate.beneficiary?.saveable !== true,
        }))}
        onSelect={(method) => {
          setChosenMethod(method);
          setValues({});
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

function formCurrencyOrNone(code: string | undefined): string {
  const currency = payoutCurrencies().find((candidate) => candidate.code === code);

  return currency !== undefined && isSaveableByForm(currency) ? currency.code : '';
}
