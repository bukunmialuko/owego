import { useTranslation } from 'react-i18next';
import { payoutCurrencies } from '../../domain/corridor/registry';
import { isFieldFilled, isStepComplete } from '../../domain/corridor/step-completeness';
import { optionLabel } from '../../domain/entity/beneficiary-form';
import type { CorridorSpec, FieldStep, FieldValues } from '../../domain/corridor/corridor-spec';
import { useAccountResolution } from './use-account-resolution';
import { optionSourcesOf, useFieldOptions } from './use-field-options';

export function useCorridorStep(
  corridor: CorridorSpec | undefined,
  step: FieldStep | undefined,
  values: FieldValues,
) {
  const { t } = useTranslation();
  const fields = step?.fields ?? [];

  const currency =
    corridor === undefined
      ? undefined
      : payoutCurrencies().find((candidate) => candidate.code === corridor.currency);
  const { optionsBySource } = useFieldOptions(
    optionSourcesOf(fields),
    currency?.country_code ?? '',
  );

  const labelOf = (name: string) => {
    const field = fields.find((candidate) => candidate.name === name);
    const options =
      field?.options ??
      (field?.optionsFrom === undefined ? undefined : optionsBySource[field.optionsFrom]) ??
      [];
    const chosen = options.find((option) => option.value === values[name]);

    return chosen === undefined ? (values[name] ?? '') : optionLabel(chosen, t);
  };

  const verification = corridor?.verification;
  const verifiesHere =
    verification !== undefined &&
    verification.dependsOn.every((name) => fields.some((field) => field.name === name));

  const resolution = useAccountResolution(
    verifiesHere ? verification : undefined,
    values,
    (name) => {
      const field = fields.find((candidate) => candidate.name === name);

      return field !== undefined && isFieldFilled(field, values[name] ?? '');
    },
  );

  const isComplete =
    step !== undefined &&
    isStepComplete(step.fields, values) &&
    (!verifiesHere || resolution.status === 'resolved');

  const filled: FieldValues =
    verifiesHere && verification !== undefined && resolution.value !== undefined
      ? { ...values, [verification.resolves]: resolution.value }
      : values;

  return {
    optionsBySource,
    labelOf,
    ...(verifiesHere ? { resolution } : {}),
    isComplete,
    filled,
  };
}
