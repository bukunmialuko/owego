import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, Screen, ScreenHeader, VStack } from '@/shared/ui';
import type { FieldValues } from '../../domain/corridor/corridor-spec';
import { corridorNamed } from '../../domain/corridor/registry';
import { useCorridorStep } from '../hook/use-corridor-step';
import { CorridorFieldPicker, type FieldPicker } from '../widget/corridor-field-picker';
import { CorridorForm } from '../widget/corridor-form';
import { useSaveAndReturn } from './hook/use-save-and-return';
import { SaveNoticeBanner } from './widget/save-notice-banner';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

export function AddBankDetailsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BeneficiariesParamList>>();
  const params = useRoute<RouteProp<BeneficiariesParamList, 'AddBankDetails'>>().params;

  const named = corridorNamed(params.currency, params.method);
  const corridor = named?.beneficiary?.saveable === true ? named : undefined;
  const step = corridor?.beneficiary?.steps[1];

  const [values, setValues] = useState<FieldValues>(params.values);
  const [picker, setPicker] = useState<FieldPicker | undefined>(undefined);
  const { optionsBySource, labelOf, isComplete } = useCorridorStep(corridor, step, values);
  const { submit, isSaving, notice } = useSaveAndReturn('bank');

  return (
    <Screen
      avoidsKeyboard
      scroll
      footer={
        <Button
          label={t('spend.beneficiaries.save')}
          disabled={corridor === undefined || !isComplete || isSaving}
          isLoading={isSaving}
          onPress={() => {
            if (corridor !== undefined) submit(corridor, values, labelOf);
          }}
        />
      }
    >
      <VStack paddingX="lg" gap="lg">
        <ScreenHeader
          title={t(step?.titleKey ?? 'spend.bankDetails')}
          onBack={() => {
            navigation.goBack();
          }}
        />

        <SaveNoticeBanner notice={notice} />

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
