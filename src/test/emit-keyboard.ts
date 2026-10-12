import { act } from '@testing-library/react-native';
import { DeviceEventEmitter, type KeyboardEvent, type KeyboardEventName } from 'react-native';

export async function emitKeyboard(
  event: KeyboardEventName,
  height: number,
  motion: Partial<Pick<KeyboardEvent, 'duration' | 'easing'>> = {},
) {
  const payload: KeyboardEvent = {
    duration: motion.duration ?? 250,
    easing: motion.easing ?? 'keyboard',
    endCoordinates: { screenX: 0, screenY: 844 - height, width: 390, height },
  };

  await act(async () => {
    DeviceEventEmitter.emit(event, payload);
  });
}
