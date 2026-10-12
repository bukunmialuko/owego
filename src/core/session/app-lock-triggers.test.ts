import { BACKGROUND_GRACE_MS, IDLE_TIMEOUT_MS, createAppLockTriggers } from './app-lock-triggers';

function build({ isHeld = () => false }: { isHeld?: () => boolean } = {}) {
  let clock = 0;
  let nextHandle = 1;
  const timers = new Map<number, { at: number; callback: () => void }>();
  const locks: number[] = [];

  const triggers = createAppLockTriggers({
    onLock: () => locks.push(clock),
    isHeld,
    now: () => clock,
    setTimer: (callback, ms) => {
      const handle = nextHandle++;
      timers.set(handle, { at: clock + ms, callback });
      return handle;
    },
    clearTimer: (handle) => timers.delete(handle),
  });

  return {
    triggers,
    locks,
    advance(ms: number) {
      clock += ms;
      for (const [handle, timer] of [...timers]) {
        if (timer.at <= clock) {
          timers.delete(handle);
          timer.callback();
        }
      }
    },
    get pendingTimers() {
      return timers.size;
    },
  };
}

describe('AppLockTriggers', () => {
  describe('returning from the background', () => {
    it('locks once the grace window has passed', () => {
      const { triggers, locks, advance } = build();

      triggers.backgrounded();
      advance(BACKGROUND_GRACE_MS);
      triggers.resumed();

      expect(locks).toHaveLength(1);
    });

    it('does not lock inside the grace window', () => {
      const { triggers, locks, advance } = build();

      triggers.backgrounded();
      advance(BACKGROUND_GRACE_MS - 1);
      triggers.resumed();

      expect(locks).toEqual([]);
    });

    it('does not run the idle countdown while backgrounded', () => {
      const { triggers, locks, advance } = build();

      triggers.backgrounded();
      advance(IDLE_TIMEOUT_MS * 2);

      expect(locks).toEqual([]);
    });
  });

  describe('idling in the foreground', () => {
    it('locks once the idle window has passed', () => {
      const { triggers, locks, advance } = build();

      triggers.touched();
      advance(IDLE_TIMEOUT_MS);

      expect(locks).toHaveLength(1);
    });

    it('does not lock before it', () => {
      const { triggers, locks, advance } = build();

      triggers.touched();
      advance(IDLE_TIMEOUT_MS - 1);

      expect(locks).toEqual([]);
    });

    it('restarts on every interaction', () => {
      const { triggers, locks, advance } = build();

      triggers.touched();
      advance(IDLE_TIMEOUT_MS - 1);
      triggers.touched();
      advance(IDLE_TIMEOUT_MS - 1);

      expect(locks).toEqual([]);
    });

    it('locks eventually once interaction stops', () => {
      const { triggers, locks, advance } = build();

      triggers.touched();
      advance(IDLE_TIMEOUT_MS - 1);
      triggers.touched();
      advance(IDLE_TIMEOUT_MS);

      expect(locks).toHaveLength(1);
    });
  });

  describe('suspending', () => {
    it('stops the idle countdown', () => {
      const { triggers, locks, advance } = build();

      triggers.touched();
      triggers.suspend();
      advance(IDLE_TIMEOUT_MS * 2);

      expect(locks).toEqual([]);
    });

    it('forgets a pending background window', () => {
      const { triggers, locks, advance } = build();

      triggers.backgrounded();
      triggers.suspend();
      advance(BACKGROUND_GRACE_MS * 2);
      triggers.resumed();

      expect(locks).toEqual([]);
    });
  });

  describe('while a money move holds the lock off', () => {
    it('does not lock on idle, and counts down afresh instead', () => {
      let held = true;
      const { triggers, locks, advance } = build({ isHeld: () => held });

      triggers.touched();
      advance(IDLE_TIMEOUT_MS);
      expect(locks).toEqual([]);

      held = false;
      advance(IDLE_TIMEOUT_MS);
      expect(locks).toHaveLength(1);
    });

    it('does not lock on returning past the grace window', () => {
      const { triggers, locks, advance } = build({ isHeld: () => true });

      triggers.backgrounded();
      advance(BACKGROUND_GRACE_MS * 2);
      triggers.resumed();

      expect(locks).toEqual([]);
    });
  });

  it('leaves no timer running once disposed', () => {
    const harness = build();

    harness.triggers.touched();
    harness.triggers.dispose();

    expect(harness.pendingTimers).toBe(0);
  });

  it('uses windows longer than v1s, with the reasoning recorded', () => {
    expect(BACKGROUND_GRACE_MS).toBe(30_000);
    expect(IDLE_TIMEOUT_MS).toBe(120_000);
  });
});
