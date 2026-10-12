import { z } from 'zod';
import { text } from './wire-text';

const bankAccountSchema = z.object({
  bank_country: text,
  bank_name: text,
  bank_code: text,
  account_holder: z
    .union([z.string(), z.boolean(), z.number()])
    .nullable()
    .default('')
    .transform((value) => (typeof value === 'string' ? value : '')),
  swift_number: text,
  account_number: text,
  payment_method: text,
  account_type: text,
});

const contactSchema = z.object({
  contact_country: text,
  state: text,
  city: text,
  address: text,
  zip_code: text,
  email: text,
});

const BLANK_BANK_ACCOUNT = bankAccountSchema.parse({});
const BLANK_CONTACT = contactSchema.parse({});

const qrStringOfMetaData = z
  .unknown()
  .optional()
  .transform((value) => {
    if (typeof value !== 'object' || value === null || !('qr_string' in value)) return '';
    const { qr_string: qrString } = value;

    return typeof qrString === 'string' ? qrString : '';
  });

const recipientSchema = z.object({
  id: z
    .union([z.string(), z.number()])
    .nullable()
    .default('')
    .transform((value) => (value === null ? '' : String(value))),
  bank_account_information: bankAccountSchema
    .nullable()
    .default(BLANK_BANK_ACCOUNT)
    .transform((value) => value ?? BLANK_BANK_ACCOUNT),
  contact_information: contactSchema
    .nullable()
    .default(BLANK_CONTACT)
    .transform((value) => value ?? BLANK_CONTACT),
  beneficiary_type: text,
  meta_data: qrStringOfMetaData,
  created_at: text,
  updated_at: text,
});

export type RecipientDto = z.infer<typeof recipientSchema>;

const BLANK_RECIPIENT = recipientSchema.parse({});

export const recipientPageResponseSchema = z.object({
  data: z
    .array(recipientSchema)
    .nullable()
    .default([])
    .transform((rows) => rows ?? []),
  meta: z
    .object({ next: text })
    .nullable()
    .optional()
    .transform((meta) => meta ?? undefined),
});

export const recipientResponseSchema = z.object({
  data: recipientSchema
    .nullable()
    .default(BLANK_RECIPIENT)
    .transform((recipient) => recipient ?? BLANK_RECIPIENT),
});

export const removeRecipientResponseSchema = z.object({
  error: z
    .boolean()
    .nullable()
    .default(false)
    .transform((value) => value ?? false),
});
