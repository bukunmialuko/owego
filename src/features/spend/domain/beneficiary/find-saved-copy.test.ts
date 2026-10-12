import { recipientFor } from '../corridor/recipient-corridor';
import { cryptoWallet } from '../corridor/crypto';
import { ngnBankTransfer } from '../corridor/ngn-bank-transfer';
import type { FieldValues } from '../corridor/corridor-spec';
import { buildMerchantCode } from '@/test/qr-payloads';
import { findSavedCopy, findSavedMerchant } from './find-saved-copy';
import { toMerchantBeneficiary } from './merchant-beneficiary';
import { toBeneficiary } from './to-beneficiary';

const labelOf = (name: string) => (name === 'bankCode' ? 'Guaranty Trust Bank' : '');

const NIGERIAN: FieldValues = {
  bankCode: '058',
  accountNumber: '0123456789',
  accountName: 'Hannah Nuggest',
};

const WALLET: FieldValues = {
  walletTag: 'Main wallet',
  network: 'SOL',
  walletAddress: 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3',
};

function saved(id: string, fields: ReturnType<typeof recipientFor>) {
  return toBeneficiary({ id, fields, createdAt: '2026-09-01', updatedAt: '2026-09-01' });
}

describe('findSavedCopy', () => {
  const nigerian = saved('ngn', recipientFor(ngnBankTransfer, NIGERIAN, labelOf));
  const wallet = saved('wallet', recipientFor(cryptoWallet, WALLET, labelOf));

  it('finds the beneficiary already saved for the same account', () => {
    const fields = recipientFor(ngnBankTransfer, NIGERIAN, labelOf);

    expect(findSavedCopy(fields, [wallet, nigerian])).toBe(nigerian);
  });

  it('finds nothing for an account not saved', () => {
    const fields = recipientFor(
      ngnBankTransfer,
      { ...NIGERIAN, accountNumber: '9876543210' },
      labelOf,
    );

    expect(findSavedCopy(fields, [wallet, nigerian])).toBeUndefined();
  });

  it('finds a saved wallet by its address and network, whatever its tag', () => {
    const fields = recipientFor(cryptoWallet, { ...WALLET, walletTag: '' }, labelOf);

    expect(findSavedCopy(fields, [nigerian, wallet])).toBe(wallet);
  });

  it('finds nothing in an empty list', () => {
    expect(findSavedCopy(recipientFor(cryptoWallet, WALLET, labelOf), [])).toBeUndefined();
  });
});

describe('findSavedMerchant', () => {
  const sticker = buildMerchantCode({ merchantName: 'PHO 24' });
  const lunch = toMerchantBeneficiary({
    id: 'lunch',
    qrString: sticker,
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
  });
  const nigerian = saved('ngn', recipientFor(ngnBankTransfer, NIGERIAN, labelOf));

  it('finds a merchant saved for the same code', () => {
    expect(findSavedMerchant(sticker, [nigerian, lunch])).toBe(lunch);
  });

  it('finds nothing for another sticker of the same merchant', () => {
    const terrace = buildMerchantCode({ merchantName: 'PHO 24', merchantCity: 'Hanoi' });

    expect(findSavedMerchant(terrace, [nigerian, lunch])).toBeUndefined();
  });
});
