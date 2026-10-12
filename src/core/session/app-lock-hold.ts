export const MAX_HOLD_MS = 5 * 60_000;

export interface AppLockHold {
  hold(): () => void;
  isHeld(): boolean;
}

export function createAppLockHold({ now = () => Date.now() }: { now?: () => number } = {}) {
  const holds = new Map<symbol, number>();

  const hold: AppLockHold = {
    hold() {
      const id = Symbol('hold');
      holds.set(id, now());

      return () => {
        holds.delete(id);
      };
    },

    isHeld() {
      for (const [id, since] of holds) {
        if (now() - since >= MAX_HOLD_MS) holds.delete(id);
      }

      return holds.size > 0;
    },
  };

  return hold;
}
