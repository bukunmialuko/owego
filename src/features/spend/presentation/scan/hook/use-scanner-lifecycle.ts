import {
  useCallback,
  useEffect,
  useEffectEvent,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useResolve } from '@/core/di/container-provider';
import { devLog } from '@/core/log/dev-log';
import type { ScannerHandle } from '../../../domain/port/camera-scanner-port';
import type { ScanOutcome } from '../../../domain/scan/scan-outcome';
import {
  initialScannerState,
  scannerReducer,
  type ScannerEvent,
  type ScannerState,
} from '../scanner-state';

type Options = {
  resolve: (raw: string) => ScanOutcome;
  onLeave: (outcome: ScanOutcome) => void;
};

export type ScannerLifecycle = {
  state: ScannerState;
  dispatch: Dispatch<ScannerEvent>;
  torch: boolean;
  isCameraActive: boolean;
  handleRef: { current: ScannerHandle | null };
  onCodeScanned: (raw: string) => void;
  onCameraReady: () => void;
  onCameraError: () => void;
  onToggleTorch: () => void;
  onAllowCamera: () => void;
  onContinue: () => void;
  onDismiss: () => void;
};

export function useScannerLifecycle({ resolve, onLeave }: Options): ScannerLifecycle {
  const isFocused = useIsFocused();
  const scanner = useResolve('cameraScannerPort');

  const [state, dispatch] = useReducer(scannerReducer, initialScannerState);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [isAppActive, setIsAppActive] = useState(true);
  const handleRef = useRef<ScannerHandle | null>(null);

  const leave = useEffectEvent((outcome: ScanOutcome) => {
    onLeave(outcome);
  });

  useEffect(() => {
    let isCurrent = true;

    const read = () => {
      void scanner.getPermission().then((permission) => {
        if (isCurrent) dispatch({ type: 'permissionRead', permission });
      });
    };

    read();

    const subscription = AppState.addEventListener('change', (status) => {
      const isActive = status === 'active';
      setIsAppActive(isActive);
      if (isActive) read();
    });

    return () => {
      isCurrent = false;
      subscription.remove();
    };
  }, [scanner]);

  useEffect(() => {
    if (state.kind !== 'notice') return undefined;

    const timer = setTimeout(
      () => {
        dispatch({ type: 'noticeElapsed' });
      },
      Math.max(state.until - Date.now(), 0),
    );

    return () => {
      clearTimeout(timer);
    };
  }, [state]);

  useEffect(() => {
    if (isFocused) dispatch({ type: 'refocused', now: Date.now() });
  }, [isFocused]);

  useEffect(() => {
    if (state.kind !== 'leaving' || state.outcome === undefined) return;

    leave(state.outcome);
  }, [state]);

  const onCodeScanned = useCallback(
    (raw: string) => {
      const outcome = resolve(raw);
      devLog('scan', 'classified', { kind: outcome.kind, ...reasonOf(outcome) });

      dispatch({ type: 'codeScanned', raw, outcome, now: Date.now() });
    },
    [resolve],
  );

  const isCameraActive =
    isFocused &&
    isAppActive &&
    (state.kind === 'starting' || state.kind === 'scanning' || state.kind === 'capturing');

  const torch = isTorchOn && isCameraActive;

  return {
    state,
    dispatch,
    torch,
    isCameraActive,
    handleRef,
    onCodeScanned,
    onCameraReady: () => {
      dispatch({ type: 'cameraReady' });
    },
    onCameraError: () => {
      dispatch({ type: 'cameraFailed' });
    },
    onToggleTorch: () => {
      setIsTorchOn((on) => !on);
    },
    onAllowCamera: () => {
      void scanner.requestPermission().then((permission) => {
        dispatch({ type: 'permissionRead', permission });
      });
    },
    onContinue: () => {
      dispatch({ type: 'continued', now: Date.now() });
    },
    onDismiss: () => {
      dispatch({ type: 'sheetDismissed', now: Date.now() });
    },
  };
}

function reasonOf(outcome: ScanOutcome): { reason?: string } {
  return outcome.kind === 'unsupported' ? { reason: outcome.reason } : {};
}
