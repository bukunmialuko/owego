import { unknownError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { Transaction } from '../../domain/entity/home-entity';
import type {
  TransactionDetailRepository,
  TransactionHistoryRepository,
  TransactionRepository,
  VerificationRepository,
} from '../../domain/repository/home-repository';
import { toTransactionDetail } from '../mapper/transaction-detail-mapper';
import { transactionSchema } from '../model/transaction-model';

export function createPreviewTransactionRepository(): TransactionRepository {
  const now = Date.now();

  return {
    getRecent: () => Promise.resolve(ok(previewTransactions(now))),
  };
}

export function createPreviewTransactionHistoryRepository(): TransactionHistoryRepository {
  const now = Date.now();

  return {
    getPage: (page, limit) => {
      const rows = page === 1 ? previewTransactions(now) : [];

      return Promise.resolve(ok({ transactions: rows, total: 3, pageSize: limit }));
    },
  };
}

function previewTransactions(now: number): Transaction[] {
  const minutesAgo = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  return [
    {
      id: 't1',
      status: 'completed',
      direction: 'incoming',
      amountMinor: 5000,
      currency: 'USD',
      narration: 'Money added via Apple Pay',
      title: 'Deposit',
      createdAt: minutesAgo(13),
    },
    {
      id: 't2',
      status: 'completed',
      direction: 'outgoing',
      amountMinor: 5000,
      currency: 'USD',
      narration: 'Hannah Nuggest',
      title: 'Transfer to Hannah',
      createdAt: minutesAgo(90),
    },
    {
      id: 't3',
      status: 'failed',
      direction: 'outgoing',
      amountMinor: 5000,
      currency: 'USD',
      narration: 'Precious Jameson',
      title: 'Transfer to Precious',
      createdAt: minutesAgo(220),
    },
  ];
}

const PREVIEW_RECEIPTS: Record<string, Record<string, unknown>> = {
  t1: {
    id: 't1',
    status: 'SUCCESSFUL',
    type: 'DEPOSIT',
    amount: 50,
    currency: 'USDC',
    network: 'SOL',
    tx_hash:
      'Wxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx2',
    meta_data: { source_address: 'Dxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx5' },
  },
  t2: {
    id: 't2',
    status: 'SUCCESSFUL',
    type: 'SWAP',
    amount: 37.17,
    usdc_amount: 50_000_000,
    rate: 0.7434,
    currency: 'GBP',
    recipient_name: 'Hannah Nuggest',
    recipient: {
      bank_account_information: {
        bank_country: 'GB',
        bank_name: 'Barclays',
        account_holder: 'HANNAH NUGGEST',
        account_number: '01235780381',
      },
    },
    tx_hash:
      '4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
    meta_data: { narration: 'For goods and services', usdc_total_fee: 0.25 },
  },
  t3: {
    id: 't3',
    status: 'FAILED',
    type: 'SWAP',
    amount: 69_245.48,
    usdc_amount: 50_000_000,
    rate: 1384.909515,
    currency: 'NGN',
    recipient_name: 'Precious Jameson',
    recipient: {
      bank_account_information: {
        bank_country: 'NG',
        bank_name: 'Access Bank',
        account_holder: 'PRECIOUS JAMESON',
        account_number: '0040295357',
      },
    },
  },
};

const PREVIEW_AGE_MINUTES: Record<string, number> = { t1: 13, t2: 90, t3: 220 };

export function createPreviewTransactionDetailRepository(): TransactionDetailRepository {
  const now = Date.now();

  return {
    getById(id) {
      const receipt = PREVIEW_RECEIPTS[id];
      if (receipt === undefined)
        return Promise.resolve(err(unknownError(`No preview receipt ${id}`)));

      const createdAt = new Date(now - (PREVIEW_AGE_MINUTES[id] ?? 0) * 60_000).toISOString();

      return Promise.resolve(
        ok(toTransactionDetail(transactionSchema.parse({ ...receipt, created_at: createdAt }))),
      );
    },
  };
}

export function createPreviewVerificationRepository(): VerificationRepository {
  let notice: 'verified' | undefined = 'verified';

  return {
    getNotice: () => Promise.resolve(ok(notice)),
    dismiss: () => {
      notice = undefined;

      return Promise.resolve(ok(undefined));
    },
  };
}
