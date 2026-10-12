import { act, renderHook } from '@testing-library/react-native';
import { usePinSetup, type PinSetupResult } from './use-pin-setup';

const MISMATCH = 'Those PINs didn’t match.';

function setup(
  onSubmit: (pin: string) => Promise<PinSetupResult> = () => Promise.resolve({ type: 'done' }),
) {
  return renderHook(() => usePinSetup({ onSubmit, mismatchMessage: MISMATCH }));
}

type Hook = Awaited<ReturnType<typeof setup>>['result'];

async function enter(result: Hook, pin: string) {
  await act(async () => {
    result.current.setPin(pin);
  });
  await act(async () => {
    await result.current.submit();
  });
}

describe('usePinSetup', () => {
  it('starts on the create step, empty', async () => {
    const { result } = await setup();

    expect(result.current).toMatchObject({ step: 'create', pin: '', message: undefined });
  });

  it('moves to the confirm step once four digits are submitted, clearing the entry', async () => {
    const { result } = await setup();

    await enter(result, '1357');

    expect(result.current).toMatchObject({ step: 'confirm', pin: '' });
  });

  it('does not move on with fewer than four digits', async () => {
    const { result } = await setup();

    await enter(result, '135');

    expect(result.current.step).toBe('create');
  });

  it('clears the entry and says so when the two pins differ', async () => {
    const onSubmit = jest.fn(() => Promise.resolve<PinSetupResult>({ type: 'done' }));
    const { result } = await setup(onSubmit);

    await enter(result, '1357');
    await enter(result, '2468');

    expect(result.current).toMatchObject({ step: 'confirm', pin: '', message: MISMATCH });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands over the pin once both entries match', async () => {
    const onSubmit = jest.fn(() => Promise.resolve<PinSetupResult>({ type: 'done' }));
    const { result } = await setup(onSubmit);

    await enter(result, '1357');
    await enter(result, '1357');

    expect(onSubmit).toHaveBeenCalledWith('1357');
  });

  it('starts over from the create step when told to, saying why', async () => {
    const { result } = await setup(() =>
      Promise.resolve({ type: 'restart', message: 'Don’t use consecutive digits.' }),
    );

    await enter(result, '1234');
    await enter(result, '1234');

    expect(result.current).toMatchObject({
      step: 'create',
      pin: '',
      message: 'Don’t use consecutive digits.',
    });
  });

  it('stays on the confirmation, cleared, when told to retry', async () => {
    const { result } = await setup(() => Promise.resolve({ type: 'retry', message: 'No sensor.' }));

    await enter(result, '1357');
    await enter(result, '1357');

    expect(result.current).toMatchObject({ step: 'confirm', pin: '', message: 'No sensor.' });
  });

  it('changes nothing when told to stay', async () => {
    const { result } = await setup(() => Promise.resolve({ type: 'stay' }));

    await enter(result, '1357');
    await enter(result, '1357');

    expect(result.current).toMatchObject({ step: 'confirm', pin: '1357', message: undefined });
  });

  it('reports itself busy while the pin is handed over', async () => {
    let finish: (() => void) | undefined;
    const { result } = await setup(
      () =>
        new Promise<PinSetupResult>((resolve) => {
          finish = () => {
            resolve({ type: 'done' });
          };
        }),
    );
    await enter(result, '1357');
    await act(async () => {
      result.current.setPin('1357');
    });

    let submitted: Promise<void> | undefined;
    await act(async () => {
      submitted = result.current.submit();
    });
    expect(result.current.isBusy).toBe(true);

    await act(async () => {
      finish?.();
      await submitted;
    });
    expect(result.current.isBusy).toBe(false);
  });

  it('clears a message as soon as the user starts typing again', async () => {
    const { result } = await setup();
    await enter(result, '1357');
    await enter(result, '2468');

    await act(async () => {
      result.current.setPin('1');
    });

    expect(result.current.message).toBeUndefined();
  });

  describe('going back', () => {
    it('returns from the confirm step to an empty create step', async () => {
      const { result } = await setup();
      await enter(result, '1357');

      let handled = false;
      await act(async () => {
        handled = result.current.back();
      });

      expect(handled).toBe(true);
      expect(result.current).toMatchObject({ step: 'create', pin: '' });
    });

    it('leaves the create step to the caller', async () => {
      const { result } = await setup();

      let handled = true;
      await act(async () => {
        handled = result.current.back();
      });

      expect(handled).toBe(false);
    });
  });
});
