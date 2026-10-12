import { z } from 'zod';

const text = z
  .string()
  .nullable()
  .default('')
  .transform((value) => value ?? '');

const figure = z
  .number()
  .nullable()
  .default(0)
  .transform((value) => value ?? 0);

const bankAccountSchema = z.object({
  bank_country: text,
  bank_name: text,
  account_holder: text,
  account_number: text,
});

const BLANK_BANK_ACCOUNT = bankAccountSchema.parse({});

const transactionRecipientSchema = z.object({
  bank_account_information: bankAccountSchema
    .nullable()
    .default(BLANK_BANK_ACCOUNT)
    .transform((value) => value ?? BLANK_BANK_ACCOUNT),
});

const BLANK_RECIPIENT = transactionRecipientSchema.parse({});

const transactionMetaSchema = z.object({
  source_address: text,
  destination_address: text,
  wallet_address: text,
  narration: text,
  usdc_total_fee: figure,
});

const BLANK_META = transactionMetaSchema.parse({});

export const transactionSchema = z.object({
  id: text,
  user_id: text,
  status: text,
  type: text,
  amount: figure,
  usdc_amount: figure,
  rate: figure,
  recipient_id: text,
  recipient_name: text,
  recipient: transactionRecipientSchema
    .nullable()
    .default(BLANK_RECIPIENT)
    .transform((value) => value ?? BLANK_RECIPIENT),
  currency: text,
  narration: text,
  network: text,
  tx_hash: text,
  created_at: text,
  updated_at: text,
  meta_data: transactionMetaSchema
    .nullable()
    .default(BLANK_META)
    .transform((value) => value ?? BLANK_META),
});

export type TransactionDto = z.infer<typeof transactionSchema>;

const BLANK_TRANSACTION = transactionSchema.parse({});

export const transactionListResponseSchema = z.object({
  data: z
    .object({
      data: z.array(transactionSchema).default([]),
      total: z.number().default(0),
      page: z.number().default(1),
      limit: z.number().default(0),
    })
    .default({ data: [], total: 0, page: 1, limit: 0 }),
});

export type TransactionPageDto = z.infer<typeof transactionListResponseSchema>['data'];

export const transactionDetailResponseSchema = z.object({
  data: transactionSchema
    .nullable()
    .default(BLANK_TRANSACTION)
    .transform((value) => value ?? BLANK_TRANSACTION),
});
