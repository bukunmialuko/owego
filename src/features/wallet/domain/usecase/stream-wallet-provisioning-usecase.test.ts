import { forbidden, offline, rateLimited, serverError } from '@/core/errors/app-error';
import { err, ok } from '@/core/result/result';
import type { WalletRepository } from '../repository/wallet-repository';
import {
  POLL_REQUEST_TIMEOUT_MS,
  createStreamWalletProvisioningUseCase,
  type WalletProvisioningProgress,
} from './stream-wallet-provisioning-usecase';

const wallet = { id: 'w1', address: '4k3D', blockchain: 'SOL', balances: [] };
const addressless = { ...wallet, address: '' };

type Response = Awaited<ReturnType<WalletRepository['getWallets']>>;

function build(responses: Response[], options: { random?: () => number } = {}) {
  let clock = 0;
  const delays: number[] = [];
  const progress: WalletProvisioningProgress[] = [];
  let call = 0;
  let inFlight = 0;
  let maxInFlight = 0;

  const getWallets = jest.fn(async () => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    await Promise.resolve();
    inFlight -= 1;
    return response!;
  });

  const walletRepository = {
    getWallets,
    createChallenge: jest.fn(),
    createPinChangeChallenge: jest.fn(),
  } satisfies WalletRepository;

  const usecase = createStreamWalletProvisioningUseCase({
    walletRepository,
    now: () => clock,
    delay: (ms: number) => {
      delays.push(ms);
      clock += ms;
      return Promise.resolve();
    },
    random: options.random ?? (() => 0.5),
  });

  return {
    usecase,
    getWallets,
    delays,
    progress,
    onProgress: (step: WalletProvisioningProgress) => progress.push(step),
    calls: () => call,
    maxInFlight: () => maxInFlight,
  };
}

