export const BACKGROUND_GRACE_MS = 30_000;

export const IDLE_TIMEOUT_MS = 120_000;

type Dependencies = {
  onLock: () => void;
  isHeld?: () => boolean;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => number;
  clearTimer?: (handle: number) => void;
};

export interface AppLockTriggers {
  backgrounded(): void;
  resumed(): void;
  touched(): void;
  suspend(): void;
  dispose(): void;
}

export function createAppLockTriggers({
  onLock,
  isHeld = () => false,
  now = () => Date.now(),
  setTimer = (callback, ms) => setTimeout(callback, ms) as unknown as number,
  clearTimer = (handle) => clearTimeout(handle),
}: Dependencies): AppLockTriggers {
  let backgroundedAt: number | undefined;
  let idleHandle: number | undefined;

  function stopIdleCountdown() {
    if (idleHandle !== undefined) clearTimer(idleHandle);
    idleHandle = undefined;
  }

  function startIdleCountdown() {
    stopIdleCountdown();
    idleHandle = setTimer(() => {
      idleHandle = undefined;
      if (isHeld()) {
        startIdleCountdown();
        return;
      }
      onLock();
    }, IDLE_TIMEOUT_MS);
  }

  return {
    backgrounded() {
      backgroundedAt = now();
      stopIdleCountdown();
    },

    resumed() {
      const since = backgroundedAt;
      backgroundedAt = undefined;

      if (since !== undefined && now() - since >= BACKGROUND_GRACE_MS && !isHeld()) {
        onLock();
        return;
      }

      startIdleCountdown();
    },

    touched() {
      startIdleCountdown();
    },

    suspend() {
      stopIdleCountdown();
      backgroundedAt = undefined;
    },

    dispose() {
      stopIdleCountdown();
    },
  };
}
