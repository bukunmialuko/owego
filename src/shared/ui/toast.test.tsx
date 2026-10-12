import { act, renderHook, screen, userEvent } from '@testing-library/react-native';
import { renderWithProviders } from '@/test/render-with-providers';
import { Toast, useToast } from './toast';

jest.useFakeTimers();

describe('useToast', () => {
  it('holds nothing until something is shown', async () => {
    const { result } = await renderHook(() => useToast());

    expect(result.current.toast).toBeUndefined();
  });

  it('shows a message as an error unless told otherwise', async () => {
    const { result } = await renderHook(() => useToast());

    await act(async () => {
      result.current.show('We couldn’t save that change.');
    });

    expect(result.current.toast).toMatchObject({
      message: 'We couldn’t save that change.',
      tone: 'error',
    });
  });

  it('clears itself once its time is up', async () => {
    const { result } = await renderHook(() => useToast({ durationMs: 4_000 }));

    await act(async () => {
      result.current.show('We couldn’t save that change.');
    });
    await act(async () => {
      jest.advanceTimersByTime(3_999);
    });
    expect(result.current.toast).toBeDefined();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.toast).toBeUndefined();
  });

  it('gives a toast shown again its full time on screen', async () => {
    const { result } = await renderHook(() => useToast({ durationMs: 4_000 }));

    await act(async () => {
      result.current.show('We couldn’t save that change.');
    });
    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });
    await act(async () => {
      result.current.show('We couldn’t save that change.');
    });
    await act(async () => {
      jest.advanceTimersByTime(3_000);
    });

    expect(result.current.toast).toBeDefined();
  });

  it('can be hidden early', async () => {
    const { result } = await renderHook(() => useToast());

    await act(async () => {
      result.current.show('We couldn’t save that change.');
    });
    await act(async () => {
      result.current.hide();
    });

    expect(result.current.toast).toBeUndefined();
  });
});

describe('Toast', () => {
  const toast = { id: 1, message: 'We couldn’t save that change.', tone: 'error' as const };

  it('draws nothing when there is nothing to say', async () => {
    await renderWithProviders(
      <Toast toast={undefined} dismissLabel="Close" onDismiss={jest.fn()} />,
    );

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('announces the message as an alert', async () => {
    await renderWithProviders(<Toast toast={toast} dismissLabel="Close" onDismiss={jest.fn()} />);

    expect(await screen.findByRole('alert')).toBeOnTheScreen();
    expect(screen.getByText('We couldn’t save that change.')).toBeOnTheScreen();
  });

  it('offers a way to dismiss it before it goes', async () => {
    const onDismiss = jest.fn();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    await renderWithProviders(<Toast toast={toast} dismissLabel="Close" onDismiss={onDismiss} />);

    await user.press(await screen.findByRole('button', { name: 'Close' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
