import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, PanResponder } from 'react-native';
import { useResolve } from '@/core/di/container-provider';
import { createBackSwipeConfig } from './back-swipe';

export function useOnboardingExit() {
  const signOut = useResolve('signOutUseCase');
  const [isConfirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setConfirmOpen(true);

      return true;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const open = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const panResponder = useMemo(() => PanResponder.create(createBackSwipeConfig(open)), [open]);

  const confirmExit = useCallback(async () => {
    setConfirmOpen(false);
    await signOut.execute();
  }, [signOut]);

  return {
    isConfirmOpen,
    open,
    dismiss: () => {
      setConfirmOpen(false);
    },
    confirmExit,
    panHandlers: panResponder.panHandlers,
  };
}
