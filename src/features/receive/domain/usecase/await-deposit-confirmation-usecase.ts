import { cancelled, type AppError } from '@/core/errors/app-error';
import { err, ok, type Result } from '@/core/result/result';
import type { DepositConfirmation, SignatureStatus } from '../entity/external-deposit';
import type { SolanaNetworkRepository } from '../repository/solana-network-repository';

const TIMEOUT_MS = 30_000;
const INTERVAL_MS = 2_000;

type Dependencies = {
  solanaNetworkRepository: SolanaNetworkRepository;
  now?: () => number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
};

export interface AwaitDepositConfirmationUseCase {
  execute(signature: string, signal?: AbortSignal): Promise<Result<DepositConfirmation, AppError>>;
}

export function createAwaitDepositConfirmationUseCase({
  solanaNetworkRepository,
  now = Date.now,
  sleep = sleepFor,
}: Dependencies): AwaitDepositConfirmationUseCase {
  return {
    async execute(signature, signal) {
      const deadline = now() + TIMEOUT_MS;

      for (;;) {
        if (signal?.aborted === true) return err(cancelled());

        const status = await solanaNetworkRepository.getSignatureStatus(signature);
        const settled = status.ok ? settledAs(status.value) : undefined;
        if (settled !== undefined) return ok(settled);
        if (now() >= deadline) return ok('pending');

        await sleep(INTERVAL_MS, signal);
      }
    },
  };
}

function settledAs(status: SignatureStatus): DepositConfirmation | undefined {
  if (status.type === 'unknown' || status.commitment === 'processed') return undefined;
  return status.failed ? 'failed' : 'confirmed';
}

function sleepFor(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}
