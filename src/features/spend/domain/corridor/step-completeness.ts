import type { FieldDescriptor } from '../entity/beneficiary-form';
import type { FieldValues } from './corridor-spec';

export function isStepComplete(fields: readonly FieldDescriptor[], values: FieldValues): boolean {
  return fields.every((field) => isFieldComplete(field, values[field.name] ?? ''));
}

function isFieldComplete(field: FieldDescriptor, value: string): boolean {
  if (field.derived === true) return true;
  if (!field.required && value === '') return true;
  if (value.trim() === '') return false;

  return matchesPattern(field, value);
}

export function isFieldFilled(field: FieldDescriptor, value: string): boolean {
  if (value.trim() === '') return false;

  return matchesPattern(field, value);
}

function matchesPattern(field: FieldDescriptor, value: string): boolean {
  return field.pattern === undefined || new RegExp(field.pattern.regex).test(value);
}
