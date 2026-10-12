import { useCallback, useEffect, useRef, useState } from 'react';
import { useResolve } from '@/core/di/container-provider';
import type { ConnectFailure, ExternalWalletAccount } from '../../../domain/entity/external-wallet';

export type ConnectionProblem = ConnectFailure | 'failed' | 'expired';

export type WalletConnection =
  | { status: 'connecting' }
  | { status: 'connected'; account: ExternalWalletAccount }
  | { status: 'disconnected'; problem: ConnectionProblem };

export function useExternalWalletConnection() {
  const externalWalletPort = useResolve('externalWalletPort');
  const [connection, setConnection] = useState<WalletConnection>({ status: 'connecting' });
  const hasConnected = useRef(false);

  const connect = useCallback(async () => {
    setConnection({ status: 'connecting' });
    const result = await externalWalletPort.connect();

    if (!result.ok) {
      setConnection({ status: 'disconnected', problem: 'failed' });
    } else if (result.value.type === 'connected') {
      setConnection({ status: 'connected', account: result.value.account });
    } else {
      setConnection({ status: 'disconnected', problem: result.value.reason });
    }
  }, [externalWalletPort]);

  useEffect(() => {
    if (hasConnected.current) return;
    hasConnected.current = true;
    void connect();
  }, [connect]);

  const expire = useCallback(() => {
    setConnection({ status: 'disconnected', problem: 'expired' });
  }, []);

  return { connection, connect, expire };
}
