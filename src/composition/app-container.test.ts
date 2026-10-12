import { WalletSdk } from '@circle-fin/w3s-pw-react-native-sdk';
import { asValue } from 'awilix';
import type { AppConfig } from '@/core/config/app-config';
import { ok } from '@/core/result/result';
import { testAppConfig } from '@/test/test-config';
import { createComposedContainer, mergeFeatureRegistrations, type Cradle } from './app-container';

const config: AppConfig = testAppConfig;

describe('createComposedContainer', () => {
  it('resolves core and feature dependencies together', () => {
    const container = createComposedContainer(config);

    const keys: (keyof Cradle)[] = [
      'apiClient',
      'publicApiClient',
      'authRemoteDataSource',
      'authRepository',
      'pinRepository',
      'signInSettingsRepository',
      'pinSignInToggleUseCase',
      'biometricSignInToggleUseCase',
      'signInWithGoogleUseCase',
    ];

    for (const key of keys) {
      expect(container.resolve(key)).toBeDefined();
    }
  });

  it('gives the auth datasource the unauthenticated client', () => {
    const container = createComposedContainer(config);

    expect(container.resolve('authRemoteDataSource')).toBeDefined();
    expect(container.resolve('publicApiClient')).not.toBe(container.resolve('apiClient'));
  });

  describe('native adapters', () => {
    it('resolves the circle wallet sdk adapter for real', () => {
      const container = createComposedContainer(config);

      expect(container.resolve('circleWalletPort').executeChallenge).toBeInstanceOf(Function);
      expect(container.resolve('createWalletUseCase').execute).toBeInstanceOf(Function);
    });

    it('resolves the didit sdk adapter for real', async () => {
      const container = createComposedContainer(config);

      await expect(container.resolve('diditPort').verify('session-token')).resolves.toEqual({
        ok: true,
        value: { type: 'cancelled' },
      });
    });

    it('resolves the firebase messaging adapter for real', async () => {
      const container = createComposedContainer(config);

      await expect(container.resolve('pushMessagingPort').getToken()).resolves.toEqual(
        ok('test-fcm-token'),
      );
    });

    it('resolves both oauth providers for real', () => {
      const container = createComposedContainer(config);

      expect(container.resolve('googleAuthenticator')).toBeDefined();
      expect(container.resolve('appleAuthenticator')).toBeDefined();
    });
  });

  describe('cross-feature ports', () => {
    it('fills auth’s wallet-provisioning port from the wallet feature', () => {
      const container = createComposedContainer(config);

      expect(container.resolve('walletProvisioning')).toBeDefined();
      expect(container.resolve('walletRepository')).toBeDefined();
    });

    describe('sending a digital asset', () => {
      const execute = jest.mocked(WalletSdk.execute);
      const challenge = { challengeId: 'chal_1', userToken: 'utok_1', encryptionKey: 'key_1' };

      beforeEach(() => {
        execute.mockReset();
      });

      it('fills spend’s transfer-signing port from the wallet feature, over Circle', async () => {
        execute.mockImplementation((_token, _key, _ids, onSuccess) => {
          onSuccess({ result: { status: 'COMPLETE', resultType: 'CREATE_TRANSACTION' } } as never);
        });
        const container = createComposedContainer(config);

        const result = await container.resolve('transferSigningPort').sign(challenge);

        expect(execute).toHaveBeenCalledWith(
          'utok_1',
          'key_1',
          ['chal_1'],
          expect.any(Function),
          expect.any(Function),
        );
        expect(result).toEqual(
          ok({ type: 'settled', status: 'complete', resultType: 'transaction' }),
        );
      });

      it('resolves the send use case over the real challenge endpoint', () => {
        const container = createComposedContainer(config);

        expect(container.resolve('sendAssetUseCase').execute).toBeInstanceOf(Function);
        expect(container.resolve('transferChallengeRemoteDataSource').create).toBeInstanceOf(
          Function,
        );
      });

      it('never hands a transfer challenge to Circle in preview mode', async () => {
        const container = createComposedContainer({ ...config, usePreviewData: true });

        const result = await container.resolve('transferSigningPort').sign(challenge);

        expect(execute).not.toHaveBeenCalled();
        expect(result).toEqual(
          ok({ type: 'settled', status: 'complete', resultType: 'transaction' }),
        );
      });

      it('never creates a real transfer challenge in preview mode', async () => {
        const container = createComposedContainer({ ...config, usePreviewData: true });

        const result = await container.resolve('transferChallengeRepository').create({
          walletId: 'preview-wallet',
          tokenId: 'usdc-sol',
          destinationAddress: 'Axxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx1',
          amountMinor: 10,
        });

        expect(result.ok).toBe(true);
      });
    });

    it('resolves the home data layer', () => {
      const container = createComposedContainer(config);

      expect(container.resolve('homeRemoteDataSource')).toBeDefined();
      expect(container.resolve('transactionRepository')).toBeDefined();
      expect(container.resolve('transactionHistoryRepository')).toBeDefined();
      expect(container.resolve('getTransactionPageUseCase')).toBeDefined();
    });

    it('reads notification settings without a server in preview mode', async () => {
      const container = createComposedContainer({ ...config, usePreviewData: true });

      const result = await container.resolve('settingsNotificationsPort').read();

      expect(result.ok).toBe(true);
    });
  });

  describe('duplicate registrations', () => {
    it('rejects two modules declaring the same cradle key, naming both', () => {
      expect(() =>
        mergeFeatureRegistrations({
          walletRegistrations: { walletBalancePort: asValue({ listWallets: jest.fn() }) },
          profileRegistrations: { walletBalancePort: asValue({ listWallets: jest.fn() }) },
        }),
      ).toThrow(/walletBalancePort.*walletRegistrations.*profileRegistrations/s);
    });

    it('merges distinct keys', () => {
      const merged = mergeFeatureRegistrations({
        a: { walletBalancePort: asValue({ listWallets: jest.fn() }) },
        b: { payeePort: asValue({ getRecent: jest.fn() }) },
      });

      expect(Object.keys(merged).sort()).toEqual(['payeePort', 'walletBalancePort']);
    });

    it('serves every consumer of walletBalancePort from one adapter', () => {
      const container = createComposedContainer(config);

      expect(container.resolve('walletBalancePort')).toBe(container.resolve('walletBalancePort'));
      expect(container.resolve('walletBalancePort').listWallets).toBeInstanceOf(Function);
    });
  });

  it('resolves every registered dependency', () => {
    const container = createComposedContainer(config);

    const failures: string[] = [];

    for (const key of Object.keys(container.registrations)) {
      try {
        container.resolve(key as keyof Cradle);
      } catch (error) {
        failures.push(`${key}: ${(error as Error).message.split('\n')[0]}`);
      }
    }

    expect(failures).toEqual([]);
  });
});
