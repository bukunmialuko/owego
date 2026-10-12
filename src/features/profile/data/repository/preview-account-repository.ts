import { ok } from '@/core/result/result';
import type { AccountRepository } from '../../domain/repository/account-repository';

export function createPreviewAccountRepository(): AccountRepository {
  return { deleteAccount: () => Promise.resolve(ok(undefined)) };
}
