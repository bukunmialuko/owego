import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BeneficiaryTab } from '../../../domain/beneficiary/filter-beneficiaries';
import type { CorridorSpec, FieldValues } from '../../../domain/corridor/corridor-spec';
import { useBeneficiaryDirectory, useSaveBeneficiary } from '../../hook/use-beneficiaries';
import { beneficiaryTitle } from '../../widget/beneficiary-text';
import type { BeneficiariesParamList } from '../beneficiaries-param-list';

export type SaveNotice = { kind: 'duplicate'; name: string } | { kind: 'failed' };

export function useSaveAndReturn(tab: BeneficiaryTab) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<BeneficiariesParamList>>();
  const directory = useBeneficiaryDirectory();
  const save = useSaveBeneficiary();
  const [notice, setNotice] = useState<SaveNotice | undefined>(undefined);

  function submit(corridor: CorridorSpec, values: FieldValues, labelOf: (name: string) => string) {
    if (save.isPending) return;

    setNotice(undefined);
    save.mutate(
      { corridor, values, labelOf, existing: directory.data ?? [] },
      {
        onSuccess: (outcome) => {
          if (outcome.kind === 'saved') {
            navigation.popTo('List', { tab });
            return;
          }

          setNotice({ kind: 'duplicate', name: beneficiaryTitle(outcome.existing, t) });
        },
        onError: () => {
          setNotice({ kind: 'failed' });
        },
      },
    );
  }

  return { submit, isSaving: save.isPending, notice };
}
