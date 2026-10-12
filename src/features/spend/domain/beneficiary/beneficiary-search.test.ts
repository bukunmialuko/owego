import {
  BLANK_RECIPIENT_FIELDS,
  type BankBeneficiary,
  type Beneficiary,
  type WalletBeneficiary,
} from '../entity/beneficiary';
import { buildMerchantCode } from '@/test/qr-payloads';
import { SEARCH_RESULT_CAP, destinationKeyOf, searchBeneficiaries } from './beneficiary-search';
import { toMerchantBeneficiary } from './merchant-beneficiary';
import { toBeneficiary } from './to-beneficiary';
import { classifyRecipient, surfaceAccepts } from './classify-recipient';

const STAMP = '2026-01-01T00:00:00Z';
const SOLANA_ADDRESS = 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3';

type BankSpec = {
  id: string;
  accountHolder?: string;
  name?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  createdAt?: string;
  updatedAt?: string;
};

function bank({
  id,
  accountHolder = '',
  name = accountHolder,
  accountNumber = '',
  bankName = '',
  bankCode = '',
  createdAt = STAMP,
  updatedAt = STAMP,
}: BankSpec): BankBeneficiary {
  return {
    kind: 'bank',
    id,
    name,
    institution: bankName,
    reference: accountNumber,
    countryCode: 'ng',
    fields: {
      ...BLANK_RECIPIENT_FIELDS,
      bankCountry: 'ng',
      bankName,
      bankCode,
      accountHolder,
      accountNumber,
      paymentMethod: 'bank_transfer',
    },
    createdAt,
    updatedAt,
  };
}

type WalletSpec = {
  id: string;
  tag?: string;
  address?: string;
  networkCode?: string;
  networkName?: string;
  updatedAt?: string;
};

function wallet({
  id,
  tag = '',
  address = SOLANA_ADDRESS,
  networkCode = 'SOL',
  networkName = 'Solana',
  updatedAt = STAMP,
}: WalletSpec): WalletBeneficiary {
  return {
    kind: 'wallet',
    id,
    tag,
    address,
    networkCode,
    networkName,
    fields: {
      ...BLANK_RECIPIENT_FIELDS,
      accountHolder: tag,
      accountNumber: address,
      bankName: networkName,
    },
    createdAt: STAMP,
    updatedAt,
  };
}

const ids = (results: readonly Beneficiary[]) => results.map((beneficiary) => beneficiary.id);

