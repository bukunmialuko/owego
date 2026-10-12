import type { BeneficiaryTab } from '../../domain/beneficiary/filter-beneficiaries';

type ScannedAddress = {
  address: string;
  networkCode?: string;
  nonce: number;
};

export type BeneficiariesParamList = {
  List: { tab?: BeneficiaryTab } | undefined;
  Details: { beneficiaryId: string };
  AddBank: { currency?: string } | undefined;
  AddBankDetails: { currency: string; method: string; values: Record<string, string> };
  AddWallet: { scanned?: ScannedAddress } | undefined;
  ScanAddress: undefined;
  ScanMerchant: undefined;
  AddMerchant: { qrString: string };
};
