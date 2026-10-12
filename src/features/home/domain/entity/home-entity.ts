export type TransactionDirection = 'incoming' | 'outgoing';

export type TransactionStatus = 'completed' | 'pending' | 'failed';

export type Transaction = {
  id: string;
  status: TransactionStatus;
  direction: TransactionDirection;
  amountMinor: number;
  currency: string;
  narration: string;
  createdAt: string;
  title: string;
};

export type VerificationNotice = 'verified' | 'pending' | 'rejected';
