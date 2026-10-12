import { transactionSchema } from '../model/transaction-model';
import { toTransactionDetail } from './transaction-detail-mapper';

const SIGNATURE =
  '4xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1';
const WALLET = 'Fxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx7';
const NO_RECIPIENT = '00000000-0000-0000-0000-000000000000';

function detail(overrides: Record<string, unknown> = {}) {
  return toTransactionDetail(transactionSchema.parse(overrides));
}

const NGN_SWAP = {
  id: '00000000-0000-4000-8000-000000000007',
  status: 'SUCCESSFUL',
  type: 'SWAP',
  usdc_amount: 90_258,
  rate: 1384.909515,
  recipient_id: '00000000-0000-4000-8000-000000000005',
  recipient_name: '',
  recipient: {
    bank_account_information: {
      bank_country: 'NG',
      bank_name: '',
      account_holder: 'JOHN DOE',
      account_number: '0000000001',
    },
  },
  currency: 'NGN',
  tx_hash: SIGNATURE,
  meta_data: { wallet_address: WALLET },
  created_at: '2026-03-13T13:59:22.052231Z',
  amount: 125,
};

describe('toTransactionDetail', () => {
  describe('amounts', () => {
    it('reads usdc_amount as micro-USDC and pairs it with the local amount', () => {
      const d = detail(NGN_SWAP);

      expect(d.amount).toEqual({ minor: 9, currency: 'USD' });
      expect(d.localAmount).toEqual({ minor: 12_500, currency: 'NGN' });
      expect(d.rate).toBe(1384.909515);
    });

    it('rounds micro-USDC to the nearest cent', () => {
      expect(detail({ ...NGN_SWAP, usdc_amount: 90_500, amount: 125.33 }).amount.minor).toBe(9);
      expect(detail({ ...NGN_SWAP, usdc_amount: 95_000, amount: 131.57 }).amount.minor).toBe(10);
    });

    it('shows a dollar transaction as one figure', () => {
      const d = detail({ currency: 'USDC', amount: 0.09, usdc_amount: 90_000, rate: 0 });

      expect(d.amount).toEqual({ minor: 9, currency: 'USD' });
      expect(d.localAmount).toBeUndefined();
      expect(d.rate).toBeUndefined();
    });

    it.each(['USD', 'usdc', 'USDT'])('treats %s as dollars', (currency) => {
      expect(detail({ currency, amount: 15 }).amount).toEqual({ minor: 1500, currency: 'USD' });
    });

    it('falls back to the local amount when no dollar amount is carried', () => {
      const d = detail({ ...NGN_SWAP, usdc_amount: 0 });

      expect(d.amount).toEqual({ minor: 12_500, currency: 'NGN' });
      expect(d.localAmount).toBeUndefined();
      expect(d.rate).toBeUndefined();
    });

    it('drops the dollar figure and the rate when they do not agree with the amount', () => {
      const d = detail({ ...NGN_SWAP, rate: 1 / 1384.909515 });

      expect(d.amount).toEqual({ minor: 12_500, currency: 'NGN' });
      expect(d.localAmount).toBeUndefined();
      expect(d.rate).toBeUndefined();
    });

    it('drops a dollar figure in the wrong unit', () => {
      expect(detail({ ...NGN_SWAP, usdc_amount: 0.090258 }).localAmount).toBeUndefined();
    });

    it('rounds the local amount half up to minor units', () => {
      expect(detail({ currency: 'NGN', amount: 0.005 }).amount.minor).toBe(1);
    });
  });

  describe('fee', () => {
    it('shows the fee the payload itemises, in dollars', () => {
      expect(detail({ ...NGN_SWAP, meta_data: { usdc_total_fee: 0.25 } }).fee).toEqual({
        minor: 25,
        currency: 'USD',
      });
    });

    it('shows no fee when the payload carries none', () => {
      expect(detail(NGN_SWAP).fee).toBeUndefined();
    });
  });

  describe('narration', () => {
    it('prefers meta_data.narration, as v1 does', () => {
      expect(
        detail({ narration: 'top level', meta_data: { narration: 'For goods and services' } })
          .narration,
      ).toBe('For goods and services');
    });

    it('falls back to the top-level narration', () => {
      expect(detail({ narration: 'Rent payment' }).narration).toBe('Rent payment');
    });

    it('has none when both are blank', () => {
      expect(detail({ narration: '  ', meta_data: { narration: '' } }).narration).toBeUndefined();
    });
  });

  describe('status', () => {
    it.each([
      ['SUCCESSFUL', 'successful'],
      ['success', 'successful'],
      ['COMPLETED', 'successful'],
      ['PROCESSING', 'processing'],
      ['PENDING', 'pending'],
      ['CREATED', 'pending'],
      ['FAILED', 'failed'],
      ['FAILURE', 'failed'],
      ['CANCELLED', 'cancelled'],
      ['REFUND_QUEUED', 'pending'],
    ])('reads %s as %s', (status, expected) => {
      expect(detail({ status }).status).toBe(expected);
    });
  });

  describe('direction', () => {
    it.each([
      ['SWAP', 'outgoing'],
      ['DEBIT', 'outgoing'],
      ['DEPOSIT', 'incoming'],
      ['CREDIT', 'incoming'],
      ['INVOICE', 'incoming'],
      ['SOMETHING_NEW', 'outgoing'],
    ])('reads %s as %s', (type, expected) => {
      expect(detail({ type }).direction).toBe(expected);
    });
  });

  describe('kind', () => {
    it('reads money arriving as received', () => {
      expect(detail({ type: 'DEPOSIT', meta_data: { source_address: WALLET } }).kind).toBe(
        'receive',
      );
    });

    it('reads money leaving for a bank account as a payout', () => {
      expect(detail(NGN_SWAP).kind).toBe('payout');
    });

    it('reads money leaving for a wallet as a send', () => {
      expect(
        detail({
          type: 'TRANSFER',
          meta_data: { destination_address: 'Exxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx6' },
        }).kind,
      ).toBe('send');
    });

    it('reads an outgoing transaction with no counterparty as a send', () => {
      expect(detail({ type: 'DEBIT' }).kind).toBe('send');
    });
  });

  describe('counterparty', () => {
    it('names a bank payout by its account holder', () => {
      expect(detail(NGN_SWAP).counterparty).toEqual({
        kind: 'bank',
        name: 'JOHN DOE',
        bankName: '',
        accountNumber: '0000000001',
        countryCode: 'NG',
      });
    });

    it('prefers recipient_name to the account holder', () => {
      const d = detail({ ...NGN_SWAP, recipient_name: 'Hannah Nuggest' });

      expect(d.counterparty).toMatchObject({ kind: 'bank', name: 'Hannah Nuggest' });
    });

    it('carries no flag for a country code it cannot read', () => {
      const d = detail({
        ...NGN_SWAP,
        recipient: { bank_account_information: { account_number: '1', bank_country: 'NGA' } },
      });

      expect(d.counterparty).toMatchObject({ kind: 'bank', countryCode: undefined });
    });

    it('names the destination wallet of an outgoing transfer', () => {
      const d = detail({
        type: 'TRANSFER',
        network: 'SOL',
        meta_data: { destination_address: 'Exxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx6' },
      });

      expect(d.counterparty).toEqual({
        kind: 'wallet',
        address: 'Exxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx6',
        network: 'SOL',
      });
    });

    it('names the source wallet of a deposit and never the user’s own', () => {
      expect(
        detail({ type: 'DEPOSIT', meta_data: { source_address: WALLET } }).counterparty,
      ).toMatchObject({ kind: 'wallet', address: WALLET });
      expect(
        detail({ type: 'DEPOSIT', meta_data: { wallet_address: WALLET } }).counterparty,
      ).toBeUndefined();
    });

    it('does not present an id as an address', () => {
      expect(detail({ type: 'DEBIT', recipient_id: NO_RECIPIENT }).counterparty).toBeUndefined();
      expect(
        detail({ type: 'DEBIT', recipient_id: '00000000-0000-4000-8000-000000000005' })
          .counterparty,
      ).toBeUndefined();
    });

    it('accepts an EVM address', () => {
      const address = '0x98aef800000000000000000000000000bAB89ab0';

      expect(
        detail({ type: 'TRANSFER', meta_data: { destination_address: address } }).counterparty,
      ).toMatchObject({ kind: 'wallet', address });
    });
  });

  describe('signature', () => {
    it('takes the on-chain signature', () => {
      expect(detail(NGN_SWAP).signature).toBe(SIGNATURE);
    });

    it('falls back to an id that is itself a signature', () => {
      expect(detail({ id: SIGNATURE, tx_hash: '' }).signature).toBe(SIGNATURE);
    });

    it('has none before the transfer is on chain', () => {
      expect(detail({ ...NGN_SWAP, tx_hash: '' }).signature).toBeUndefined();
    });

    it('refuses a hash that is not a Solana signature', () => {
      expect(detail({ tx_hash: `0x${'a'.repeat(64)}` }).signature).toBeUndefined();
    });
  });

  it('keeps the id and the timestamp as sent', () => {
    const d = detail(NGN_SWAP);

    expect(d.id).toBe('00000000-0000-4000-8000-000000000007');
    expect(d.createdAt).toBe('2026-03-13T13:59:22.052231Z');
  });
});
