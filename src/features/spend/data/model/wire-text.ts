import { z } from 'zod';

export const text = z
  .string()
  .nullable()
  .default('')
  .transform((value) => value ?? '');
