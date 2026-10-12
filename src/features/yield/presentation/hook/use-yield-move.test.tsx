import { Pressable, Text } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { asValue } from 'awilix';
import { http, HttpResponse } from 'msw';
import { setLogSink } from '@/core/log/dev-log';
import { ok, type Result } from '@/core/result/result';
import { createAppLockHold } from '@/core/session/app-lock-hold';
import { PREVIEW_USDC_MINT } from '@/core/yield/preview-yield-overview-repository';
import type { AppError } from '@/core/errors/app-error';
import { server, withMockServer } from '@/test/msw/server';
import { createTestContainer, renderWithProviders } from '@/test/render-with-providers';
import { testAppConfig } from '@/test/test-config';
import { createPreviewYieldRepository } from '../../data/repository/preview-yield-repository';
import type { YieldTarget } from '../../domain/entity/yield-entity';
import type { YieldMoveRequest } from '../../domain/entity/yield-move';
import type { YieldQuote } from '../../domain/entity/yield-quote';
import type { YieldSigningOutcome } from '../../domain/port/yield-signing-port';
import { useYieldMove } from './use-yield-move';

const TARGET: YieldTarget = {
  vaultId: 'preview-vault-usdc',
  tokenSymbol: 'USDC',
  tokenMint: PREVIEW_USDC_MINT,
  provider: 'jupiter',
};
const QUOTE: YieldQuote = {
  kind: 'deposit',
  amountMinor: 98_765,
  feeMinor: 25,
  totalMinor: 98_790,
  currency: 'USD',
};

const SECRETS = [
  'secret-challenge',
  'secret-user-token',
  'secret-encryption-key',
  'secret-transaction',
  'secret-signed-bytes',
];

function Move() {
  const { confirm, isConfirming, answer } = useYieldMove({ target: TARGET, quote: QUOTE });

  return (
    <>
      <Pressable accessibilityRole="button" onPress={confirm}>
        <Text>Confirm</Text>
      </Pressable>
      <Text>{isConfirming ? 'confirming' : answer?.ok === true ? answer.value.type : 'idle'}</Text>
    </>
  );
}

function testQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false, gcTime: 0 },
    },
  });
}

function signsWith(signedTransaction: string) {
  return () =>
    Promise.resolve(
      ok<YieldSigningOutcome>({
        type: 'settled',
        status: 'complete',
        resultType: 'signature',
        signedTransaction,
      }),
    );
}

function setUp({ sign }: { sign?: () => Promise<Result<YieldSigningOutcome, AppError>> } = {}) {
  const initiated: YieldMoveRequest[] = [];
  const preview = createPreviewYieldRepository();
  const appLockHold = createAppLockHold();
  const container = createTestContainer({
    appLockHold: asValue(appLockHold),
    yieldRepository: asValue({
      ...preview,
      initiate: (request: YieldMoveRequest) => {
        initiated.push(request);

        return Promise.resolve(
          ok({
            challenge: {
              challengeId: 'secret-challenge',
              userToken: 'secret-user-token',
              encryptionKey: 'secret-encryption-key',
            },
            transactionId: 'secret-transaction',
          }),
        );
      },
    }),
    yieldSigningPort: asValue({ sign: sign ?? signsWith('secret-signed-bytes') }),
  });
  const queryClient = testQueryClient();

  return { container, queryClient, initiated, appLockHold };
}

withMockServer();

