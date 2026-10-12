import type { PaymentMethodCode } from './beneficiary-form';

export type RecipientContact = {
  country: string;
  state: string;
  city: string;
  address: string;
  zipCode: string;
  email: string;
};

export type RecipientFields = {
  bankCountry: string;
  bankName: string;
  bankCode: string;
  accountHolder: string;
  swiftNumber: string;
  accountNumber: string;
  paymentMethod: string;
  accountType: string;
  contact: RecipientContact;
};

type CorridorRef = {
  currency: string;
  method: PaymentMethodCode;
};

export type RecipientRecord = {
  id: string;
  fields: RecipientFields;
  createdAt: string;
  updatedAt: string;
  merchantCode?: string;
};

type BeneficiaryCommon = RecipientRecord;

export type BankBeneficiary = BeneficiaryCommon & {
  kind: 'bank';
  name: string;
  institution: string;
  reference: string;
  countryCode?: string;
  corridor?: CorridorRef;
};

export type WalletBeneficiary = BeneficiaryCommon & {
  kind: 'wallet';
  tag: string;
  address: string;
  networkCode: string;
  networkName: string;
};

export type MerchantBeneficiary = BeneficiaryCommon & {
  kind: 'merchant';
  merchantName: string;
  qrString: string;
  currency: string;
  countryCode?: string;
};

export type Beneficiary = BankBeneficiary | WalletBeneficiary | MerchantBeneficiary;

export const BLANK_RECIPIENT_FIELDS: RecipientFields = {
  bankCountry: '',
  bankName: '',
  bankCode: '',
  accountHolder: '',
  swiftNumber: '',
  accountNumber: '',
  paymentMethod: '',
  accountType: '',
  contact: { country: '', state: '', city: '', address: '', zipCode: '', email: '' },
};
