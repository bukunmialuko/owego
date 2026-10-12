import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useResolve } from '@/core/di/container-provider';
import type { AppError } from '@/core/errors/app-error';
import { devLog } from '@/core/log/dev-log';
import { useAdmitWalletHolder } from '@/core/session/use-admit-wallet-holder';
import type { WalletProvisioningProgress } from '../../domain/usecase/stream-wallet-provisioning-usecase';

export type ProvisioningView =
  | { phase: 'waiting'; progress: WalletProvisioningProgress }
  | { phase: 'stalled' }
  | { phase: 'failed' };

const WAITING: ProvisioningView = { phase: 'waiting', progress: 'checking' };

export function useWalletProvisioning() {
  const streamProvisioning = useResolve('streamWalletProvisioningUseCase');
  const admit = useAdmitWalletHolder();
  const [view, setView] = useState<ProvisioningView>(WAITING);
  const current = useRef<AbortController | undefined>(undefined);

  const run = useCallback(
    (checkNow: boolean) => {
      current.current?.abort();
      const controller = new AbortController();
      current.current = controller;
      const isCurrent = () => current.current === controller;

      void streamProvisioning
        .execute({
          signal: controller.signal,
          checkNow,
          onProgress: (progress) => {
            if (isCurrent()) setView({ phase: 'waiting', progress });
          },
        })
        .then((outcome) => {
          if (!isCurrent()) return;

          switch (outcome.type) {
            case 'success':
              void admit();
              return;

            case 'failure':
              logGaveUp(outcome.error);
              setView({ phase: 'failed' });
              return;

            case 'timeout':
              devLog('wallet', 'provisioning ran out of time');
              setView({ phase: 'stalled' });
              return;

            case 'cancelled':
              return;
          }
        });
    },
    [admit, streamProvisioning],
  );

  const restart = useCallback(() => {
    setView(WAITING);
    run(true);
  }, [run]);

  useEffect(() => {
    run(false);

    let isBackgrounded = false;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        isBackgrounded = true;
        current.current?.abort();
      } else if (state === 'active' && isBackgrounded) {
        isBackgrounded = false;
        restart();
      }
    });

    return () => {
      subscription.remove();
      current.current?.abort();
    };
  }, [restart, run]);

  return { view, checkAgain: restart };
}

function logGaveUp(error: AppError): void {
  const fields = Object.keys(error.fieldErrors ?? {}).join(',');

  devLog('wallet', 'provisioning failed', {
    code: error.code,
    ...(fields === '' ? {} : { fields }),
  });
}
