import { NATIVE_CHAIN_CODE } from '@/core/reference-data/chain-metadata';
import { corridorFor } from '../corridor/registry';
import { recipientFor } from '../corridor/recipient-corridor';
import type { TransferRecipient } from '../entity/asset-transfer';
import { PaymentMethodCode } from '../entity/beneficiary-form';
import { toBeneficiary } from './to-beneficiary';
import { savedWalletFor, walletRecipientFor } from './wallet-recipient';

const PAID: TransferRecipient = {
  address: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
  tokenSymbol: 'USDC',
  networkCode: 'SOL',
  networkName: 'Solana',
};

const noLabels = () => '';

describe('walletRecipientFor', () => {
  it('names the wallet corridor, so the save is the one the Add wallet form makes', () => {
    const recipient = walletRecipientFor(PAID, 'Tunde’s wallet');

    expect(corridorFor(recipient.currency, recipient.method)?.beneficiary?.saveable).toBe(true);
    expect(recipient.method).toBe(PaymentMethodCode.Crypto);
  });

  it('saves the record the Add wallet form would save for the same Solana wallet', () => {
    const recipient = walletRecipientFor(PAID, 'Tunde’s wallet');
    const wallet = corridorFor('USDC', PaymentMethodCode.Crypto);
    if (wallet === undefined) throw new Error('no wallet corridor');

    expect(recipientFor(wallet, recipient.values, noLabels)).toEqual(
      recipientFor(
        wallet,
        { walletTag: 'Tunde’s wallet', network: NATIVE_CHAIN_CODE, walletAddress: PAID.address },
        noLabels,
      ),
    );
  });

  it('keeps the tag as typed, less the spaces around it', () => {
    expect(walletRecipientFor(PAID, '  Main wallet ').values['walletTag']).toBe('Main wallet');
  });
});

describe('savedWalletFor', () => {
  const wallet = corridorFor('USDC', PaymentMethodCode.Crypto);
  if (wallet === undefined) throw new Error('no wallet corridor');

  const savedAs = (id: string, walletAddress: string, network = NATIVE_CHAIN_CODE) =>
    toBeneficiary({
      id,
      fields: recipientFor(wallet, { walletTag: 'Main wallet', network, walletAddress }, noLabels),
      createdAt: '2026-09-01',
      updatedAt: '2026-09-01',
    });

  it('finds the saved wallet a payment is going to', () => {
    const main = savedAs('main', PAID.address);

    expect(
      savedWalletFor(PAID, [
        savedAs('other', 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3'),
        main,
      ]),
    ).toBe(main);
  });

  it('finds nothing for an address not saved', () => {
    expect(
      savedWalletFor(PAID, [savedAs('other', 'Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx3')]),
    ).toBeUndefined();
  });
});
