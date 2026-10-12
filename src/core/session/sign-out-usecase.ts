import type { TokenStore } from '@/core/network/auth-tokens';
import type { SessionCleanupRegistry } from './session-cleanup';

type Dependencies = {
  sessionCleanup: SessionCleanupRegistry;
  tokenStore: TokenStore;
  signedOut: () => void;
};

export interface SignOutUseCase {
  execute(): Promise<void>;
}

export function createSignOutUseCase({
  sessionCleanup,
  tokenStore,
  signedOut,
}: Dependencies): SignOutUseCase {
  let inFlight: Promise<void> | undefined;

  async function run(): Promise<void> {
    try {
      await sessionCleanup.runAll();
    } catch {
      // The registry already resolves rather than rejects; this is belt and braces for a task
      // that throws synchronously on the way in.
    }

    await tokenStore.clear();
    signedOut();
  }

  return {
    execute() {
      inFlight ??= run().finally(() => {
        inFlight = undefined;
      });

      return inFlight;
    },
  };
}
