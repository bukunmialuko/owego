import { useTranslation } from 'react-i18next';
import { SelectSheet } from '@/shared/ui';
import {
  optionLabel,
  type FieldDescriptor,
  type FieldOption,
} from '../../domain/entity/beneficiary-form';

export type FieldPicker = { field: FieldDescriptor; options: readonly FieldOption[] };

type Props = {
  picker: FieldPicker | undefined;
  selectedValue: string;
  onSelect: (name: string, value: string) => void;
  onClose: () => void;
};

export function CorridorFieldPicker({ picker, selectedValue, onSelect, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <SelectSheet
      isOpen={picker !== undefined}
      title={picker === undefined ? '' : t(picker.field.labelKey)}
      closeLabel={t('common.close')}
      emptyMessage={t('common.noItemsFound')}
      searchPlaceholder={t('spend.searchBeneficiaries')}
      selectedId={selectedValue}
      options={
        picker === undefined
          ? []
          : picker.options.map((option) => ({ id: option.value, title: optionLabel(option, t) }))
      }
      onSelect={(value) => {
        if (picker !== undefined) onSelect(picker.field.name, value);
      }}
      onClose={onClose}
    />
  );
}
