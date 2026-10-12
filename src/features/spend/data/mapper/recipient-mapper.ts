import type { RecipientFields, RecipientRecord } from '../../domain/entity/beneficiary';
import type { RecipientDto } from '../model/recipient-model';

export function toRecipientRecord(dto: RecipientDto): RecipientRecord {
  const bank = dto.bank_account_information;
  const contact = dto.contact_information;
  const isQr = dto.beneficiary_type.trim().toLowerCase() === 'qr';
  const merchantCode = dto.meta_data === '' ? bank.account_number : dto.meta_data;

  return {
    id: dto.id,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    ...(isQr && merchantCode !== '' ? { merchantCode } : {}),
    fields: {
      bankCountry: bank.bank_country.trim().toLowerCase(),
      bankName: bank.bank_name,
      bankCode: bank.bank_code,
      accountHolder: bank.account_holder,
      swiftNumber: bank.swift_number,
      accountNumber: bank.account_number,
      paymentMethod: bank.payment_method,
      accountType: bank.account_type.trim().toLowerCase(),
      contact: {
        country: contact.contact_country.trim().toLowerCase(),
        state: contact.state,
        city: contact.city,
        address: contact.address,
        zipCode: contact.zip_code,
        email: contact.email,
      },
    },
  };
}

export function toCreateRecipientBody(fields: RecipientFields) {
  return {
    bank_account_information: {
      bank_country: fields.bankCountry.toUpperCase(),
      bank_name: fields.bankName,
      bank_code: fields.bankCode,
      account_holder: fields.accountHolder,
      swift_number: fields.swiftNumber,
      account_number: fields.accountNumber,
      ...(fields.paymentMethod === '' ? {} : { payment_method: fields.paymentMethod }),
      ...(fields.accountType === '' ? {} : { account_type: fields.accountType.toUpperCase() }),
    },
    contact_information: {
      contact_country: fields.contact.country.toUpperCase(),
      state: fields.contact.state,
      city: fields.contact.city,
      address: fields.contact.address,
      zip_code: fields.contact.zipCode,
      email: fields.contact.email,
    },
  };
}

export type CreateRecipientBody = ReturnType<typeof toCreateRecipientBody>;

export function toCreateQrRecipientBody({ qrString }: { qrString: string }) {
  return { beneficiary_type: 'qr', meta_data: { qr_string: qrString } } as const;
}

export type CreateQrRecipientBody = ReturnType<typeof toCreateQrRecipientBody>;