describe('StreamWalletProvisioningUseCase', () => {
  describe('schedule', () => {
    it('first checks two seconds after Circle reports, then on the front-loaded schedule', async () => {
      const { usecase, delays } = build([ok([]), ok([]), ok([]), ok([]), ok([]), ok([wallet])]);

      await expect(usecase.execute()).resolves.toEqual({ type: 'success', wallets: [wallet] });
      expect(delays).toEqual([2_000, 3_000, 5_000, 8_000, 13_000, 20_000]);
    });

    it('checks at once when asked to', async () => {
      const { usecase, calls, delays } = build([ok([wallet])]);

      await expect(usecase.execute({ checkNow: true })).resolves.toEqual({
        type: 'success',
        wallets: [wallet],
      });
      expect(calls()).toBe(1);
      expect(delays).toEqual([]);
    });

    it('spreads its checks with jitter', async () => {
      const early = build([ok([wallet])], { random: () => 0 });
      const late = build([ok([wallet])], { random: () => 1 });

      await early.usecase.execute();
      await late.usecase.execute();

      expect(early.delays).toEqual([1_600]);
      expect(late.delays).toEqual([2_400]);
    });

    it('settles to one check every 20 seconds', async () => {
      const { usecase, delays } = build([ok([])]);

      await usecase.execute();

      expect(delays.slice(5).every((ms) => ms === 20_000)).toBe(true);
    });

    it('gives up after eighteen checks once the five-minute budget is spent', async () => {
      const { usecase, calls } = build([ok([])]);

      await expect(usecase.execute()).resolves.toEqual({ type: 'timeout' });
      expect(calls()).toBe(18);
    });

    it('keeps waiting while the only wallet has no address', async () => {
      const { usecase, calls } = build([ok([addressless]), ok([wallet])]);

      await expect(usecase.execute()).resolves.toEqual({ type: 'success', wallets: [wallet] });
      expect(calls()).toBe(2);
    });
  });

  describe('errors', () => {
    it('backs off exponentially through repeated server errors', async () => {
      const { usecase, delays } = build([
        err(serverError()),
        err(serverError()),
        err(serverError()),
        err(serverError()),
        ok([wallet]),
      ]);

      await expect(usecase.execute()).resolves.toEqual({ type: 'success', wallets: [wallet] });
      expect(delays).toEqual([2_000, 5_000, 10_000, 20_000, 40_000]);
    });

    it('never waits longer than a minute between retries', async () => {
      const { usecase, delays } = build([
        ...Array.from({ length: 6 }, () => err(serverError())),
        ok([wallet]),
      ]);

      await usecase.execute();

      expect(delays.slice(-2)).toEqual([60_000, 60_000]);
    });

    it('waits at least as long as the server’s Retry-After', async () => {
      const { usecase, delays } = build([err(rateLimited(90)), ok([wallet])]);

      await usecase.execute();

      expect(delays).toEqual([2_000, 90_000]);
    });

    it('resets the backoff after a successful check', async () => {
      const { usecase, delays } = build([
        err(serverError()),
        ok([]),
        err(serverError()),
        ok([wallet]),
      ]);

      await usecase.execute();

      expect(delays).toEqual([2_000, 5_000, 5_000, 5_000]);
    });

    it('stops at once on a failure retrying cannot fix', async () => {
      const { usecase, calls } = build([err(forbidden())]);

      await expect(usecase.execute()).resolves.toEqual({ type: 'failure', error: forbidden() });
      expect(calls()).toBe(1);
    });

    it('reports the last failure when the budget ends mid-outage', async () => {
      const { usecase } = build([err(offline())]);

      await expect(usecase.execute()).resolves.toEqual({ type: 'failure', error: offline() });
    });

    it('reports a timeout when the list stays empty', async () => {
      const { usecase } = build([err(offline()), ok([])]);

      await expect(usecase.execute()).resolves.toEqual({ type: 'timeout' });
    });
  });

  describe('progress', () => {
    it('reports checking from the start', async () => {
      const { usecase, onProgress, progress } = build([ok([wallet])]);

      await usecase.execute({ onProgress });

      expect(progress).toEqual(['checking']);
    });

    it('reports slow after thirty seconds without a wallet', async () => {
      const { usecase, onProgress, progress } = build([ok([])]);

      await usecase.execute({ onProgress });

      expect(progress).toEqual(['checking', 'slow']);
    });

    it('reports reconnecting while the connection is down, and checking once it is back', async () => {
      const { usecase, onProgress, progress } = build([err(offline()), ok([]), ok([wallet])]);

      await usecase.execute({ onProgress });

      expect(progress).toEqual(['checking', 'reconnecting', 'checking']);
    });

    it('does not blame the connection for a server error', async () => {
      const { usecase, onProgress, progress } = build([err(serverError()), ok([wallet])]);

      await usecase.execute({ onProgress });

      expect(progress).toEqual(['checking']);
    });
  });

  describe('each request', () => {
    it('never has two requests in flight', async () => {
      const { usecase, maxInFlight } = build([ok([]), ok([]), err(offline()), ok([wallet])]);

      await usecase.execute();

      expect(maxInFlight()).toBe(1);
    });

    it('passes its signal and a short timeout to each request', async () => {
      const controller = new AbortController();
      const { usecase, getWallets } = build([ok([wallet])]);

      await usecase.execute({ signal: controller.signal });

      expect(getWallets).toHaveBeenCalledWith({
        signal: controller.signal,
        timeoutMs: POLL_REQUEST_TIMEOUT_MS,
      });
      expect(POLL_REQUEST_TIMEOUT_MS).toBe(15_000);
    });
  });

  describe('cancellation', () => {
    it('stops when the caller aborts', async () => {
      const controller = new AbortController();
      const { usecase, calls } = build([ok([])]);

      const running = usecase.execute({ signal: controller.signal });
      controller.abort();

      await expect(running).resolves.toEqual({ type: 'cancelled' });
      expect(calls()).toBeLessThanOrEqual(1);
    });

    it('makes no request at all when aborted before it starts', async () => {
      const controller = new AbortController();
      controller.abort();
      const { usecase, calls } = build([ok([])]);

      await expect(usecase.execute({ signal: controller.signal })).resolves.toEqual({
        type: 'cancelled',
      });
      expect(calls()).toBe(0);
    });

    it('stops waiting the moment it is aborted', async () => {
      jest.useFakeTimers();
      try {
        const controller = new AbortController();
        const { getWallets } = build([ok([])]);
        const usecase = createStreamWalletProvisioningUseCase({
          walletRepository: {
            getWallets,
            createChallenge: jest.fn(),
            createPinChangeChallenge: jest.fn(),
          },
        });

        const running = usecase.execute({ signal: controller.signal });
        controller.abort();

        await expect(running).resolves.toEqual({ type: 'cancelled' });
        expect(getWallets).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });

    it('makes no further request when aborted while waiting', async () => {
      const controller = new AbortController();
      let calls = 0;
      const usecase = createStreamWalletProvisioningUseCase({
        walletRepository: {
          getWallets: () => {
            calls += 1;
            return Promise.resolve(ok([]));
          },
          createChallenge: jest.fn(),
          createPinChangeChallenge: jest.fn(),
        },
        now: () => 0,
        delay: () => {
          controller.abort();
          return Promise.resolve();
        },
      });

      await expect(usecase.execute({ signal: controller.signal })).resolves.toEqual({
        type: 'cancelled',
      });
      expect(calls).toBe(0);
    });
  });
});
