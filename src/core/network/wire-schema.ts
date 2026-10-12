import { z } from 'zod';

export const wireText = (fallback = '') =>
  z
    .string()
    .nullable()
    .default(fallback)
    .transform((value) => value ?? fallback);

export const wireInteger = (fallback = 0) =>
  z
    .number()
    .int()
    .nullable()
    .default(fallback)
    .transform((value) => value ?? fallback);

export const wireNumber = (fallback = 0) =>
  z
    .number()
    .nullable()
    .default(fallback)
    .transform((value) => value ?? fallback);

export const wireOptionalNumber = () =>
  z
    .number()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined);

export function wireList<T extends z.ZodType>(item: T) {
  return z
    .array(item)
    .nullable()
    .default([])
    .transform((items) => items ?? []);
}
