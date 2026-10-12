import { useCallback } from 'react';
import { useResolve } from '@/core/di/container-provider';
import { hasSkippedKyc } from './kyc-skip';
import { useSession } from './use-session';

export function useAdmitWalletHolder(): () => Promise<void> {
  const cache = useResolve('cache');
  const tokenPersistence = useResolve('tokenPersistence');
  const { walletHolderAdmitted } = useSession();

  return useCallback(async () => {
    const keepsSession = await tokenPersistence.persists();
    walletHolderAdmitted({ hasSkippedKyc: hasSkippedKyc(cache), keepsSession });
  }, [cache, tokenPersistence, walletHolderAdmitted]);
}
