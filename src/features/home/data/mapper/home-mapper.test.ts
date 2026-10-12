import { transactionSchema } from '../model/transaction-model';
import { toTransaction } from './home-mapper';

describe('toTransaction', () => {
  function dto(overrides: Record<string, unknown> = {}) {
    return transactionSchema.parse({ id: 't1', amount: 15, currency: 'USD', ...overrides });
  }

  describe('direction', () => {
    it('reads a credit as incoming', () => {
      expect(toTransaction(dto({ type: 'deposit' })).direction).toBe('incoming');
    });

    it('reads a payout as outgoing', () => {
      expect(toTransaction(dto({ type: 'wallet_to_bank' })).direction).toBe('outgoing');
    });

    it('defaults an unrecognised type to outgoing', () => {
      expect(toTransaction(dto({ type: 'something_new' })).direction).toBe('outgoing');
    });

    it('reads an uppercase wire type case-insensitively', () => {
      expect(toTransaction(dto({ type: 'CREDIT' })).direction).toBe('incoming');
      expect(toTransaction(dto({ type: 'TRANSFER' })).direction).toBe('outgoing');
    });
  });

  describe('status', () => {
    it.each([
      ['success', 'completed'],
      ['completed', 'completed'],
      ['failed', 'failed'],
      ['pending', 'pending'],
    ])('maps %s to %s', (wire, expected) => {
      expect(toTransaction(dto({ status: wire })).status).toBe(expected);
    });

    it('treats an unknown status as pending', () => {
      expect(toTransaction(dto({ status: 'reticulating' })).status).toBe('pending');
    });
  });

  it('converts the amount to minor units', () => {
    expect(toTransaction(dto({ amount: 15.5 })).amountMinor).toBe(1550);
  });

  it('rounds rather than truncating a fractional minor unit', () => {
    expect(toTransaction(dto({ amount: 0.005 })).amountMinor).toBe(1);
  });

  describe('title', () => {
    it('falls back to the capitalized type when nothing identifies a counterparty', () => {
      const t = toTransaction(
        dto({
          type: 'CREDIT',
          recipient_name: '',
          recipient_id: '00000000-0000-0000-0000-000000000000',
        }),
      );

      expect(t.title).toBe('Deposit');
    });

    it('names the counterparty by recipient_name when present, first word only', () => {
      const t = toTransaction(dto({ type: 'transfer', recipient_name: 'Jane Doe' }));

      expect(t.title).toBe('Transfer to Jane');
    });

    it('falls back to a shortened source address for an incoming transfer with no name', () => {
      const t = toTransaction(
        dto({
          type: 'CREDIT',
          recipient_name: '',
          recipient_id: '00000000-0000-0000-0000-000000000000',
          meta_data: { source_address: 'Dxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx5' },
        }),
      );

      expect(t.title).toBe('Deposit from Dxxx...xxx5');
    });

    it('falls back to a shortened destination address for an outgoing transfer with no name', () => {
      const t = toTransaction(
        dto({
          type: 'transfer',
          recipient_name: '',
          meta_data: { destination_address: '0x98aef800000000000000000000000000bAB89ab' },
        }),
      );

      expect(t.title).toBe('Transfer to 0x98aef8...89ab');
    });

    it('names a bank payout by its account holder when recipient_name is blank', () => {
      const t = toTransaction(
        dto({
          type: 'SWAP',
          recipient_name: '',
          recipient: {
            bank_account_information: {
              account_holder: 'JOHN DOE',
              account_number: '0000000001',
            },
          },
        }),
      );

      expect(t.title).toBe('Transfer to JOHN');
    });

    it('reads swap and debit as "Transfer" and credit as "Deposit", matching v1', () => {
      expect(toTransaction(dto({ type: 'swap', recipient_name: '' })).title).toBe('Transfer');
      expect(toTransaction(dto({ type: 'debit', recipient_name: '' })).title).toBe('Transfer');
      expect(toTransaction(dto({ type: 'credit', recipient_name: '' })).title).toBe('Deposit');
    });

    it('ignores a zero-filled placeholder id rather than showing it as an address', () => {
      const t = toTransaction(
        dto({
          type: 'CREDIT',
          recipient_name: '',
          recipient_id: '00000000-0000-0000-0000-000000000000',
        }),
      );

      expect(t.title).not.toContain('0000');
    });
  });
});
