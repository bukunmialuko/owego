import {
  forbidden,
  kycNotCompleted,
  offline,
  rateLimited,
  serverError,
  timeout,
  unauthenticated,
  unknownError,
  walletNotCreated,
  type AppError,
} from '@/core/errors/app-error';
import { fromHttp } from '@/core/errors/from-http';
import { createI18n } from './i18n';

describe('i18n', () => {
  const i18n = createI18n('en');

  it('resolves a ported v1 key', () => {
    expect(i18n.t('common.continue')).toBe('Continue');
  });

  it('interpolates using the i18next syntax converted from arb', () => {
    const message = i18n.t('common.successWithMessage', { message: 'transfer complete' });

    expect(message).toBe('Success: transfer complete');
    expect(message).not.toContain('{');
  });

  it('interpolates a multi-placeholder string', () => {
    expect(i18n.t('common.shareWalletAddress', { chain: 'Solana', address: '4k3D' })).toBe(
      'My Solana Address: 4k3D',
    );
  });

  describe('every AppError titleKey has a translation', () => {
    const errors: [string, AppError][] = [
      ['offline', offline()],
      ['timeout', timeout()],
      ['serverError', serverError()],
      ['rateLimited', rateLimited()],
      ['unauthenticated', unauthenticated()],
      ['forbidden', forbidden()],
      ['kycNotCompleted', kycNotCompleted()],
      ['walletNotCreated', walletNotCreated()],
      ['unknownError', unknownError()],
      ['validation', fromHttp({ status: 422 })],
    ];

    it.each(errors)('%s', (_name, error) => {
      expect(i18n.exists(error.titleKey)).toBe(true);
      expect(i18n.t(error.titleKey)).not.toBe(error.titleKey);
    });
  });

  it('rejects a key that does not exist at compile time', () => {
    // @ts-expect-error titleKey is typed against the shipped resources
    const misspelled: AppError = { ...offline(), titleKey: 'errors.network.ofline' };

    expect(misspelled.titleKey).toBeDefined();
  });

  it('falls back to english for an unshipped language', () => {
    expect(createI18n('fr').t('common.continue')).toBe('Continue');
  });

  it('carries every namespace ported from v1', () => {
    const namespaces = [
      'auth',
      'common',
      'deposit',
      'errors',
      'home',
      'spend',
      'profile',
      'wallet',
    ];

    for (const namespace of namespaces) {
      expect(i18n.exists(namespace)).toBe(true);
    }
  });
});
