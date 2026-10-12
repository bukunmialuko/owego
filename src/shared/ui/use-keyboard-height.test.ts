import { renderHook } from '@testing-library/react-native';
import { DeviceEventEmitter, LayoutAnimation, type KeyboardEventName } from 'react-native';
import { emitKeyboard } from '@/test/emit-keyboard';
import { useKeyboardHeight } from './use-keyboard-height';

const KEYBOARD_EVENTS: KeyboardEventName[] = [
  'keyboardWillShow',
  'keyboardDidShow',
  'keyboardWillHide',
  'keyboardDidHide',
];

const subscriptionCount = () =>
  KEYBOARD_EVENTS.reduce((total, event) => total + DeviceEventEmitter.listenerCount(event), 0);

describe('useKeyboardHeight', () => {
  it('reports nothing while the keyboard is down', async () => {
    const { result } = await renderHook(() => useKeyboardHeight());

    expect(result.current).toBe(0);
  });

  it('reports the height as the keyboard starts coming up', async () => {
    const { result } = await renderHook(() => useKeyboardHeight());

    await emitKeyboard('keyboardWillShow', 336);

    expect(result.current).toBe(336);
  });

  it('reports the height when Android says the keyboard has appeared', async () => {
    const { result } = await renderHook(() => useKeyboardHeight());

    await emitKeyboard('keyboardDidShow', 297);

    expect(result.current).toBe(297);
  });

  it('returns to nothing once the keyboard goes down', async () => {
    const { result } = await renderHook(() => useKeyboardHeight());

    await emitKeyboard('keyboardWillShow', 336);
    await emitKeyboard('keyboardWillHide', 0);

    expect(result.current).toBe(0);
  });

  it('returns to nothing when Android says the keyboard has gone', async () => {
    const { result } = await renderHook(() => useKeyboardHeight());

    await emitKeyboard('keyboardDidShow', 297);
    await emitKeyboard('keyboardDidHide', 0);

    expect(result.current).toBe(0);
  });

  it('stops listening once it is unmounted', async () => {
    const before = subscriptionCount();

    const { unmount } = await renderHook(() => useKeyboardHeight());
    expect(subscriptionCount()).toBeGreaterThan(before);

    await unmount();

    expect(subscriptionCount()).toBe(before);
  });

  describe('moving with the keyboard', () => {
    const configureNext = jest.spyOn(LayoutAnimation, 'configureNext');

    beforeEach(() => {
      configureNext.mockClear();
    });

    it('animates the change at the pace and on the curve the keyboard moves with', async () => {
      await renderHook(() => useKeyboardHeight());

      await emitKeyboard('keyboardWillShow', 336, { duration: 250, easing: 'keyboard' });

      expect(configureNext).toHaveBeenCalledWith({
        duration: 250,
        update: { duration: 250, type: LayoutAnimation.Types.keyboard },
      });
    });

    it('animates the way down as well', async () => {
      await renderHook(() => useKeyboardHeight());
      await emitKeyboard('keyboardWillShow', 336);
      configureNext.mockClear();

      await emitKeyboard('keyboardWillHide', 0, { duration: 250, easing: 'easeInEaseOut' });

      expect(configureNext).toHaveBeenCalledWith({
        duration: 250,
        update: { duration: 250, type: LayoutAnimation.Types.easeInEaseOut },
      });
    });

    it('animates nothing for a height it already has', async () => {
      await renderHook(() => useKeyboardHeight());

      await emitKeyboard('keyboardWillShow', 336);
      await emitKeyboard('keyboardDidShow', 336);

      expect(configureNext).toHaveBeenCalledTimes(1);
    });

    it('lands at once when the platform reports no motion, as Android does', async () => {
      const { result } = await renderHook(() => useKeyboardHeight());

      await emitKeyboard('keyboardDidShow', 297, { duration: 0 });

      expect(result.current).toBe(297);
      expect(configureNext).not.toHaveBeenCalled();
    });
  });
});