describe('useYieldMove', () => {
  afterEach(() => {
    setLogSink(() => undefined);
  });

  it('leaves no credential, transaction id or signature in any cache or log line', async () => {
    server.use(
      http.post(`${testAppConfig.apiBaseUrl}/yield/deposit`, () =>
        HttpResponse.json({
          data: {
            challenge_id: 'secret-challenge',
            user_token: 'secret-user-token',
            encryption_key: 'secret-encryption-key',
            transaction_id: 'secret-transaction',
          },
        }),
      ),
      http.post(`${testAppConfig.apiBaseUrl}/yield/broadcast`, () =>
        HttpResponse.json({ data: { status: 'success' } }),
      ),
      http.post(`${testAppConfig.apiBaseUrl}/user/push/token`, () =>
        HttpResponse.json({ data: null, status_code: 200, msg: '' }),
      ),
    );
    const lines: string[] = [];
    setLogSink((line) => lines.push(line));
    const container = createTestContainer(
      { yieldSigningPort: asValue({ sign: signsWith('secret-signed-bytes') }) },
      testAppConfig,
    );
    await container.cradle.tokenStore.write({ access: 'owego-access', refresh: 'owego-refresh' });
    await container.cradle.registerPushTokenUseCase.execute();
    const queryClient = testQueryClient();
    await renderWithProviders(<Move />, { container, queryClient });

    await userEvent.setup().press(screen.getByRole('button'));
    await screen.findByText('succeeded');

    const cached = JSON.stringify([
      queryClient
        .getQueryCache()
        .getAll()
        .map((query) => query.state),
      queryClient
        .getMutationCache()
        .getAll()
        .map((mutation) => mutation.state),
    ]);
    const logged = lines.join('\n');
    expect(logged).toMatch(/POST \/yield\/deposit/i);
    expect(logged).toMatch(/POST \/yield\/broadcast/i);
    for (const secret of SECRETS) {
      expect(cached).not.toContain(secret);
      expect(logged).not.toContain(secret);
    }
    expect(logged).not.toContain('98765');
  });

  it('builds the move once however fast Confirm is tapped', async () => {
    let finish: (answer: Result<YieldSigningOutcome, AppError>) => void = () => undefined;
    const { container, queryClient, initiated } = setUp({
      sign: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    await renderWithProviders(<Move />, { container, queryClient });

    const user = userEvent.setup();
    await user.press(screen.getByRole('button'));
    await user.press(screen.getByRole('button'));
    await act(async () => {
      finish(
        ok({
          type: 'settled',
          status: 'complete',
          resultType: 'signature',
          signedTransaction: 'secret-signed-bytes',
        }),
      );
    });

    expect(await screen.findByText('succeeded')).toBeTruthy();
    expect(initiated).toHaveLength(1);
  });

  it('holds the app lock off while the move is in flight, and only then', async () => {
    let finish: (answer: Result<YieldSigningOutcome, AppError>) => void = () => undefined;
    const { container, queryClient, appLockHold } = setUp({
      sign: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    await renderWithProviders(<Move />, { container, queryClient });

    await userEvent.setup().press(screen.getByRole('button'));
    await waitFor(() => {
      expect(appLockHold.isHeld()).toBe(true);
    });

    await act(async () => {
      finish(ok({ type: 'cancelled' }));
    });

    await screen.findByText('cancelled');
    expect(appLockHold.isHeld()).toBe(false);
  });

  it('refreshes everything once the move has ended, and nothing when it never left', async () => {
    const ended = setUp();
    const refreshAll = jest.spyOn(ended.queryClient, 'invalidateQueries');
    const view = await renderWithProviders(<Move />, {
      container: ended.container,
      queryClient: ended.queryClient,
    });
    await userEvent.setup().press(screen.getByRole('button'));
    await screen.findByText('succeeded');
    expect(refreshAll).toHaveBeenCalledWith();
    await view.unmount();

    const cancelled = setUp({ sign: () => Promise.resolve(ok({ type: 'cancelled' })) });
    const untouched = jest.spyOn(cancelled.queryClient, 'invalidateQueries');
    await renderWithProviders(<Move />, {
      container: cancelled.container,
      queryClient: cancelled.queryClient,
    });
    await userEvent.setup().press(screen.getByRole('button'));
    await screen.findByText('cancelled');
    expect(untouched).not.toHaveBeenCalled();
  });
});
