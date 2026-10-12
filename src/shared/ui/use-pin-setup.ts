import { useCallback, useState } from 'react';
import { PIN_LENGTH } from './pin-entry-layout';

export type PinSetupStep = 'create' | 'confirm';

export type PinSetupResult =
  | { type: 'done' }
  | { type: 'restart'; message: string }
  | { type: 'retry'; message: string }
  | { type: 'stay' };

type Options = {
  onSubmit: (pin: string) => Promise<PinSetupResult>;
  mismatchMessage: string;
};

export function usePinSetup({ onSubmit, mismatchMessage }: Options) {
  const [step, setStep] = useState<PinSetupStep>('create');
  const [firstEntry, setFirstEntry] = useState('');
  const [pin, setPinState] = useState('');
  const [message, setMessage] = useState<string | undefined>(undefined);
  const [isBusy, setBusy] = useState(false);

  const setPin = useCallback((next: string) => {
    setPinState(next);
    if (next.length > 0) setMessage(undefined);
  }, []);

  const startOver = useCallback((reason?: string) => {
    setStep('create');
    setFirstEntry('');
    setPinState('');
    setMessage(reason);
  }, []);

  const submit = useCallback(async () => {
    if (pin.length !== PIN_LENGTH || isBusy) return;

    if (step === 'create') {
      setFirstEntry(pin);
      setPinState('');
      setMessage(undefined);
      setStep('confirm');
      return;
    }

    if (pin !== firstEntry) {
      setPinState('');
      setMessage(mismatchMessage);
      return;
    }

    setBusy(true);
    try {
      const result = await onSubmit(pin);

      switch (result.type) {
        case 'done':
        case 'stay':
          return;
        case 'restart':
          startOver(result.message);
          return;
        case 'retry':
          setPinState('');
          setMessage(result.message);
          return;
      }
    } finally {
      setBusy(false);
    }
  }, [firstEntry, isBusy, mismatchMessage, onSubmit, pin, startOver, step]);

  const back = useCallback((): boolean => {
    if (step === 'create') return false;

    startOver();
    return true;
  }, [startOver, step]);

  return { step, pin, setPin, message, isBusy, submit, back };
}
