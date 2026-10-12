import { MAX_HOLD_MS, createAppLockHold } from './app-lock-hold';

function build() {
  let clock = 0;
  const hold = createAppLockHold({ now: () => clock });

  return {
    hold,
    advance(ms: number) {
      clock += ms;
    },
  };
}

describe('AppLockHold', () => {
  it('is held from hold() until it is released', () => {
    const { hold } = build();

    const release = hold.hold();
    expect(hold.isHeld()).toBe(true);

    release();
    expect(hold.isHeld()).toBe(false);
  });

  it('stays held while any one hold remains', () => {
    const { hold } = build();

    const first = hold.hold();
    const second = hold.hold();
    first();

    expect(hold.isHeld()).toBe(true);
    second();
    expect(hold.isHeld()).toBe(false);
  });

  it('lapses on its own after the longest a move can take', () => {
    const { hold, advance } = build();

    hold.hold();
    advance(MAX_HOLD_MS - 1);
    expect(hold.isHeld()).toBe(true);

    advance(1);
    expect(hold.isHeld()).toBe(false);
  });

  it('ignores a release called twice', () => {
    const { hold } = build();

    const release = hold.hold();
    const other = hold.hold();
    release();
    release();

    expect(hold.isHeld()).toBe(true);
    other();
  });
});
