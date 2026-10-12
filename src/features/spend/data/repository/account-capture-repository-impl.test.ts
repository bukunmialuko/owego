import { offline } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { AccountCaptureRemoteDataSource } from '../datasource/account-capture-remote-datasource';
import { createAccountCaptureRepositoryImpl } from './account-capture-repository-impl';

const STILL = { uri: 'file:///cache/capture.jpg', width: 1, height: 1, mimeType: 'image/jpeg' };

const READABLE = {
  account_number: '0123578038',
  bank_name: 'Guaranty Trust Bank',
  bank_code: '058',
  account_name: 'Precious Jameson',
  is_verified: true,
};

function build(answer: Awaited<ReturnType<AccountCaptureRemoteDataSource['readAccount']>>) {
  const readAccount = jest.fn().mockResolvedValue(answer);

  return {
    repository: createAccountCaptureRepositoryImpl({ readAccount }),
    readAccount,
  };
}

describe('AccountCaptureRepositoryImpl', () => {
  it('answers with the account the server read', async () => {
    const { repository } = build(ok(READABLE));

    await expect(repository.readAccount(STILL)).resolves.toEqual({
      ok: true,
      value: {
        accountNumber: '0123578038',
        bankName: 'Guaranty Trust Bank',
        bankCode: '058',
        accountName: 'Precious Jameson',
        isVerified: true,
      },
    });
  });

  describe('reports a photograph it could not read as unreadable', () => {
    it.each([
      ['no account number', { account_number: '' }],
      ['no bank code', { bank_code: '' }],
      ['no bank name', { bank_name: '' }],
      ['nothing at all', { account_number: '', bank_code: '', bank_name: '', account_name: '' }],
    ])('%s', async (_case, missing) => {
      const { repository } = build(ok({ ...READABLE, ...missing }));

      await expect(repository.readAccount(STILL)).resolves.toEqual({ ok: true, value: undefined });
    });
  });

  it('accepts an account whose holder the server could not name', async () => {
    const { repository } = build(ok({ ...READABLE, account_name: '', is_verified: false }));

    await expect(repository.readAccount(STILL)).resolves.toMatchObject({
      ok: true,
      value: { accountName: '', isVerified: false },
    });
  });

  it('passes a request that did not complete straight through', async () => {
    const { repository } = build(err(offline()));

    await expect(repository.readAccount(STILL)).resolves.toMatchObject({ ok: false });
  });
});
