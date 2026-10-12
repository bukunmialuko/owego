import { ok } from '@/core/result/result';
import type { AccountCaptureRepository } from '../../domain/repository/account-capture-repository';

const CAPTURED = {
  accountNumber: '0123578038',
  bankName: 'Guaranty Trust Bank',
  bankCode: '058',
  accountName: 'Precious Jameson',
  isVerified: true,
};

const READ_DELAY_MS = 900;

export function createPreviewAccountCaptureRepository(): AccountCaptureRepository {
  return {
    readAccount: () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(ok(CAPTURED));
        }, READ_DELAY_MS);
      }),
  };
}
