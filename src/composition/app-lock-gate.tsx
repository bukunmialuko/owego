import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';
import { useResolve } from '@/core/di/container-provider';
import { createAppLockTriggers } from '@/core/session/app-lock-triggers';
import { useSession } from '@/core/session/use-session';

export function AppLockGate({ children }: { children: ReactNode }) {
  const sessionStore = useResolve('sessionStore');
  const tokenStore = useResolve('tokenStore');
  const persistence = useResolve('tokenPersistence');
  const appLockHold = useResolve('appLockHold');
  const { status, stage } = useSession();

  const isLive = status === 'authenticated' && stage !== 'locked';

  const [canLock, setCanLock] = useState(false);

  useEffect(() => {
    if (!isLive) return;

    let cancelled = false;
    void persistence.persists().then((persists) => {
      if (!cancelled) setCanLock(persists);
    });

    return () => {
      cancelled = true;
    };
  }, [isLive, persistence]);

  const isArmed = isLive && canLock;

  const triggers = useMemo(
    () =>
      createAppLockTriggers({
        isHeld: () => appLockHold.isHeld(),
        onLock: () => {
          tokenStore.lock();
          sessionStore.getState().locked();
        },
      }),
    [sessionStore, tokenStore, appLockHold],
  );

  useEffect(
    () => () => {
      triggers.dispose();
    },
    [triggers],
  );

  useEffect(() => {
    if (!isArmed) {
      triggers.suspend();
      return;
    }

    triggers.touched();

    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        triggers.resumed();
        return;
      }

      triggers.backgrounded();
    });

    return () => {
      subscription.remove();
      triggers.suspend();
    };
  }, [isArmed, triggers]);

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        if (isArmed) triggers.touched();

        return false;
      }}
    >
      {children}
    </View>
  );
}
