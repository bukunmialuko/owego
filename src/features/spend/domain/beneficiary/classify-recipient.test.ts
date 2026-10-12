import { BLANK_RECIPIENT_FIELDS, type RecipientFields } from '../entity/beneficiary';
import { classifyRecipient, networkCodeOf, surfaceAccepts } from './classify-recipient';

const SOLANA_ADDRESS = 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3';

function recipient(overrides: Partial<RecipientFields> = {}): RecipientFields {
  return { ...BLANK_RECIPIENT_FIELDS, accountHolder: 'Ada Obi', ...overrides };
}

describe('classifyRecipient', () => {
  describe('payment_method takes precedence', () => {
    it.each(['bank_transfer', 'mobile_money', 'kes_mobile_money', 'zelle_transfer'])(
      '%s resolves to bank even with no bank country',
      (paymentMethod) => {
        expect(classifyRecipient(recipient({ paymentMethod }))).toBe('bank');
      },
    );

    it('a known bank method wins over crypto-looking bank and network fields', () => {
      expect(
        classifyRecipient(
          recipient({
            bankName: 'Solana',
            accountNumber: SOLANA_ADDRESS,
            paymentMethod: 'bank_transfer',
          }),
        ),
      ).toBe('bank');
    });

    it('reads the method case- and whitespace-insensitively', () => {
      expect(classifyRecipient(recipient({ paymentMethod: '  BANK_TRANSFER ' }))).toBe('bank');
    });

    it('lets an unrecognised method fall through to the heuristic', () => {
      expect(
        classifyRecipient(
          recipient({ bankCountry: 'ng', bankName: 'GTBank', paymentMethod: 'some_future_rail' }),
        ),
      ).toBe('bank');
    });
  });

  describe('when payment_method is absent', () => {
    it('reads a known network name with no bank country as crypto', () => {
      expect(classifyRecipient(recipient({ bankName: 'Solana' }))).toBe('crypto');
    });

    it('matches the network case- and whitespace-insensitively', () => {
      expect(classifyRecipient(recipient({ bankName: ' SOL ' }))).toBe('crypto');
    });

    it.each(['Base', 'Monad', 'Arc'])('recognises %s by name', (bankName) => {
      expect(classifyRecipient(recipient({ bankName }))).toBe('crypto');
    });

    it.each(['BASE', 'monad', 'Arc'])('recognises the %s catalog code', (bankName) => {
      expect(classifyRecipient(recipient({ bankName }))).toBe('crypto');
    });

    it('reads a long alphanumeric address with no bank fields as crypto', () => {
      expect(classifyRecipient(recipient({ accountNumber: SOLANA_ADDRESS }))).toBe('crypto');
    });

    it('reads a bank country as bank', () => {
      expect(classifyRecipient(recipient({ bankCountry: 'ng', bankName: 'GTBank' }))).toBe('bank');
    });

    it('lets a bank country win over a network-looking bank name', () => {
      expect(classifyRecipient(recipient({ bankCountry: 'ng', bankName: 'Solana' }))).toBe('bank');
    });

    it('does not read a long address that still carries a bank code as crypto', () => {
      expect(classifyRecipient(recipient({ bankCode: '058', accountNumber: SOLANA_ADDRESS }))).toBe(
        'unknown',
      );
    });

    it('calls a short account number with no other signal unknown', () => {
      expect(classifyRecipient(recipient({ accountNumber: '0123456789' }))).toBe('unknown');
    });

    it('calls an empty recipient unknown, never crypto', () => {
      expect(classifyRecipient(recipient())).toBe('unknown');
    });

    it('reads only catalog networks as crypto', () => {
      expect(classifyRecipient(recipient({ bankName: 'Base' }))).toBe('crypto');
      expect(classifyRecipient(recipient({ bankName: 'Ethereum' }))).toBe('unknown');
    });
  });
});

describe('surfaceAccepts', () => {
  const unknown = recipient({ accountNumber: '0123456789' });
  const bank = recipient({ bankCountry: 'ng', bankName: 'GTBank' });
  const crypto = recipient({ bankName: 'Solana' });

  it('lets the bank surface list an unknown record so it stays reachable', () => {
    expect(classifyRecipient(unknown)).toBe('unknown');
    expect(surfaceAccepts('bank', classifyRecipient(unknown))).toBe(true);
  });

  it('keeps an unknown record off the crypto surface', () => {
    expect(surfaceAccepts('crypto', classifyRecipient(unknown))).toBe(false);
  });

  it('keeps a bank record off the crypto surface', () => {
    expect(surfaceAccepts('crypto', classifyRecipient(bank))).toBe(false);
  });

  it('keeps a crypto record off the bank surface', () => {
    expect(surfaceAccepts('bank', classifyRecipient(crypto))).toBe(false);
  });

  it('lists a crypto record on the crypto surface', () => {
    expect(surfaceAccepts('crypto', classifyRecipient(crypto))).toBe(true);
  });
});

describe('networkCodeOf', () => {
  it.each(['sol', 'SOL', 'solana', 'Solana', '  Solana  '])('reads %p as SOL', (raw) => {
    expect(networkCodeOf(raw)).toBe('SOL');
  });

  it.each([
    ['base', 'BASE'],
    ['Monad', 'MONAD'],
    ['arc', 'ARC'],
  ])('reads %p as %s', (raw, code) => {
    expect(networkCodeOf(raw)).toBe(code);
  });

  it.each(['Ethereum', 'GTBank', '', '   '])('does not place %p', (raw) => {
    expect(networkCodeOf(raw)).toBeUndefined();
  });
});
