import type { PayoutRecipient } from '../../domain/entity/payout-recipient';
import type { ScanOutcome } from '../../domain/scan/scan-outcome';
import { scanResultRows } from './scan-result-rows';

const t = (key: string) => key;

const merchantRecipient: PayoutRecipient = {
  displayName: 'EXAMPLE MERCHANT LTD',
  subtitle: 'VND',
  currency: 'VND',
  method: 'crypto',
  rail: 'wallet',
  endpoint: '/transaction/qr-pay',
  requiresNarration: false,
  limits: [],
  countryCode: 'VN',
  values: { qrString: 'RAW', merchantName: 'EXAMPLE MERCHANT LTD' },
  labels: {},
};

const accountRecipient: PayoutRecipient = {
  displayName: 'Precious Jameson',
  subtitle: 'Guaranty Trust Bank • 0123578038',
  currency: 'NGN',
  method: 'bank_transfer',
  rail: 'bank_transfer',
  endpoint: '/transaction/wallet-to-bank',
  requiresNarration: true,
  limits: [],
  countryCode: 'NG',
  values: {
    bankCode: '058',
    accountNumber: '0123578038',
    accountName: 'Precious Jameson',
  },
  labels: { bankCode: 'Guaranty Trust Bank' },
};

const merchant = (over: Partial<Extract<ScanOutcome, { kind: 'merchant' }>> = {}): ScanOutcome => ({
  kind: 'merchant',
  recipient: merchantRecipient,
  amountMinor: 10_000_000,
  qrString: 'RAW',
  ...over,
});

describe('scanResultRows', () => {
  describe('an account read from a photograph', () => {
    it('shows the holder, the bank and the number in full', () => {
      expect(
        scanResultRows({ kind: 'account', recipient: accountRecipient, isVerified: true }, t),
      ).toEqual([
        { label: 'spend.accountHolder', value: 'Precious Jameson' },
        { label: 'spend.scan.bank', value: 'Guaranty Trust Bank' },
        { label: 'common.accountNumber', value: '0123578038' },
        { label: 'common.currency', value: 'NGN' },
      ]);
    });

    it('leaves out a holder the server could not name', () => {
      const rows = scanResultRows(
        {
          kind: 'account',
          recipient: { ...accountRecipient, displayName: '', subtitle: 'Opay • 0123578038' },
          isVerified: false,
        },
        t,
      );

      expect(rows.map((row) => row.label)).not.toContain('spend.accountHolder');
    });
  });

  it('has nothing to show for an outcome that is not a recipient', () => {
    expect(scanResultRows({ kind: 'unsupported', reason: 'comingSoon' }, t)).toEqual([]);
  });

  it('has nothing to show for a merchant', () => {
    expect(scanResultRows(merchant(), t)).toEqual([]);
  });
});
