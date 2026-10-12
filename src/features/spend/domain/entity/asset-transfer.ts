export type AssetNetwork = {
  code: string;
  name: string;
  networkLabel: string;
  isEnabled: boolean;
};

export type TransferRecipient = {
  address: string;
  tokenSymbol: string;
  networkCode: string;
  networkName: string;
};

export type TransferQuote = {
  totalMinor: number;
  feeMinor: number;
  recipientGetsMinor: number;
  currency: string;
};
