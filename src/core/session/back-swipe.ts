export const BACK_SWIPE_EDGE = 24;

const MIN_DISTANCE = 48;

export function isBackSwipe(gesture: { x0: number; dx: number; dy: number }): boolean {
  return (
    gesture.x0 <= BACK_SWIPE_EDGE && gesture.dx >= MIN_DISTANCE && Math.abs(gesture.dy) < gesture.dx
  );
}

type SwipeGesture = { x0: number; dx: number; dy: number };

export function createBackSwipeConfig(onSwipe: () => void) {
  return {
    onMoveShouldSetPanResponder: (_event: unknown, gesture: SwipeGesture) => isBackSwipe(gesture),
    onPanResponderRelease: (_event: unknown, gesture: SwipeGesture) => {
      if (isBackSwipe(gesture)) onSwipe();
    },
  };
}
