import { useEffect, useState } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  type KeyboardEvent,
  type KeyboardEventName,
} from 'react-native';

const SHOW: KeyboardEventName[] = ['keyboardWillShow', 'keyboardDidShow'];
const HIDE: KeyboardEventName[] = ['keyboardWillHide', 'keyboardDidHide'];

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    let current = 0;

    function follow(event: KeyboardEvent, next: number) {
      if (next === current) return;
      current = next;
      moveWithKeyboard(event);
      setHeight(next);
    }

    const subscriptions = [
      ...SHOW.map((name) =>
        Keyboard.addListener(name, (event) => {
          follow(event, event.endCoordinates.height);
        }),
      ),
      ...HIDE.map((name) =>
        Keyboard.addListener(name, (event) => {
          follow(event, 0);
        }),
      ),
    ];

    return () => {
      for (const subscription of subscriptions) subscription.remove();
    };
  }, []);

  return height;
}

const MIN_LAYOUT_ANIMATION_MS = 10;

function moveWithKeyboard({ duration, easing }: KeyboardEvent) {
  if (duration <= 0) return;

  const ms = Math.max(duration, MIN_LAYOUT_ANIMATION_MS);
  LayoutAnimation.configureNext({
    duration: ms,
    update: { duration: ms, type: LayoutAnimation.Types[easing] },
  });
}
