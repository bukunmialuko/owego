import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { HStack, SelectField, TextField, VStack } from '@/shared/ui';
import {
  optionLabel,
  type FieldDescriptor,
  type FieldOption,
  type FieldOptionSource,
} from '../../domain/entity/beneficiary-form';
import type { FieldValues } from '../../domain/corridor/corridor-spec';
import type { AccountResolution } from '../hook/use-account-resolution';

type OptionsBySource = Readonly<Partial<Record<FieldOptionSource, readonly FieldOption[]>>>;

type Props = {
  fields: readonly FieldDescriptor[];
  values: FieldValues;
  optionsBySource: OptionsBySource;
  resolution?: AccountResolution;
  errors?: Readonly<Record<string, string>>;
  onChange: (name: string, value: string) => void;
  onOpenPicker: (field: FieldDescriptor, options: readonly FieldOption[]) => void;
};

export function CorridorForm({
  fields,
  values,
  optionsBySource,
  resolution,
  errors,
  onChange,
  onOpenPicker,
}: Props) {
  const { t } = useTranslation();

  return (
    <VStack gap="md">
      {pairRows(fields).map((row) => (
        <HStack key={row.map((field) => field.name).join('-')} gap="md" align="flex-start">
          {row.map((field) => (
            <VStack key={field.name} style={styles.cell}>
              <Field
                field={field}
                value={values[field.name] ?? ''}
                options={optionsFor(field, optionsBySource)}
                translate={t}
                {...(resolution === undefined ? {} : { resolution })}
                {...(errors?.[field.name] === undefined ? {} : { error: errors[field.name] })}
                onChange={onChange}
                onOpenPicker={onOpenPicker}
              />
            </VStack>
          ))}
        </HStack>
      ))}
    </VStack>
  );
}

function Field({
  field,
  value,
  options,
  translate,
  resolution,
  error,
  onChange,
  onOpenPicker,
}: {
  field: FieldDescriptor;
  value: string;
  options: readonly FieldOption[];
  translate: TFunction;
  resolution?: AccountResolution;
  error?: string;
  onChange: (name: string, next: string) => void;
  onOpenPicker: (field: FieldDescriptor, options: readonly FieldOption[]) => void;
}) {
  const label = translate(field.labelKey);

  if (field.derived === true) {
    return (
      <TextField
        label={label}
        labelPlacement="inside"
        editable={false}
        value={resolution?.value ?? ''}
        placeholder={resolution?.status === 'pending' ? translate('spend.resolvingAccount') : label}
        {...(resolution?.status === 'notFound'
          ? { errorMessage: translate('spend.accountNotResolved') }
          : {})}
        {...(resolution?.status === 'failed'
          ? {
              errorMessage: translate('spend.accountCheckFailed'),
              trailingAction: {
                label: translate('spend.accountCheckRetry'),
                onPress: resolution.retry,
              },
            }
          : {})}
      />
    );
  }

  if (field.kind === 'select') {
    const selected = options.find((option) => option.value === value);

    return (
      <SelectField
        label={label}
        labelPlacement="inside"
        isRequired={field.required}
        placeholder={label}
        {...(selected === undefined ? {} : { value: optionLabel(selected, translate) })}
        onPress={() => {
          onOpenPicker(field, options);
        }}
      />
    );
  }

  const problem =
    error ??
    (field.pattern !== undefined && value !== '' && !new RegExp(field.pattern.regex).test(value)
      ? translate(field.pattern.messageKey)
      : undefined);

  return (
    <TextField
      label={label}
      labelPlacement="inside"
      isRequired={field.required}
      placeholder={field.placeholderKey === undefined ? label : translate(field.placeholderKey)}
      value={value}
      keyboardType={keyboardFor(field.kind)}
      autoCapitalize={
        field.capitalize ?? (field.kind === 'email' || field.kind === 'number' ? 'none' : 'words')
      }
      autoCorrect={false}
      {...(problem === undefined ? {} : { errorMessage: problem })}
      onChangeText={(next) => {
        onChange(field.name, next);
      }}
    />
  );
}

function optionsFor(
  field: FieldDescriptor,
  optionsBySource: OptionsBySource,
): readonly FieldOption[] {
  if (field.options !== undefined) return field.options;
  if (field.optionsFrom === undefined) return [];

  return optionsBySource[field.optionsFrom] ?? [];
}

function pairRows(fields: readonly FieldDescriptor[]): FieldDescriptor[][] {
  const rows: FieldDescriptor[][] = [];

  for (const field of fields) {
    const last = rows.at(-1);

    if (field.width === 'half' && last?.length === 1 && last[0]?.width === 'half') {
      last.push(field);
      continue;
    }

    rows.push([field]);
  }

  return rows;
}

function keyboardFor(kind: FieldDescriptor['kind']) {
  switch (kind) {
    case 'email':
      return 'email-address' as const;
    case 'phone':
      return 'phone-pad' as const;
    case 'number':
      return 'number-pad' as const;
    case 'text':
    case 'select':
      return 'default' as const;
  }
}

const styles = { cell: { flex: 1 } } as const;
