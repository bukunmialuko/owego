import { act, renderHook } from '@testing-library/react-native';
import { useHomeRefresh } from './use-home';

describe('useHomeRefresh', () => {
  it('is not refreshing until asked', async () => {
    const { result } = await renderHook(() => useHomeRefresh());

    expect(result.current.isRefreshing).toBe(false);
  });

  it('stays down until every refetch has settled', async () => {
    const { result } = await renderHook(() => useHomeRefresh());

    let releaseSlow = () => {};
    const slow = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });

    await act(async () => {
      result.current.runRefresh([Promise.resolve('fast'), slow]);
    });

    expect(result.current.isRefreshing).toBe(true);

    await act(async () => {
      releaseSlow();
    });

    expect(result.current.isRefreshing).toBe(false);
  });

  it('releases when a refetch rejects', async () => {
    const { result } = await renderHook(() => useHomeRefresh());

    await act(async () => {
      result.current.runRefresh([Promise.reject(new Error('offline'))]);
    });

    expect(result.current.isRefreshing).toBe(false);
  });
});
