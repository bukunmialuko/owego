import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { corridorFor, payoutCurrencies } from '../../domain/corridor/registry';
import { Button, Screen, ScreenHeader, VStack } from '@/shared/ui';
import type { PaymentMethodCode } from '../../domain/entity/beneficiary-form';
import type { FieldValues } from '../../domain/corridor/corridor-spec';
import { CorridorForm } from '../widget/corridor-form';
import { CorridorFieldPicker, type FieldPicker } from '../widget/corridor-field-picker';
import { useCorridorStep } from '../hook/use-corridor-step';
import { toPayoutRecipient } from '../../domain/corridor/to-payout-recipient';
import type { BankTransferParamList } from './bank-transfer-param-list';

export function BankDetailsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BankTransferParamList>>();
  const params = useRoute<RouteProp<BankTransferParamList, 'BankDetails'>>().params;

  const corridor = corridorFor(params.currency, params.method as PaymentMethodCode);
  const step = corridor?.steps[1];

  const [values, setValues] = useState<FieldValues>(params.values);
  const [picker, setPicker] = useState<FieldPicker | undefined>(undefined);

  const { optionsBySource, labelOf, isComplete } = useCorridorStep(corridor, step, values);
  const currency = payoutCurrencies().find((candidate) => candidate.code === params.currency);

  return (
    <Screen
      avoidsKeyboard
      scroll
      footer={
        <Button
          label={t('common.continue')}
          disabled={!isComplete}
          onPress={() => {
            if (corridor === undefined || currency === undefined) return;

            navigation.navigate('Amount', {
              recipient: toPayoutRecipient(corridor, values, currency, labelOf),
              fundingToken: params.fundingToken,
              origin: params.origin,
            });
          }}
        />
      }
    >
      <VStack paddingX="lg" gap="lg">
        <ScreenHeader
          title={t(step?.titleKey ?? 'spend.bankDetails')}
          align="leading"
          onBack={() => {
            navigation.goBack();
          }}
        />

        {step !== undefined && (
          <CorridorForm
            fields={step.fields}
            values={values}
            optionsBySource={optionsBySource}
            onChange={(name, next) => {
              setValues((previous) => ({ ...previous, [name]: next }));
            }}
            onOpenPicker={(field, options) => {
              setPicker({ field, options });
            }}
          />
        )}
      </VStack>

      <CorridorFieldPicker
        picker={picker}
        selectedValue={picker === undefined ? '' : (values[picker.field.name] ?? '')}
        onSelect={(name, value) => {
          setValues((previous) => ({ ...previous, [name]: value }));
          setPicker(undefined);
        }}
        onClose={() => {
          setPicker(undefined);
        }}
      />
    </Screen>
  );
}