describe('searchBeneficiaries', () => {
  describe('an empty query', () => {
    it('returns the whole book in recency order', () => {
      const book = [
        bank({ id: 'old', accountHolder: 'Old Payee', updatedAt: '2026-01-01T00:00:00Z' }),
        bank({ id: 'new', accountHolder: 'New Payee', updatedAt: '2026-06-01T00:00:00Z' }),
        bank({ id: 'mid', accountHolder: 'Mid Payee', updatedAt: '2026-03-01T00:00:00Z' }),
      ];

      expect(ids(searchBeneficiaries(book, ''))).toEqual(['new', 'mid', 'old']);
    });

    it('treats a whitespace-only query like an empty one', () => {
      expect(
        ids(searchBeneficiaries([bank({ id: 'a', accountHolder: 'Ada Obi' })], '   ')),
      ).toEqual(['a']);
    });

    it('respects the limit', () => {
      const book = Array.from({ length: 10 }, (_, i) =>
        bank({ id: `${i}`, accountHolder: `Payee ${i}`, accountNumber: `${i}` }),
      );

      expect(searchBeneficiaries(book, '', { limit: 3 })).toHaveLength(3);
    });
  });

  describe('recency', () => {
    it('falls back to the creation time when a record has never been updated', () => {
      const book = [
        bank({
          id: 'edited',
          accountHolder: 'Ada',
          accountNumber: '1',
          updatedAt: '2026-02-01T00:00:00Z',
        }),
        bank({
          id: 'created',
          accountHolder: 'Bola',
          accountNumber: '2',
          createdAt: '2026-05-01T00:00:00Z',
          updatedAt: '',
        }),
      ];

      expect(ids(searchBeneficiaries(book, ''))).toEqual(['created', 'edited']);
    });

    it('orders records saved at the same moment by name', () => {
      const book = [
        bank({ id: 'bola', accountHolder: 'Bola Eze', accountNumber: '1' }),
        bank({ id: 'ada', accountHolder: 'Ada Obi', accountNumber: '2' }),
      ];

      expect(ids(searchBeneficiaries(book, ''))).toEqual(['ada', 'bola']);
    });
  });

  describe('rank order', () => {
    const book = [
      bank({
        id: 'exact',
        accountHolder: 'Zed Exact',
        accountNumber: '0123456789',
        bankCode: '001',
      }),
      bank({
        id: 'prefix',
        accountHolder: 'Zed Prefix',
        accountNumber: '0123456700',
        bankCode: '002',
      }),
      bank({
        id: 'substring',
        accountHolder: 'Zed Sub',
        accountNumber: '9901234567',
        bankCode: '003',
      }),
      bank({
        id: 'bank',
        accountHolder: 'Zed Bank',
        accountNumber: '5550000000',
        bankName: '0123456789 Bank',
        bankCode: '004',
      }),
    ];

    it('puts an exact account match above a prefix, a substring and a bank name', () => {
      expect(ids(searchBeneficiaries(book, '0123456789'))[0]).toBe('exact');
    });

    it('puts an account prefix above an account substring', () => {
      const results = ids(searchBeneficiaries(book, '01234567'));

      expect(results.indexOf('prefix')).toBeLessThan(results.indexOf('substring'));
    });

    it('puts a name match above a bank-name match', () => {
      const byName = [
        bank({
          id: 'byBank',
          accountHolder: 'Someone Else',
          bankName: 'Ada Bank',
          accountNumber: '1',
        }),
        bank({ id: 'byName', accountHolder: 'Ada Obi', bankName: 'GTBank', accountNumber: '2' }),
      ];

      expect(ids(searchBeneficiaries(byName, 'ada'))[0]).toBe('byName');
    });
  });

  describe('account and phone matching', () => {
    it('finds a record by the last six digits of its account number', () => {
      const book = [
        bank({
          id: 'target',
          accountHolder: 'Ada Obi',
          accountNumber: '0123456789',
          bankCode: '1',
        }),
        bank({ id: 'other', accountHolder: 'Bob Eze', accountNumber: '9876543210', bankCode: '2' }),
      ];

      expect(ids(searchBeneficiaries(book, '456789'))).toEqual(['target']);
    });

    it.each(['+234 803 123 4567', '2348031234567', '08031234567', '8031234567', '803-123-4567'])(
      'matches a mobile-money number typed as %p, once',
      (query) => {
        const book = [
          bank({
            id: 'momo',
            accountHolder: 'Ada Obi',
            accountNumber: '+234 803 123 4567',
            bankCode: 'MTN',
          }),
        ];

        expect(ids(searchBeneficiaries(book, query))).toEqual(['momo']);
      },
    );

    it('matches a wallet address by prefix and by suffix', () => {
      const book = [wallet({ id: 'wallet', tag: 'Cold Wallet' })];

      expect(ids(searchBeneficiaries(book, 'Bxxxxxxx'))).toEqual(['wallet']);
      expect(ids(searchBeneficiaries(book, 'xxxxxxxx3'))).toEqual(['wallet']);
      expect(ids(searchBeneficiaries(book, SOLANA_ADDRESS))).toEqual(['wallet']);
    });

    it('matches a Zelle email exactly and by prefix', () => {
      const book = [
        bank({
          id: 'zelle',
          accountHolder: 'Ada Obi',
          accountNumber: 'ada@example.com',
          bankCode: 'ZELLE',
        }),
      ];

      expect(ids(searchBeneficiaries(book, 'ada@example.com'))).toEqual(['zelle']);
      expect(ids(searchBeneficiaries(book, 'ada@ex'))).toEqual(['zelle']);
    });
  });

  describe('name matching', () => {
    const book = [
      bank({ id: 'john', accountHolder: 'John Ade Okoro', accountNumber: '1', bankCode: 'a' }),
      bank({ id: 'ada', accountHolder: 'Ada Obi', accountNumber: '2', bankCode: 'b' }),
      bank({ id: 'adeyemi', accountHolder: 'Adéyemi Bello', accountNumber: '3', bankCode: 'c' }),
    ];

    it('matches several tokens out of order', () => {
      expect(ids(searchBeneficiaries(book, 'ade jo'))).toEqual(['john']);
    });

    it('matches a prefix of a single token', () => {
      expect(ids(searchBeneficiaries(book, 'ad'))).toEqual(
        expect.arrayContaining(['ada', 'adeyemi', 'john']),
      );
    });

    it('ignores diacritics in both directions', () => {
      expect(ids(searchBeneficiaries(book, 'adeyemi'))).toEqual(['adeyemi']);
      expect(ids(searchBeneficiaries(book, 'adéyemi'))).toEqual(['adeyemi']);
    });

    it('ignores case', () => {
      expect(ids(searchBeneficiaries(book, 'ADA OBI'))).toEqual(['ada']);
    });

    it('puts a leading-token match above an out-of-order one', () => {
      const leading = [
        bank({ id: 'trailing', accountHolder: 'Bob Ade', accountNumber: '1', bankCode: 'a' }),
        bank({ id: 'leading', accountHolder: 'Ade Bob', accountNumber: '2', bankCode: 'b' }),
      ];

      expect(ids(searchBeneficiaries(leading, 'ade'))[0]).toBe('leading');
    });

    it('needs every query token to match a distinct name token', () => {
      expect(searchBeneficiaries(book, 'ada ada')).toEqual([]);
    });

    it('returns nothing for a query that matches nothing', () => {
      expect(searchBeneficiaries(book, 'zzzzz')).toEqual([]);
    });

    it('finds a bank record by its name when the account holder is blank', () => {
      const unnamed = [bank({ id: 'n', accountHolder: '', name: 'Ada Obi', accountNumber: '1' })];

      expect(ids(searchBeneficiaries(unnamed, 'obi'))).toEqual(['n']);
    });
  });

  it('matches a wallet by its tag, its address and its network name', () => {
    const book = [
      wallet({ id: 'main', tag: 'Main wallet' }),
      bank({ id: 'ada', accountHolder: 'Ada Obi', accountNumber: '0123456789', bankCode: '058' }),
    ];

    expect(ids(searchBeneficiaries(book, 'main'))).toEqual(['main']);
    expect(ids(searchBeneficiaries(book, SOLANA_ADDRESS.slice(0, 10)))[0]).toBe('main');
    expect(ids(searchBeneficiaries(book, 'solana'))).toEqual(['main']);
  });

  it('matches a wallet by its network code as well as its name', () => {
    const book = [
      wallet({ id: 'main', tag: 'Main wallet' }),
      wallet({
        id: 'bsc',
        tag: 'Trading',
        address: '0x1111111111111111111111111111111111111111',
        networkCode: 'BSC',
        networkName: 'BNB Smart Chain',
      }),
    ];

    expect(ids(searchBeneficiaries(book, 'sol'))).toEqual(['main']);
    expect(ids(searchBeneficiaries(book, 'bsc'))).toEqual(['bsc']);
  });

  describe('de-duplication', () => {
    it('takes a Zelle ID saved under the old and the new code of one category as one destination', () => {
      const zelle = (id: string, bankCode: string) =>
        toBeneficiary({
          id,
          fields: {
            ...BLANK_RECIPIENT_FIELDS,
            bankCountry: 'us',
            bankName: 'Zelle',
            bankCode,
            accountHolder: 'Ada',
            accountNumber: 'ada@example.com',
          },
          createdAt: STAMP,
          updatedAt: STAMP,
        });

      expect(destinationKeyOf(zelle('old', 'individual'))).toBe(
        destinationKeyOf(zelle('new', 'zelle_individual')),
      );
    });

    it('keeps two Zelle recipients apart when their emails merely share digits', () => {
      const book = [
        bank({
          id: 'john',
          accountHolder: 'John',
          accountNumber: 'john1990@gmail.com',
          bankName: 'Zelle',
          bankCode: 'individual',
        }),
        bank({
          id: 'mary',
          accountHolder: 'Mary',
          accountNumber: 'mary1990@gmail.com',
          bankName: 'Zelle',
          bankCode: 'individual',
        }),
      ];

      expect(ids(searchBeneficiaries(book, '')).sort()).toEqual(['john', 'mary']);
    });

    it('still recognises one phone number written two ways', () => {
      const book = [
        bank({
          id: 'spaced',
          accountHolder: 'Awa',
          accountNumber: '+225 07 12 34 56 78',
          bankName: 'Wave',
        }),
        bank({
          id: 'packed',
          accountHolder: 'Awa',
          accountNumber: '+2250712345678',
          bankName: 'Wave',
        }),
      ];

      expect(searchBeneficiaries(book, '')).toHaveLength(1);
    });

    it('keeps two wallet addresses apart that differ only in case', () => {
      const book = [
        wallet({ id: 'lower', address: 'bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3' }),
        wallet({ id: 'upper', address: SOLANA_ADDRESS }),
      ];

      expect(searchBeneficiaries(book, '')).toHaveLength(2);
    });

    it('collapses one destination into its most recent record', () => {
      const book = [
        bank({
          id: 'stale',
          accountHolder: 'Ada O',
          accountNumber: '0123456789',
          bankCode: '058',
          updatedAt: '2026-01-01T00:00:00Z',
        }),
        bank({
          id: 'fresh',
          accountHolder: 'Ada Obi',
          accountNumber: '0123456789',
          bankCode: '058',
          updatedAt: '2026-06-01T00:00:00Z',
        }),
      ];

      expect(ids(searchBeneficiaries(book, ''))).toEqual(['fresh']);
    });

    it('keeps one account number at two banks apart', () => {
      const book = [
        bank({ id: 'gt', accountHolder: 'Ada Obi', accountNumber: '0123456789', bankCode: '058' }),
        bank({
          id: 'zenith',
          accountHolder: 'Ada Obi',
          accountNumber: '0123456789',
          bankCode: '057',
        }),
      ];

      expect(searchBeneficiaries(book, '')).toHaveLength(2);
    });

    it('does not collapse one person with several accounts by name', () => {
      const book = [
        bank({
          id: 'acct1',
          accountHolder: 'Ada Obi',
          accountNumber: '0123456789',
          bankCode: '058',
        }),
        bank({
          id: 'acct2',
          accountHolder: 'Ada Obi',
          accountNumber: '9876543210',
          bankCode: '058',
        }),
      ];

      expect(searchBeneficiaries(book, 'ada')).toHaveLength(2);
    });

    it('keys a record with no bank code on its bank name', () => {
      const book = [
        bank({ id: 'a', accountNumber: 'abc', bankName: 'Solana' }),
        bank({ id: 'b', accountNumber: 'abc', bankName: 'Solana' }),
      ];

      expect(searchBeneficiaries(book, '')).toHaveLength(1);
    });

    it('keys a wallet on its network, so one address on two chains stays two records', () => {
      const evm = '0x1111111111111111111111111111111111111111';
      const book = [
        wallet({ id: 'base', address: evm, networkCode: 'BASE', networkName: 'Base' }),
        wallet({ id: 'base-twin', address: evm, networkCode: 'BASE', networkName: 'Base' }),
        wallet({ id: 'monad', address: evm, networkCode: 'MONAD', networkName: 'Monad' }),
      ];

      expect(ids(searchBeneficiaries(book, ''))).toEqual(['base', 'monad']);
    });

    it('keeps duplicate records when not deduping', () => {
      const book = [
        bank({
          id: 'stale',
          accountNumber: '0123456789',
          bankCode: '058',
          updatedAt: '2026-01-01T00:00:00Z',
        }),
        bank({
          id: 'fresh',
          accountNumber: '0123456789',
          bankCode: '058',
          updatedAt: '2026-06-01T00:00:00Z',
        }),
      ];

      expect(ids(searchBeneficiaries(book, '', { dedupe: false }))).toEqual(['fresh', 'stale']);
      expect(ids(searchBeneficiaries(book, '0123', { dedupe: false }))).toEqual(['fresh', 'stale']);
    });
  });

  describe('rail filtering', () => {
    const book: Beneficiary[] = [
      bank({ id: 'bank', accountHolder: 'Ada Obi', accountNumber: '0123456789', bankCode: '058' }),
      wallet({ id: 'crypto', tag: 'Ada Wallet' }),
    ];
    const onSurface = (surface: 'bank' | 'crypto') =>
      book.filter((beneficiary) => surfaceAccepts(surface, classifyRecipient(beneficiary.fields)));

    it('finds no wallet on the bank surface', () => {
      expect(ids(searchBeneficiaries(onSurface('bank'), 'ada'))).toEqual(['bank']);
    });

    it('finds no bank record on the crypto surface', () => {
      expect(ids(searchBeneficiaries(onSurface('crypto'), 'ada'))).toEqual(['crypto']);
    });

    it('searches bank and wallet records together when handed both', () => {
      expect(searchBeneficiaries(book, '')).toHaveLength(2);
    });
  });

  describe('saved merchants', () => {
    const sticker = buildMerchantCode({ merchantName: 'PHO 24' });
    const merchant = (id: string, qrString = sticker) =>
      toMerchantBeneficiary({ id, qrString, createdAt: STAMP, updatedAt: STAMP });

    it('finds a merchant by the name its code carries, or its currency', () => {
      const pho = merchant('pho');

      expect(searchBeneficiaries([pho], 'pho')).toEqual([pho]);
      expect(searchBeneficiaries([pho], 'vnd')).toEqual([pho]);
    });

    it('never matches a fragment of the code itself', () => {
      const pho = merchant('pho');

      expect(searchBeneficiaries([pho], '000201')).toEqual([]);
      expect(searchBeneficiaries([pho], sticker.slice(-12))).toEqual([]);
    });

    it('treats two records of one sticker as one destination', () => {
      const older = merchant('older', sticker);
      const newer = { ...merchant('newer', sticker), updatedAt: '2026-02-01T00:00:00Z' };

      expect(searchBeneficiaries([older, newer], '')).toEqual([newer]);
      expect(destinationKeyOf(older)).toBe(destinationKeyOf(newer));
    });

    it('keeps two stickers of one merchant apart', () => {
      const counter = merchant('counter');
      const terrace = merchant(
        'terrace',
        buildMerchantCode({ merchantName: 'PHO 24', merchantCity: 'Hanoi' }),
      );

      expect(searchBeneficiaries([counter, terrace], '')).toHaveLength(2);
    });
  });

  describe('the result cap', () => {
    const book = Array.from({ length: 60 }, (_, i) =>
      bank({ id: `${i}`, accountHolder: `Payee ${i}`, accountNumber: `${i}` }),
    );

    it('applies no cap when no limit is given', () => {
      expect(searchBeneficiaries(book, '')).toHaveLength(60);
    });

    it("stops at v1's fifty when a caller passes the cap", () => {
      expect(searchBeneficiaries(book, '', { limit: SEARCH_RESULT_CAP })).toHaveLength(50);
    });
  });

  it('matches nothing in an empty book', () => {
    expect(searchBeneficiaries([], '')).toEqual([]);
    expect(searchBeneficiaries([], 'ada')).toEqual([]);
  });
});
