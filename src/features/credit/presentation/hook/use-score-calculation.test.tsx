import { AccessibilityInfo } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useScoreCalculation } from './use-score-calculation';

jest.useFakeTimers();

const reduceMotion = jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled');

describe('useScoreCalculation', () => {
  beforeEach(() => {
    reduceMotion.mockResolvedValue(false);
  });

  it('completes each step in turn', async () => {
    const onComplete = jest.fn();
    const { result } = await renderHook(() => useScoreCalculation(3, onComplete, true));

    expect(result.current.completedSteps).toBe(0);

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    expect(result.current.completedSteps).toBe(1);

    await act(async () => {
      jest.advanceTimersByTime(3600);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('finishes immediately when the user has asked for less motion', async () => {
    reduceMotion.mockResolvedValue(true);
    const onComplete = jest.fn();

    const { result } = await renderHook(() => useScoreCalculation(3, onComplete, true));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.completedSteps).toBe(3);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('stays idle until it is started', async () => {
    const onComplete = jest.fn();
    const { result } = await renderHook(() => useScoreCalculation(3, onComplete, false));

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(result.current.completedSteps).toBe(0);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('stays idle when it has not been started even with reduce motion on', async () => {
    reduceMotion.mockResolvedValue(true);
    const onComplete = jest.fn();

    await renderHook(() => useScoreCalculation(3, onComplete, false));

    await act(async () => {
      await Promise.resolve();
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not call back after it has been unmounted mid-sequence', async () => {
    const onComplete = jest.fn();
    const { result, unmount } = await renderHook(() => useScoreCalculation(3, onComplete, true));

    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    expect(result.current.completedSteps).toBe(1);

    await unmount();

    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});
