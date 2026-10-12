import { ErrorCategory, type AppError } from '@/core/errors/app-error';
import { isUsableWallet } from '@/core/wallet/wallet';
import type { Wallet } from '../entity/wallet-entity';
import type { WalletRepository, WalletListRequest } from '../repository/wallet-repository';

const POLL_BUDGET_MS = 300_000;
const EARLY_WAITS_MS = [2_000, 3_000, 5_000, 8_000, 13_000];
const STEADY_WAIT_MS = 20_000;
const SCHEDULE_SPREAD = 0.2;
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_CAP_MS = 60_000;
const BACKOFF_SPREAD = 0.5;
export const POLL_REQUEST_TIMEOUT_MS = 15_000;
const SLOW_AFTER_MS = 30_000;

export type WalletProvisioningProgress = 'checking' | 'slow' | 'reconnecting';

export type WalletProvisioningOutcome =
  | { type: 'success'; wallets: Wallet[] }
  | { type: 'failure'; error: AppError }
  | { type: 'timeout' }
  | { type: 'cancelled' };

type Dependencies = {
  walletRepository: WalletRepository;
  now?: () => number;
  delay?: (ms: number, signal?: AbortSignal) => Promise<void>;
  random?: () => number;
};

type ExecuteOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: WalletProvisioningProgress) => void;
  checkNow?: boolean;
};

export interface StreamWalletProvisioningUseCase {
  execute(options?: ExecuteOptions): Promise<WalletProvisioningOutcome>;
}

export function createStreamWalletProvisioningUseCase({
  walletRepository,
  now = () => Date.now(),
  delay = sleep,
  random = Math.random,
}: Dependencies): StreamWalletProvisioningUseCase {
  const jittered = (ms: number, spread: number) =>
    Math.round(ms * (1 + (random() * 2 - 1) * spread));

  return {
    async execute({ signal, onProgress, checkNow = false } = {}) {
      const started = now();
      const deadline = started + POLL_BUDGET_MS;
      const request: WalletListRequest = {
        ...(signal === undefined ? {} : { signal }),
        timeoutMs: POLL_REQUEST_TIMEOUT_MS,
      };

      const isAborted = () => signal?.aborted === true;

      let reported: WalletProvisioningProgress | undefined;
      const report = (progress: WalletProvisioningProgress) => {
        if (progress === reported) return;
        reported = progress;
        onProgress?.(progress);
      };

      let checks = 0;
      let failures = 0;
      let lastError: AppError | undefined;

      report('checking');

      for (;;) {
        if (isAborted()) return { type: 'cancelled' };

        const wait =
          lastError === undefined
            ? scheduledWait(checks, checkNow, jittered)
            : backoffWait(failures, lastError, jittered);

        if (now() + wait > deadline) break;
        if (wait > 0) await delay(wait, signal);
        if (isAborted()) return { type: 'cancelled' };

        const result = await walletRepository.getWallets(request);
        checks += 1;

        if (isAborted()) return { type: 'cancelled' };

        if (result.ok) {
          if (result.value.some(isUsableWallet)) return { type: 'success', wallets: result.value };

          failures = 0;
          lastError = undefined;
          report(now() - started >= SLOW_AFTER_MS ? 'slow' : 'checking');
          continue;
        }

        if (!result.error.retryable) return { type: 'failure', error: result.error };

        failures += 1;
        lastError = result.error;
        if (result.error.category === ErrorCategory.Network) report('reconnecting');
      }

      return lastError === undefined ? { type: 'timeout' } : { type: 'failure', error: lastError };
    },
  };
}

function scheduledWait(
  checks: number,
  checkNow: boolean,
  jittered: (ms: number, spread: number) => number,
): number {
  if (checks === 0 && checkNow) return 0;

  return jittered(EARLY_WAITS_MS[checks] ?? STEADY_WAIT_MS, SCHEDULE_SPREAD);
}

function backoffWait(
  failures: number,
  error: AppError,
  jittered: (ms: number, spread: number) => number,
): number {
  const backoff = jittered(
    Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** (failures - 1)),
    BACKOFF_SPREAD,
  );
  const retryAfterMs = (error.retryAfterSeconds ?? 0) * 1_000;

  return Math.max(backoff, retryAfterMs);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve();
      return;
    }

    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal?.addEventListener('abort', finish, { once: true });
  });
}
