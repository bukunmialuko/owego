import { BACK_SWIPE_EDGE, createBackSwipeConfig, isBackSwipe } from './back-swipe';

describe('isBackSwipe', () => {
  const from = (x0: number, dx: number, dy = 0) => ({ x0, dx, dy });

  it('accepts a decisive drag inward from the left edge', () => {
    expect(isBackSwipe(from(4, 80))).toBe(true);
  });

  it('rejects a drag that began away from the edge', () => {
    expect(isBackSwipe(from(BACK_SWIPE_EDGE + 1, 80))).toBe(false);
  });

  it('accepts one starting exactly on the edge boundary', () => {
    expect(isBackSwipe(from(BACK_SWIPE_EDGE, 80))).toBe(true);
  });

  it('rejects a drag too short to be deliberate', () => {
    expect(isBackSwipe(from(4, 10))).toBe(false);
  });

  it('rejects a drag in the wrong direction', () => {
    expect(isBackSwipe(from(4, -80))).toBe(false);
  });

  it('rejects a drag that is more vertical than horizontal', () => {
    expect(isBackSwipe(from(4, 80, 120))).toBe(false);
  });

  it('ignores the sign of the vertical component', () => {
    expect(isBackSwipe(from(4, 80, -120))).toBe(false);
  });
});

describe('createBackSwipeConfig', () => {
  const EVENT = {};
  const swipe = { x0: 4, dx: 80, dy: 0 };
  const scroll = { x0: 4, dx: 6, dy: 140 };

  it('claims the responder for a back swipe', () => {
    const config = createBackSwipeConfig(jest.fn());

    expect(config.onMoveShouldSetPanResponder(EVENT, swipe)).toBe(true);
  });

  it('leaves a vertical drag to the scroll view', () => {
    const config = createBackSwipeConfig(jest.fn());

    expect(config.onMoveShouldSetPanResponder(EVENT, scroll)).toBe(false);
  });

  it('runs on release', () => {
    const onSwipe = jest.fn();

    createBackSwipeConfig(onSwipe).onPanResponderRelease(EVENT, swipe);

    expect(onSwipe).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the gesture was abandoned before release', () => {
    const onSwipe = jest.fn();

    createBackSwipeConfig(onSwipe).onPanResponderRelease(EVENT, { x0: 4, dx: 2, dy: 0 });

    expect(onSwipe).not.toHaveBeenCalled();
  });
});
