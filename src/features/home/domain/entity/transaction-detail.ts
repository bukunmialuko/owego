import type { TransactionDirection } from './home-entity';

export type TransactionDetailStatus =
  'successful' | 'processing' | 'pending' | 'failed' | 'cancelled';

export type Figure = { minor: number; currency: string };

export type Counterparty =
  | {
      kind: 'bank';
      name: string;
      bankName: string;
      accountNumber: string;
      countryCode: string | undefined;
    }
  | {
      kind: 'wallet';
      address: string;
      network: string;
    };

export type TransactionKind = 'payout' | 'send' | 'receive';

export type TransactionDetail = {
  id: string;
  status: TransactionDetailStatus;
  direction: TransactionDirection;
  kind: TransactionKind;
  amount: Figure;
  localAmount: Figure | undefined;
  rate: number | undefined;
  fee: Figure | undefined;
  narration: string | undefined;
  createdAt: string;
  counterparty: Counterparty | undefined;
  signature: string | undefined;
};
