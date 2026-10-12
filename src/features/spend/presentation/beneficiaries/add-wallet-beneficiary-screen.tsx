import { useState } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Button, IconButton, Screen, ScreenHeader, VStack } from '@/shared/ui';
import ScanGlyph from '@/assets/icons/scan.svg';
import type { FieldValues } from '../../domain/corridor/corridor-spec';
import { walletBeneficiaryCorridor } from '../../domain/corridor/registry';
import { useCorridorStep } from '../hook/use-corridor-step';
import { CorridorFieldPicker, type FieldPicker } from '../widget/corridor-field-picker';
import { CorridorForm } from '../widget/corridor-form';
import { useSaveAndReturn } from './hook/use-save-and-return';
import { SaveNoticeBanner } from './widget/save-notice-banner';
import type { BeneficiariesParamList } from './beneficiaries-param-list';

export function AddWalletBeneficiaryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BeneficiariesParamList>>();
  const scanned = useRoute<RouteProp<BeneficiariesParamList, 'AddWallet'>>().params?.scanned;

  const corridor = walletBeneficiaryCorridor();
  const block = corridor.beneficiary;
  const step = block?.steps[0];

  const [values, setValues] = useState<FieldValues>({});
  const [hasEditedAddress, setHasEditedAddress] = useState(false);
  const [appliedScan, setAppliedScan] = useState<number | undefined>(undefined);
  const [picker, setPicker] = useState<FieldPicker | undefined>(undefined);
  const { optionsBySource, labelOf, isComplete } = useCorridorStep(corridor, step, values);
  const { submit, isSaving, notice } = useSaveAndReturn('wallet');

  if (scanned !== undefined && scanned.nonce !== appliedScan) {
    setAppliedScan(scanned.nonce);
    setValues((previous) => ({
      ...previous,
      walletAddress: scanned.address,
      ...(scanned.networkCode === undefined ? {} : { network: scanned.networkCode }),
    }));
    setHasEditedAddress(true);
  }

  const problem = block?.validate?.(values);
  const errors =
    problem === undefined || !hasEditedAddress
      ? undefined
      : { [problem.field]: t(problem.messageKey, { network: labelOf('network') }) };

  return (
    <Screen
      avoidsKeyboard
      scroll
      footer={
        <Button
          label={t('spend.beneficiaries.saveAddress')}
          disabled={!isComplete || problem !== undefined || isSaving}
          isLoading={isSaving}
          onPress={() => {
            submit(corridor, values, labelOf);
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
          trailing={
            <IconButton
              label={t('spend.scanAddress')}
              glyph={ScanGlyph}
              tone="surface"
              color="brand"
              onPress={() => {
                navigation.navigate('ScanAddress');
              }}
            />
          }
        />

        <SaveNoticeBanner notice={notice} />

        {step !== undefined && (
          <CorridorForm
            fields={step.fields}
            values={values}
            optionsBySource={optionsBySource}
            {...(errors === undefined ? {} : { errors })}
            onChange={(name, next) => {
              setValues((previous) => ({ ...previous, [name]: next }));
              if (name === 'walletAddress') setHasEditedAddress(true);
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
