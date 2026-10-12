import { z } from 'zod';

const paymentMethodSchema = z.enum(['bank', 'mobile_money', 'zelle', 'qr_scan']);
/** @public */
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

const displayCurrencySchema = z.object({
  code: z.string().default(''),
  name: z.string().default(''),
  country_code: z.string().default(''),
});

export type DisplayCurrencyDto = z.infer<typeof displayCurrencySchema>;

export const displayCurrencyListSchema = z.array(displayCurrencySchema);

const currencySchema = z.object({
  name: z.string().default(''),
  code: z.string().default(''),
  country_code: z.string().default(''),
  continent: z.string().default(''),
  symbol: z.string().default(''),
  payment_method: paymentMethodSchema,
  min_amount: z.number().nullable().default(null),
  max_amount: z.number().nullable().default(null),
  coming_soon: z.boolean().default(false),
});

export type CurrencyDto = z.infer<typeof currencySchema>;

const countrySchema = z.object({
  name: z.string().default(''),
  code: z.string().default(''),
});

export type CountryDto = z.infer<typeof countrySchema>;

export const chainSchema = z.object({
  key: z.string().default(''),
  blockchain: z.string().default(''),
  enabled: z.boolean().default(true),
});

export type ChainDto = z.infer<typeof chainSchema>;

const networkSchema = z.object({
  name: z.string().default(''),
  code: z.string().default(''),
});

export type NetworkDto = z.infer<typeof networkSchema>;

export const currencyListSchema = z.array(currencySchema);
export const countryListSchema = z.array(countrySchema);
export const networkListSchema = z.array(networkSchema);
export const chainListSchema = z.array(chainSchema);
