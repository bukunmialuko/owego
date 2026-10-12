import { z } from 'zod';

const fxRateSchema = z.object({
  source_currency: z.string().default(''),
  destination_currency: z.string().default(''),
  rate: z.number().default(0),
  expire_at: z.string().default(''),
});

type FxRateDto = z.infer<typeof fxRateSchema>;

const EMPTY: FxRateDto = {
  source_currency: '',
  destination_currency: '',
  rate: 0,
  expire_at: '',
};

export const fxRateResponseSchema = z.object({
  data: fxRateSchema
    .nullable()
    .default(EMPTY)
    .transform((rate) => rate ?? EMPTY),
});
